import { useState } from 'react'
import { OrdersAPI } from '../services/orders-api'
import type { DatabaseOrder } from '../lib/supabase'

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

export function EmailProcessor() {
  const [emailContent, setEmailContent] = useState('')
  const [result, setResult] = useState<EmailProcessingResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOrder, setSavedOrder] = useState<DatabaseOrder | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)
    setResult(null)
    setSavedOrder(null)

    try {
      // Process email and save to database
      const order = await OrdersAPI.processAndSaveEmail(emailContent)
      setSavedOrder(order)
      
      // Also set the result for display
      setResult({
        customer_info: {
          name: order.customer_name || undefined,
          email: order.customer_email || undefined,
          company: order.customer_company || undefined,
        },
        delivery_info: {
          address: order.delivery_address || undefined,
          delivery_date: order.delivery_date || undefined,
          urgency: order.urgency
        },
        line_items: order.line_items || [],
        confidence_score: order.confidence_score
      })
      
    } catch (err) {
      console.error('Processing failed:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while processing the email')
    } finally {
      setIsProcessing(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return { backgroundColor: '#fee2e2', color: '#dc2626' }
      case 'high': return { backgroundColor: '#fed7aa', color: '#ea580c' }
      case 'medium': return { backgroundColor: '#fef3c7', color: '#d97706' }
      default: return { backgroundColor: '#dcfce7', color: '#166534' }
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return '#059669'
    if (score >= 0.6) return '#d97706'
    return '#dc2626'
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className="card">
        <h1>Smart Order Intake - Email Processor</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Paste Customer Email
            </label>
            <textarea
              id="email"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Paste the customer email here..."
              className="form-textarea"
              disabled={isProcessing}
            />
          </div>
          
          <button
            type="submit"
            disabled={!emailContent.trim() || isProcessing}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
          >
            {isProcessing ? (
              <>
                <div className="spinner"></div>
                Processing...
              </>
            ) : (
              'Process Email'
            )}
          </button>
        </form>
      </div>

      {/* Success Message */}
      {savedOrder && (
        <div className="alert alert-success">
          <div className="flex-between">
            <div className="flex" style={{ alignItems: 'center' }}>
              <div style={{ marginRight: '12px', fontSize: '18px' }}>✅</div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Order Successfully Processed & Saved
                </h3>
                <p style={{ fontSize: '14px' }}>
                  Order ID: <span style={{ fontFamily: 'monospace' }}>{savedOrder.id}</span> • 
                  Status: <span style={{ textTransform: 'capitalize' }}>{savedOrder.status.replace('_', ' ')}</span>
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await OrdersAPI.downloadOrderPDF(savedOrder)
                } catch (error) {
                  console.error('Failed to download PDF:', error)
                }
              }}
              className="btn btn-primary"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card">
          <div className="flex-between mb-6">
            <h2>Processing Results</h2>
            <div className="flex" style={{ alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Confidence Score:</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: getConfidenceColor(result.confidence_score) }}>
                {(result.confidence_score * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 mb-6">
            {/* Customer Info */}
            <div>
              <h3>Customer Information</h3>
              <div style={{ 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px', 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {result.customer_info.name && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Name:</span>
                    <span style={{ marginLeft: '8px', color: '#1f2937' }}>{result.customer_info.name}</span>
                  </div>
                )}
                {result.customer_info.email && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Email:</span>
                    <span style={{ marginLeft: '8px', color: '#1f2937' }}>{result.customer_info.email}</span>
                  </div>
                )}
                {result.customer_info.company && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Company:</span>
                    <span style={{ marginLeft: '8px', color: '#1f2937' }}>{result.customer_info.company}</span>
                  </div>
                )}
                {!result.customer_info.name && 
                 !result.customer_info.email && 
                 !result.customer_info.company && (
                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No customer information extracted</p>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div>
              <h3>Delivery Information</h3>
              <div style={{ 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px', 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {result.delivery_info.address && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Address:</span>
                    <span style={{ marginLeft: '8px', color: '#1f2937' }}>{result.delivery_info.address}</span>
                  </div>
                )}
                {result.delivery_info.delivery_date && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Delivery Date:</span>
                    <span style={{ marginLeft: '8px', color: '#1f2937' }}>{result.delivery_info.delivery_date}</span>
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Urgency:</span>
                  <span 
                    style={{
                      marginLeft: '8px',
                      padding: '4px 8px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      ...getUrgencyColor(result.delivery_info.urgency)
                    }}
                  >
                    {result.delivery_info.urgency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="mb-4">Order Items</h3>
            {result.line_items.length > 0 ? (
              <div style={{ 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px', 
                overflow: 'hidden' 
              }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.line_items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.description}</td>
                        <td>
                          {item.sku ? (
                            <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                              {item.sku}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not identified</span>
                          )}
                        </td>
                        <td>{item.quantity || 'Not specified'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px', 
                padding: '32px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No order items extracted</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-error">
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Processing Error</h3>
            <p style={{ fontSize: '14px' }}>{error}</p>
          </div>
        </div>
      )}
    </div>
  )
} 