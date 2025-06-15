import puppeteer, { Browser, Page } from 'puppeteer'
import path from 'path'
import fs from 'fs/promises'
import { logger } from '../utils/logger'
import type { Product } from '../../../shared/types/core'

export interface OrderItem {
  product_code: string
  product_name: string
  quantity: number
  price: number
  total: number
  remarks?: string
}

export interface SalesOrderData {
  order_id: string
  customer_name: string
  customer_email?: string
  delivery_date?: string
  address: string
  items: OrderItem[]
  total_amount: number
  created_date: string
}

export class PDFGenerator {
  private browser: Browser | null = null

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  }

  async generateSalesOrderPDF(orderData: SalesOrderData): Promise<Buffer> {
    await this.initialize()

    const page = await this.browser!.newPage()
    
    try {
      const html = this.generateSalesOrderHTML(orderData)
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      })

      await page.close()
      logger.info(`Generated PDF for order ${orderData.order_id}`)
      
      return Buffer.from(pdf)

    } catch (error) {
      await page.close()
      logger.error('PDF generation failed', { error })
      throw error
    }
  }

  private generateSalesOrderHTML(orderData: SalesOrderData): string {
    const itemsHTML = orderData.items.map(item => `
      <tr>
        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${item.product_code}</td>
        <td style="border: 1px solid #333; padding: 8px;">${item.product_name}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right;">$${item.total.toFixed(2)}</td>
        <td style="border: 1px solid #333; padding: 8px;">${item.remarks || ''}</td>
      </tr>
    `).join('')

    // Add empty rows to match the form layout (minimum 10 rows)
    const emptyRowsCount = Math.max(0, 10 - orderData.items.length)
    const emptyRowsHTML = Array(emptyRowsCount).fill(0).map(() => `
      <tr>
        <td style="border: 1px solid #333; padding: 8px; height: 35px;">&nbsp;</td>
        <td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>
        <td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>
        <td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>
        <td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>
        <td style="border: 1px solid #333; padding: 8px;">&nbsp;</td>
      </tr>
    `).join('')

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sales Order Form - ${orderData.order_id}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            
            .header {
                text-align: center;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 40px;
                text-decoration: underline;
            }
            
            .customer-info {
                margin-bottom: 30px;
            }
            
            .customer-info div {
                margin-bottom: 15px;
                font-size: 16px;
            }
            
            .customer-info strong {
                display: inline-block;
                width: 140px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            
            th {
                border: 1px solid #333;
                padding: 10px 8px;
                background-color: #f5f5f5;
                font-weight: bold;
                text-align: center;
            }
            
            .total-row {
                font-weight: bold;
                font-size: 16px;
            }
            
            .total-row td {
                border: 1px solid #333;
                padding: 12px 8px;
                background-color: #f9f9f9;
            }

            .order-info {
                margin-bottom: 20px;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">Sales Order Form</div>
        
        <div class="order-info">
            <div><strong>Order ID:</strong> ${orderData.order_id}</div>
            <div><strong>Generated:</strong> ${orderData.created_date}</div>
        </div>
        
        <div class="customer-info">
            <div><strong>Customer Name:</strong> ${orderData.customer_name}</div>
            <div><strong>Delivery Date:</strong> ${orderData.delivery_date || 'Not specified'}</div>
            <div><strong>Address:</strong> ${orderData.address}</div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 12%;">Product Code</th>
                    <th style="width: 30%;">Product Name</th>
                    <th style="width: 8%;">Qty</th>
                    <th style="width: 12%;">Price</th>
                    <th style="width: 12%;">Total</th>
                    <th style="width: 26%;">Remarks</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
                ${emptyRowsHTML}
                <tr class="total-row">
                    <td colspan="4" style="text-align: right;">Total Sales Order Amount:</td>
                    <td style="text-align: right;">$${orderData.total_amount.toFixed(2)}</td>
                    <td>&nbsp;</td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>
    `
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Helper function to convert processed order to PDF data format
export function convertToPDFFormat(
  processedOrder: any,
  validatedItems: any[] = [],
  products: Product[] = []
): SalesOrderData {
  const items: OrderItem[] = validatedItems.map(item => {
    const product = products.find(p => p.product_code === item.extracted_sku)
    return {
      product_code: item.extracted_sku || 'N/A',
      product_name: product?.product_name || item.raw_description,
      quantity: item.quantity || 1,
      price: product?.price || 0,
      total: (product?.price || 0) * (item.quantity || 1),
      remarks: item.special_notes || ''
    }
  })

  const total_amount = items.reduce((sum, item) => sum + item.total, 0)

  return {
    order_id: processedOrder.id || `ORD-${Date.now()}`,
    customer_name: processedOrder.customer_info?.name || 'Unknown Customer',
    customer_email: processedOrder.customer_info?.email,
    delivery_date: processedOrder.delivery_info?.delivery_date,
    address: processedOrder.delivery_info?.formatted_address || 
             processedOrder.delivery_info?.address || 'Address not provided',
    items,
    total_amount,
    created_date: new Date().toLocaleString()
  }
} 