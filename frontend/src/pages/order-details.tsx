import { useParams } from 'react-router-dom'

export function OrderDetails() {
  const { orderId } = useParams()

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-soft border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Order Details
        </h1>
        <p className="text-gray-600">
          Order ID: {orderId}
        </p>
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">
            🚧 Order details view coming soon...
          </p>
        </div>
      </div>
    </div>
  )
} 