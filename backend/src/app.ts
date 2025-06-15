import express from 'express'
import cors from 'cors'
import { logger } from './utils/logger'
import { ProductCatalogService } from './services/product-catalog-service'
import { EmailProcessor } from './services/gemini/email-processor'
import { PDFGenerator, convertToPDFFormat } from './services/pdf-generator'

const app = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Services
const productCatalog = new ProductCatalogService()
const emailProcessor = new EmailProcessor()
const pdfGenerator = new PDFGenerator()

// Initialize services
async function initializeServices() {
  try {
    await productCatalog.loadCatalog()
    logger.info('Services initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize services', { error })
    process.exit(1)
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      catalog: productCatalog.getStats()
    }
  })
})

app.post('/api/orders/process-email', async (req, res) => {
  try {
    const { email_content } = req.body
    
    if (!email_content) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EMAIL', message: 'Email content is required' }
      })
    }

    // Get sample of product catalog for AI context
    const allProducts = await productCatalog.getAllProducts()
    const productSample = allProducts.slice(0, 50) // Give AI a sample of 50 products

    // Process with Gemini
    const result = await emailProcessor.processEmail({
      email_content,
      context: {
        product_catalog_sample: productSample
      },
      options: { temperature: 0.1, max_tokens: 2000 }
    })

    res.json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date(),
        request_id: `req_${Date.now()}`,
        processing_time_ms: 0
      }
    })

  } catch (error) {
    logger.error('Email processing failed', { error })
    res.status(500).json({
      success: false,
      error: { 
        code: 'PROCESSING_ERROR', 
        message: 'Failed to process email',
        details: error
      }
    })
  }
})

app.get('/api/products/search', async (req, res) => {
  try {
    const { q: query, limit = '20' } = req.query as { q?: string, limit?: string }
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_QUERY', message: 'Search query is required' }
      })
    }

    const results = await productCatalog.searchProducts(query, parseInt(limit))
    
    res.json({
      success: true,
      data: results
    })

  } catch (error) {
    logger.error('Product search failed', { error })
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_ERROR', message: 'Product search failed' }
    })
  }
})

app.get('/api/products/:sku', async (req, res) => {
  try {
    const { sku } = req.params
    const product = await productCatalog.findBySKU(sku)
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${sku} not found` }
      })
    }

    res.json({
      success: true,
      data: product
    })

  } catch (error) {
    logger.error('Product lookup failed', { error })
    res.status(500).json({
      success: false,
      error: { code: 'LOOKUP_ERROR', message: 'Product lookup failed' }
    })
  }
})

app.post('/api/products/validate', async (req, res) => {
  try {
    const { sku, quantity } = req.body
    
    if (!sku || !quantity) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'SKU and quantity are required' }
      })
    }

    const validation = await productCatalog.validateOrder(sku, parseInt(quantity))
    
    res.json({
      success: true,
      data: validation
    })

  } catch (error) {
    logger.error('Product validation failed', { error })
    res.status(500).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Product validation failed' }
    })
  }
})

// PDF Generation endpoint
app.post('/api/orders/generate-pdf', async (req, res) => {
  try {
    const { order_data, line_items = [] } = req.body
    
    if (!order_data) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORDER_DATA', message: 'Order data is required' }
      })
    }

    // Get product information for pricing
    const products = await Promise.all(
      line_items.map(async (item: any) => {
        if (item.extracted_sku) {
          return await productCatalog.findBySKU(item.extracted_sku)
        }
        return null
      })
    )

    const validProducts = products.filter(Boolean)
    
    // Convert to PDF format
    const pdfData = convertToPDFFormat(order_data, line_items, validProducts)
    
    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateSalesOrderPDF(pdfData)
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="sales-order-${pdfData.order_id}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    
    res.send(pdfBuffer)

  } catch (error) {
    logger.error('PDF generation failed', { error })
    res.status(500).json({
      success: false,
      error: { 
        code: 'PDF_GENERATION_ERROR', 
        message: 'Failed to generate PDF',
        details: error
      }
    })
  }
})

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error, path: req.path })
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
  })
})

// Initialize and export
initializeServices()

export default app 