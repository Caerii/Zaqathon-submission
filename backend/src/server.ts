import app from './app'
import { logger } from './utils/logger'

const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📊 Health check: http://localhost:${PORT}/health`)
  logger.info(`🔍 Product search: http://localhost:${PORT}/api/products/search?q=desk`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

export default server 