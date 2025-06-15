import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'

import { Layout } from './components/layout'
import { LoadingSpinner } from './components/ui/loading-spinner'
import { Dashboard } from './pages/dashboard'
import { OrderDetails } from './pages/order-details'
import { Settings } from './pages/settings'
import { EmailProcessor } from './pages/email-processor'

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders/:orderId" element={<OrderDetails />} />
          <Route path="/process" element={<EmailProcessor />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App 