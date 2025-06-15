import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { produce } from 'immer'
import type { 
  SystemHealth, 
  UIState, 
  ProcessedOrder, 
  ValidationResult,
  SystemError,
  Notification 
} from '@shared/types/core'

// ========================================
// SYSTEM STATE & ACTIONS
// ========================================

interface SystemState {
  orders: Map<string, ProcessedOrder>
  validation_queue: ValidationJob[]
  user_session: UserSession
  system_health: SystemHealth
  ui_state: UIState
}

interface ValidationJob {
  order_id: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: Date
  estimated_completion?: Date
}

interface UserSession {
  user_id: string
  email: string
  role: 'operator' | 'admin' | 'readonly'
  preferences: UserPreferences
  active_since: Date
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications_enabled: boolean
  auto_refresh_interval: number
  items_per_page: number
  default_confidence_threshold: number
}

type SystemAction = 
  | { type: 'ORDER_RECEIVED'; payload: ProcessedOrder }
  | { type: 'ORDER_UPDATED'; payload: { id: string; updates: Partial<ProcessedOrder> } }
  | { type: 'VALIDATION_COMPLETED'; payload: ValidationResult }
  | { type: 'VALIDATION_STARTED'; payload: { order_id: string; priority: ValidationJob['priority'] } }
  | { type: 'UI_STATE_UPDATED'; payload: Partial<UIState> }
  | { type: 'SYSTEM_ERROR'; payload: SystemError }
  | { type: 'NOTIFICATION_ADDED'; payload: Notification }
  | { type: 'NOTIFICATION_REMOVED'; payload: string }
  | { type: 'SYSTEM_HEALTH_UPDATED'; payload: SystemHealth }
  | { type: 'USER_PREFERENCES_UPDATED'; payload: Partial<UserPreferences> }

// ========================================
// INITIAL STATE
// ========================================

const initialSystemState: SystemState = {
  orders: new Map(),
  validation_queue: [],
  user_session: {
    user_id: 'demo_user',
    email: 'demo@example.com',
    role: 'operator',
    preferences: {
      theme: 'light',
      notifications_enabled: true,
      auto_refresh_interval: 30000, // 30 seconds
      items_per_page: 25,
      default_confidence_threshold: 0.7,
    },
    active_since: new Date(),
  },
  system_health: {
    status: 'healthy',
    errors: [],
    last_check: new Date(),
    services: [
      { name: 'Frontend', status: 'up', response_time_ms: 0, last_check: new Date() },
      { name: 'Backend API', status: 'up', response_time_ms: 0, last_check: new Date() },
      { name: 'Gemini API', status: 'up', response_time_ms: 0, last_check: new Date() },
      { name: 'Database', status: 'up', response_time_ms: 0, last_check: new Date() },
    ],
  },
  ui_state: {
    current_view: 'dashboard',
    selected_order_id: undefined,
    filters: {
      status: [],
      confidence_threshold: 0.7,
      date_range: {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end_date: new Date(),
      },
      customer_search: '',
      has_flags: false,
      requires_review: false,
    },
    sort_by: {
      field: 'timestamp',
      direction: 'desc',
    },
    pagination: {
      current_page: 1,
      items_per_page: 25,
      total_items: 0,
      total_pages: 0,
    },
    loading_states: {},
    notifications: [],
  },
}

// ========================================
// REDUCER
// ========================================

const systemReducer = (state: SystemState, action: SystemAction): SystemState => {
  return produce(state, draft => {
    switch (action.type) {
      case 'ORDER_RECEIVED':
        draft.orders.set(action.payload.id, action.payload)
        draft.ui_state.pagination.total_items = draft.orders.size
        draft.ui_state.pagination.total_pages = Math.ceil(
          draft.orders.size / draft.ui_state.pagination.items_per_page
        )
        break

      case 'ORDER_UPDATED':
        const existingOrder = draft.orders.get(action.payload.id)
        if (existingOrder) {
          Object.assign(existingOrder, action.payload.updates)
        }
        break

      case 'VALIDATION_STARTED':
        draft.validation_queue.push({
          order_id: action.payload.order_id,
          priority: action.payload.priority,
          created_at: new Date(),
        })
        break

      case 'VALIDATION_COMPLETED':
        const orderId = action.payload.order_id
        const order = draft.orders.get(orderId)
        if (order) {
          order.status = action.payload.overall_confidence > 0.8 ? 'approved' : 'needs_review'
          // Remove from validation queue
          draft.validation_queue = draft.validation_queue.filter(
            job => job.order_id !== orderId
          )
        }
        break

      case 'UI_STATE_UPDATED':
        Object.assign(draft.ui_state, action.payload)
        break

      case 'SYSTEM_ERROR':
        draft.system_health.errors.push(action.payload)
        draft.system_health.status = action.payload.severity === 'critical' ? 'critical' : 'degraded'
        break

      case 'NOTIFICATION_ADDED':
        draft.ui_state.notifications.push(action.payload)
        break

      case 'NOTIFICATION_REMOVED':
        draft.ui_state.notifications = draft.ui_state.notifications.filter(
          n => n.id !== action.payload
        )
        break

      case 'SYSTEM_HEALTH_UPDATED':
        draft.system_health = action.payload
        break

      case 'USER_PREFERENCES_UPDATED':
        Object.assign(draft.user_session.preferences, action.payload)
        break
    }
  })
}

// ========================================
// CONTEXT
// ========================================

interface SystemContextValue {
  state: SystemState
  dispatch: React.Dispatch<SystemAction>
  
  // Convenience methods
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  updateUIState: (updates: Partial<UIState>) => void
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void
  getOrderById: (id: string) => ProcessedOrder | undefined
  getOrdersByStatus: (status: ProcessedOrder['status']) => ProcessedOrder[]
  getPendingValidationCount: () => number
}

const SystemContext = createContext<SystemContextValue | undefined>(undefined)

// ========================================
// PROVIDER
// ========================================

interface SystemProviderProps {
  children: ReactNode
}

export const SystemProvider: React.FC<SystemProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(systemReducer, initialSystemState)

  // Auto-dismiss notifications
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const notificationsToRemove = state.ui_state.notifications
        .filter(n => n.auto_dismiss && (now - n.timestamp.getTime()) > 5000)
        .map(n => n.id)

      notificationsToRemove.forEach(id => {
        dispatch({ type: 'NOTIFICATION_REMOVED', payload: id })
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [state.ui_state.notifications])

  // System health monitoring
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      // Perform health checks
      const services = await Promise.all(
        state.system_health.services.map(async (service) => {
          const startTime = Date.now()
          let status: 'up' | 'down' | 'degraded' = 'up'
          
          try {
            // Simplified health check - in reality this would ping actual services
            if (service.name === 'Backend API') {
              // Example: await fetch('/api/health')
            }
          } catch (error) {
            status = 'down'
          }
          
          return {
            ...service,
            status,
            response_time_ms: Date.now() - startTime,
            last_check: new Date(),
          }
        })
      )

      const overallStatus = services.every(s => s.status === 'up') 
        ? 'healthy' 
        : services.some(s => s.status === 'down') 
          ? 'critical' 
          : 'degraded'

      dispatch({
        type: 'SYSTEM_HEALTH_UPDATED',
        payload: {
          status: overallStatus,
          errors: state.system_health.errors,
          last_check: new Date(),
          services,
        }
      })
    }, 30000) // Check every 30 seconds

    return () => clearInterval(healthCheckInterval)
  }, [state.system_health])

  // Convenience methods
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    dispatch({
      type: 'NOTIFICATION_ADDED',
      payload: {
        ...notification,
        id,
        timestamp: new Date(),
      }
    })
  }

  const removeNotification = (id: string) => {
    dispatch({ type: 'NOTIFICATION_REMOVED', payload: id })
  }

  const updateUIState = (updates: Partial<UIState>) => {
    dispatch({ type: 'UI_STATE_UPDATED', payload: updates })
  }

  const updateUserPreferences = (preferences: Partial<UserPreferences>) => {
    dispatch({ type: 'USER_PREFERENCES_UPDATED', payload: preferences })
  }

  const getOrderById = (id: string): ProcessedOrder | undefined => {
    return state.orders.get(id)
  }

  const getOrdersByStatus = (status: ProcessedOrder['status']): ProcessedOrder[] => {
    return Array.from(state.orders.values()).filter(order => order.status === status)
  }

  const getPendingValidationCount = (): number => {
    return state.validation_queue.length
  }

  const contextValue: SystemContextValue = {
    state,
    dispatch,
    addNotification,
    removeNotification,
    updateUIState,
    updateUserPreferences,
    getOrderById,
    getOrdersByStatus,
    getPendingValidationCount,
  }

  return (
    <SystemContext.Provider value={contextValue}>
      {children}
    </SystemContext.Provider>
  )
}

// ========================================
// HOOK
// ========================================

export const useSystem = (): SystemContextValue => {
  const context = useContext(SystemContext)
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider')
  }
  return context
}

// Additional specialized hooks
export const useOrders = () => {
  const { state } = useSystem()
  return {
    orders: Array.from(state.orders.values()),
    orderCount: state.orders.size,
    pendingCount: Array.from(state.orders.values()).filter(o => o.status === 'needs_review').length,
  }
}

export const useSystemHealth = () => {
  const { state } = useSystem()
  return state.system_health
}

export const useNotifications = () => {
  const { state, addNotification, removeNotification } = useSystem()
  return {
    notifications: state.ui_state.notifications,
    addNotification,
    removeNotification,
  }
} 