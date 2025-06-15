import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for better TypeScript support
export interface DatabaseOrder {
  id: string
  raw_email: string
  customer_name?: string
  customer_email?: string
  customer_company?: string
  delivery_address?: string
  delivery_date?: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  line_items: any[]
  confidence_score: number
  status: 'received' | 'processing' | 'ai_parsed' | 'validating' | 'needs_review' | 'approved' | 'rejected'
  flags: any[]
  suggestions: any[]
  created_at: string
  updated_at: string
}

export interface DatabaseProduct {
  product_code: string
  product_name: string
  price: number
  available_in_stock: number
  min_order_quantity: number
  description: string
  category_code: string
  category_name: string
  created_at: string
  updated_at: string
} 