import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { OrdersAPI } from '../services/orders-api'

export function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    by_status: {} as Record<string, number>,
    avg_confidence: 0,
    recent_count: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const orderStats = await OrdersAPI.getOrderStats()
        setStats(orderStats)
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadStats()
  }, [])

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className="card">
        <h1>Welcome to Smart Order Intake</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          AI-powered email order processing for furniture companies
        </p>
        
        <div className="grid grid-cols-2" style={{ marginBottom: '24px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
            borderRadius: '12px', 
            padding: '24px' 
          }}>
            <h2 style={{ color: '#1e3a8a', marginBottom: '8px' }}>
              📧 Process Email Orders
            </h2>
            <p style={{ color: '#1d4ed8', marginBottom: '16px' }}>
              Extract structured order data from customer emails using AI
            </p>
            <Link
              to="/process"
              className="btn btn-primary"
            >
              Start Processing
            </Link>
          </div>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
            borderRadius: '12px', 
            padding: '24px' 
          }}>
            <h2 style={{ color: '#14532d', marginBottom: '8px' }}>
              📊 Order Statistics
            </h2>
            {isLoading ? (
              <div style={{ color: '#15803d' }}>Loading stats...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ color: '#15803d' }}>
                  Total Orders: <span style={{ fontWeight: 'bold' }}>{stats.total}</span>
                </p>
                <p style={{ color: '#15803d' }}>
                  Recent (24h): <span style={{ fontWeight: 'bold' }}>{stats.recent_count}</span>
                </p>
                <p style={{ color: '#15803d' }}>
                  Avg Confidence: <span style={{ fontWeight: 'bold' }}>{(stats.avg_confidence * 100).toFixed(1)}%</span>
                </p>
                {stats.by_status.needs_review > 0 && (
                  <p style={{ color: '#ea580c' }}>
                    ⚠️ {stats.by_status.needs_review} orders need review
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>System Features</h2>
        <div className="grid grid-cols-3">
          <div className="feature-box">
            <h3>AI Processing</h3>
            <p>Gemini 2.5 powered email analysis and data extraction</p>
          </div>
          <div className="feature-box">
            <h3>Product Validation</h3>
            <p>Real-time SKU validation against 500+ product catalog</p>
          </div>
          <div className="feature-box">
            <h3>Confidence Scoring</h3>
            <p>Multi-dimensional confidence assessment for quality control</p>
          </div>
        </div>
      </div>
    </div>
  )
} 