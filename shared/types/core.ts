// ========================================
// CORE SYSTEM TYPES
// ========================================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  errors: SystemError[];
  last_check: Date;
  services: ServiceHealth[];
}

export interface SystemError {
  id: string;
  type: 'network' | 'validation' | 'processing' | 'business_logic' | 'user_error';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  stack?: string;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  response_time_ms: number;
  last_check: Date;
}

// ========================================
// CONFIDENCE & VALIDATION TYPES
// ========================================

export interface ConfidenceVector {
  semantic_clarity: number;      // 0-1: How clear is the intent?
  data_completeness: number;     // 0-1: How much required info is present?
  context_consistency: number;   // 0-1: Do all parts make sense together?
  domain_familiarity: number;    // 0-1: How similar to training data?
  temporal_stability: number;    // 0-1: How likely to remain valid?
  cultural_accuracy: number;     // 0-1: Cultural context correctness?
  business_viability: number;    // 0-1: Can this order actually be fulfilled?
}

export interface ValidationFlag {
  type: 'missing_data' | 'ambiguous_reference' | 'business_rule_violation' | 'data_inconsistency' | 'cultural_mismatch';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  field_path: string;
  suggested_action: string;
  auto_fixable: boolean;
}

export interface Suggestion {
  id: string;
  type: 'product_alternative' | 'quantity_adjustment' | 'delivery_modification' | 'address_correction';
  confidence: number;
  reasoning: string;
  original_value: any;
  suggested_value: any;
  business_impact: 'none' | 'low' | 'medium' | 'high';
}

// ========================================
// ORDER PROCESSING TYPES
// ========================================

export interface RawOrder {
  id: string;
  raw_email: string;
  source: 'api' | 'forward' | 'manual' | 'webhook';
  timestamp: Date;
  metadata: {
    sender_email?: string;
    subject?: string;
    headers?: Record<string, string>;
    attachments?: string[];
  };
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  confidence: ConfidenceVector;
}

export interface DeliveryInfo {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  formatted_address?: string;
  delivery_date?: Date;
  delivery_instructions?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: ConfidenceVector;
}

export interface LineItem {
  id: string;
  raw_description: string;
  extracted_sku?: string;
  extracted_product_name?: string;
  quantity?: number;
  quantity_unit?: string;
  special_notes?: string;
  confidence: ConfidenceVector;
}

export interface ProcessedOrder {
  id: string;
  raw_order: RawOrder;
  customer_info: CustomerInfo;
  delivery_info: DeliveryInfo;
  line_items: LineItem[];
  overall_confidence: number;
  processing_timestamp: Date;
  status: OrderStatus;
  flags: ValidationFlag[];
  suggestions: Suggestion[];
}

export type OrderStatus = 
  | 'received'
  | 'processing' 
  | 'ai_parsed'
  | 'validating'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'modified'
  | 'fulfilled'
  | 'error';

// ========================================
// PRODUCT CATALOG TYPES
// ========================================

export interface Product {
  product_code: string;
  product_name: string;
  price: number;
  available_in_stock: number;
  min_order_quantity: number;
  description: string;
  category: ProductCategory;
  attributes: ProductAttributes;
}

export interface ProductCategory {
  code: string;
  name: string;
  parent_category?: string;
}

export interface ProductAttributes {
  color?: string;
  material?: string;
  dimensions?: string;
  weight?: number;
  tags: string[];
}

export interface ValidatedLineItem extends LineItem {
  matched_product?: Product;
  validation_status: 'valid' | 'invalid' | 'partial' | 'alternative_suggested';
  validation_messages: string[];
  inventory_check: InventoryStatus;
  pricing_info: PricingInfo;
}

export interface InventoryStatus {
  available: boolean;
  quantity_available: number;
  quantity_requested: number;
  meets_moq: boolean;
  estimated_delivery_date?: Date;
}

export interface PricingInfo {
  unit_price: number;
  total_price: number;
  currency: string;
  discounts_applied: Discount[];
}

export interface Discount {
  type: 'bulk' | 'seasonal' | 'customer_tier' | 'promotional';
  percentage: number;
  amount: number;
  description: string;
}

// ========================================
// VALIDATION RESULT TYPES
// ========================================

export interface ValidationResult {
  order_id: string;
  timestamp: Date;
  valid_items: ValidatedLineItem[];
  invalid_items: InvalidLineItem[];
  suggestions: Suggestion[];
  flags: ValidationFlag[];
  overall_confidence: number;
  estimated_total: number;
  currency: string;
  next_actions: NextAction[];
}

export interface InvalidLineItem extends LineItem {
  validation_errors: ValidationError[];
  suggested_alternatives: Product[];
  resolution_options: ResolutionOption[];
}

export interface ValidationError {
  type: 'sku_not_found' | 'insufficient_stock' | 'moq_not_met' | 'invalid_quantity' | 'price_mismatch';
  message: string;
  severity: 'warning' | 'error' | 'critical';
  auto_fixable: boolean;
}

export interface ResolutionOption {
  type: 'substitute_product' | 'adjust_quantity' | 'split_order' | 'backorder' | 'custom_solution';
  description: string;
  confidence: number;
  business_impact: string;
  implementation_cost: 'low' | 'medium' | 'high';
}

export interface NextAction {
  type: 'review_required' | 'auto_approve' | 'escalate' | 'reject' | 'request_clarification';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  assignee?: string;
  due_date?: Date;
}

// ========================================
// UI STATE TYPES
// ========================================

export interface UIState {
  current_view: 'dashboard' | 'order_details' | 'validation_workflow' | 'settings';
  selected_order_id?: string;
  filters: OrderFilters;
  sort_by: SortOption;
  pagination: PaginationState;
  loading_states: Record<string, boolean>;
  notifications: Notification[];
}

export interface OrderFilters {
  status: OrderStatus[];
  confidence_threshold: number;
  date_range: DateRange;
  customer_search: string;
  has_flags: boolean;
  requires_review: boolean;
}

export interface SortOption {
  field: 'timestamp' | 'confidence' | 'status' | 'customer_name' | 'total_value';
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  current_page: number;
  items_per_page: number;
  total_items: number;
  total_pages: number;
}

export interface DateRange {
  start_date: Date;
  end_date: Date;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  auto_dismiss: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style: 'primary' | 'secondary' | 'destructive';
}

// ========================================
// API TYPES
// ========================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    request_id: string;
    processing_time_ms: number;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    current_page: number;
    items_per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// ========================================
// GEMINI INTEGRATION TYPES
// ========================================

export interface GeminiRequest {
  email_content: string;
  context?: {
    previous_orders?: ProcessedOrder[];
    customer_history?: CustomerInfo[];
    product_catalog_sample?: Product[];
  };
  options: {
    temperature: number;
    max_tokens: number;
    include_confidence: boolean;
    fallback_enabled: boolean;
  };
}

export interface GeminiResponse {
  parsed_order: ProcessedOrder;
  confidence_vector: ConfidenceVector;
  processing_notes: string[];
  fallback_used: boolean;
  token_usage: {
    input_tokens: number;
    output_tokens: number;
    total_cost_usd: number;
  };
}

// ========================================
// EXPORT ALL TYPES
// ========================================

export type * from './core'; 