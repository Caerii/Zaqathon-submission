import type { Product } from '../../../../shared/types/core'

export interface PromptContext {
  product_catalog_sample?: Product[]
  customer_history?: any[]
}

export class PromptBuilder {
  
  buildEmailProcessingPrompt(emailContent: string, context?: PromptContext): {
    systemInstruction: string
    userPrompt: string
  } {
    const systemInstruction = `
You are an expert email order processor for a furniture company. Extract structured order information from customer emails.

CRITICAL INSTRUCTIONS:
1. Extract customer information, product details, quantities, and delivery requirements
2. Handle various email formats: forwards, replies, informal messages
3. Identify product SKUs and quantities even with typos
4. Extract and standardize addresses
5. Provide confidence scores for each field (0.0 to 1.0)

${context?.product_catalog_sample ? 
  `PRODUCT CATALOG (Match items to these SKUs):
${context.product_catalog_sample.slice(0, 30).map(p => 
  `- ${p.product_code}: ${p.product_name} ($${p.price}) - ${p.description}`
).join('\n')}

IMPORTANT: When matching products:
1. Look for exact SKU codes in the email (e.g., "DSK-0001")
2. Match product names to descriptions (e.g., "office desk" → "DSK-0001")
3. Use fuzzy matching for similar terms (e.g., "chair" → "CHR-xxxx")
4. If uncertain, prefer the closest match with lower confidence
5. Set sku to null only if no reasonable match exists` : 
  'No product catalog provided - cannot match SKUs'
}

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "customer_info": {
    "name": "string or null",
    "email": "string or null", 
    "phone": "string or null",
    "company": "string or null"
  },
  "delivery_info": {
    "address": "string or null",
    "delivery_date": "string or null",
    "urgency": "low|medium|high|critical"
  },
  "line_items": [
    {
      "description": "string",
      "quantity": "number or null",
      "sku": "string or null"
    }
  ],
  "confidence_score": 0.8
}
`

    const userPrompt = `
Extract order information from this email:

---
${emailContent}
---

Return only the JSON response as specified in the system instructions.
`

    return { systemInstruction, userPrompt }
  }
} 