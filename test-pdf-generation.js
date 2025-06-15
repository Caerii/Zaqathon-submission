// Sample test script to demonstrate PDF generation
// This shows how the system converts processed email data into professional sales order PDFs

const sampleOrder = {
  id: "order_20241205_abc123",
  customer_name: "John Smith",
  customer_email: "john.smith@company.com",
  customer_company: "Acme Corp",
  delivery_address: "123 Main Street, Suite 200, Anytown, CA 90210",
  delivery_date: "2024-12-15",
  urgency: "medium",
  line_items: [
    {
      description: "Executive Office Desk - White Oak Finish",
      sku: "DSK-WH-6030",
      quantity: 2
    },
    {
      description: "Ergonomic Office Chair - Black Leather",
      sku: "CHR-BK-ERG",
      quantity: 2
    },
    {
      description: "4-Drawer Filing Cabinet - Metal Gray",
      sku: "BSF-GY-4DR",
      quantity: 1
    }
  ],
  created_at: "2024-12-05T10:30:00Z",
  status: "ai_parsed",
  confidence_score: 0.92
}

// Sample API call to generate PDF
async function testPDFGeneration() {
  try {
    const response = await fetch('http://localhost:3001/api/orders/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_data: {
          id: sampleOrder.id,
          customer_info: {
            name: sampleOrder.customer_name,
            email: sampleOrder.customer_email,
            company: sampleOrder.customer_company
          },
          delivery_info: {
            address: sampleOrder.delivery_address,
            delivery_date: sampleOrder.delivery_date,
            urgency: sampleOrder.urgency
          }
        },
        line_items: sampleOrder.line_items.map(item => ({
          raw_description: item.description,
          extracted_sku: item.sku,
          quantity: item.quantity,
          special_notes: ''
        }))
      })
    })

    if (response.ok) {
      const blob = await response.blob()
      console.log('✅ PDF generated successfully!')
      console.log(`📄 PDF size: ${blob.size} bytes`)
      console.log('🎯 Expected format: Professional sales order form with:')
      console.log('   - Header: "Sales Order Form"')
      console.log('   - Customer details (Name, Delivery Date, Address)')
      console.log('   - Product table (Code, Name, Qty, Price, Total, Remarks)')
      console.log('   - Total sales order amount')
      
      // In a browser environment, this would trigger a download:
      // const url = window.URL.createObjectURL(blob)
      // const link = document.createElement('a')
      // link.href = url
      // link.download = `sales-order-${sampleOrder.id}.pdf`
      // link.click()
      
    } else {
      console.error('❌ PDF generation failed:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Expected PDF Output Structure:
/*
SALES ORDER FORM
================

Order ID: order_20241205_abc123
Generated: 12/5/2024, 10:30:00 AM

Customer Name: John Smith
Delivery Date: 2024-12-15
Address: 123 Main Street, Suite 200, Anytown, CA 90210

┌──────────────┬────────────────────────────────────────┬─────┬─────────┬─────────┬─────────────┐
│ Product Code │ Product Name                           │ Qty │ Price   │ Total   │ Remarks     │
├──────────────┼────────────────────────────────────────┼─────┼─────────┼─────────┼─────────────┤
│ DSK-WH-6030  │ Executive Office Desk - White Oak      │  2  │ $899.99 │$1799.98 │             │
│ CHR-BK-ERG   │ Ergonomic Office Chair - Black Leather │  2  │ $449.99 │ $899.98 │             │
│ BSF-GY-4DR   │ 4-Drawer Filing Cabinet - Metal Gray   │  1  │ $199.99 │ $199.99 │             │
│              │                                        │     │         │         │             │
│              │                                        │     │         │         │             │
│              │                                        │     │         │         │             │
│              │                                        │     │         │         │             │
│              │                                        │     │         │         │             │
│              │                                        │     │         │         │             │
│              │                                        │     │         │         │             │
├──────────────┴────────────────────────────────────────┴─────┴─────────┼─────────┼─────────────┤
│                                      Total Sales Order Amount:        │$2899.95 │             │
└─────────────────────────────────────────────────────────────────────────┴─────────┴─────────────┘
*/

console.log('📋 Sample Order Data Ready for PDF Generation:')
console.log(JSON.stringify(sampleOrder, null, 2))
console.log('\n🚀 To test PDF generation, start the backend server and run:')
console.log('node test-pdf-generation.js')

// Uncomment to actually test (requires backend server running):
// testPDFGeneration()

module.exports = { sampleOrder, testPDFGeneration } 