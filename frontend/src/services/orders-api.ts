import { supabase, type DatabaseOrder } from '../lib/supabase'

interface EmailProcessingResult {
  customer_info: {
    name?: string
    email?: string
    phone?: string
    company?: string
  }
  delivery_info: {
    address?: string
    delivery_date?: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
  }
  line_items: Array<{
    description: string
    quantity?: number
    sku?: string
  }>
  confidence_score: number
}

export class OrdersAPI {
  
  /**
   * Process email and save to database
   */
  static async processAndSaveEmail(emailContent: string): Promise<DatabaseOrder> {
    // Step 1: Process email with our AI backend
    const response = await fetch('http://localhost:3001/api/orders/process-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_content: emailContent })
    })
    
    if (!response.ok) {
      throw new Error('Failed to process email')
    }
    
    const { data: result }: { data: EmailProcessingResult } = await response.json()
    
    // Step 2: Save to Supabase
    const orderData = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      raw_email: emailContent,
      customer_name: result.customer_info.name,
      customer_email: result.customer_info.email,
      customer_company: result.customer_info.company,
      delivery_address: result.delivery_info.address,
      delivery_date: result.delivery_info.delivery_date,
      urgency: result.delivery_info.urgency,
      line_items: result.line_items,
      confidence_score: result.confidence_score,
      status: result.confidence_score > 0.8 ? 'ai_parsed' : 'needs_review' as const,
      flags: result.confidence_score < 0.6 ? ['low_confidence'] : [],
      suggestions: []
    }

    const { data: savedOrder, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save order: ${error.message}`)
    }

    return savedOrder
  }

  /**
   * Get all orders with optional filtering
   */
  static async getOrders(filters?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ orders: DatabaseOrder[], total: number }> {
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data: orders, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }

    return { orders: orders || [], total: count || 0 }
  }

  /**
   * Get single order by ID
   */
  static async getOrder(id: string): Promise<DatabaseOrder | null> {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Order not found
      }
      throw new Error(`Failed to fetch order: ${error.message}`)
    }

    return order
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    id: string, 
    status: DatabaseOrder['status'],
    updates?: Partial<Pick<DatabaseOrder, 'flags' | 'suggestions'>>
  ): Promise<DatabaseOrder> {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ 
        status, 
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`)
    }

    return order
  }

  /**
   * Delete order
   */
  static async deleteOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete order: ${error.message}`)
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(): Promise<{
    total: number
    by_status: Record<string, number>
    avg_confidence: number
    recent_count: number
  }> {
    // Get all orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, confidence_score, created_at')

    if (error) {
      throw new Error(`Failed to fetch order stats: ${error.message}`)
    }

    const stats = {
      total: orders?.length || 0,
      by_status: {} as Record<string, number>,
      avg_confidence: 0,
      recent_count: 0
    }

    if (orders && orders.length > 0) {
      // Count by status
      for (const order of orders) {
        stats.by_status[order.status] = (stats.by_status[order.status] || 0) + 1
      }

      // Average confidence
      stats.avg_confidence = orders.reduce((sum, order) => sum + order.confidence_score, 0) / orders.length

      // Recent orders (last 24 hours)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      stats.recent_count = orders.filter(order => order.created_at > dayAgo).length
    }

    return stats
  }

  /**
   * Generate PDF for an order
   */
  static async generateOrderPDF(order: DatabaseOrder): Promise<Blob> {
    const response = await fetch('http://localhost:3001/api/orders/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        order_data: {
          id: order.id,
          customer_info: {
            name: order.customer_name,
            email: order.customer_email,
            company: order.customer_company
          },
          delivery_info: {
            address: order.delivery_address,
            delivery_date: order.delivery_date,
            urgency: order.urgency
          }
        },
        line_items: order.line_items.map(item => ({
          raw_description: item.description,
          extracted_sku: item.sku,
          quantity: item.quantity,
          special_notes: ''
        }))
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF')
    }
    
    return await response.blob()
  }

  /**
   * Download PDF for an order
   */
  static async downloadOrderPDF(order: DatabaseOrder): Promise<void> {
    const pdfBlob = await this.generateOrderPDF(order)
    
    // Create download link
    const url = window.URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sales-order-${order.id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
} 