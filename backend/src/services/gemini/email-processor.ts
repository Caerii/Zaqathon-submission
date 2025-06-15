import { GeminiClient } from './gemini-client'
import { PromptBuilder, type PromptContext } from './prompt-builder'
import { CacheService } from '../cache-service'
import { logger } from '../../utils/logger'

export interface EmailProcessingRequest {
  email_content: string
  context?: PromptContext
  options?: {
    temperature?: number
    max_tokens?: number
  }
}

export interface EmailProcessingResult {
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

export class EmailProcessor {
  private geminiClient: GeminiClient
  private promptBuilder: PromptBuilder
  private cache: CacheService

  constructor() {
    this.geminiClient = new GeminiClient()
    this.promptBuilder = new PromptBuilder()
    this.cache = new CacheService(300000) // 5 minute cache
  }

  async processEmail(request: EmailProcessingRequest): Promise<EmailProcessingResult> {
    const cacheKey = this.generateCacheKey(request.email_content)
    
    // Check cache first
    const cached = this.cache.get<EmailProcessingResult>(cacheKey)
    if (cached) {
      logger.info('Returning cached email processing result')
      return cached
    }

    try {
      // Build prompt
      const { systemInstruction, userPrompt } = this.promptBuilder.buildEmailProcessingPrompt(
        request.email_content,
        request.context
      )

      // Call Gemini API
      const response = await this.geminiClient.generateContent({
        prompt: userPrompt,
        systemInstruction,
        temperature: request.options?.temperature || 0.1,
        maxTokens: request.options?.max_tokens || 2000
      })

      // Parse response
      const result = this.parseResponse(response.text)
      
      // Cache result
      this.cache.set(cacheKey, result)
      
      logger.info('Email processed successfully', { 
        confidence: result.confidence_score,
        line_items: result.line_items.length 
      })
      
      return result

    } catch (error) {
      logger.error('Email processing failed', { error })
      
      // Return fallback result
      return this.createFallbackResult(request.email_content)
    }
  }

  private parseResponse(responseText: string): EmailProcessingResult {
    try {
      // Clean up response text
      const cleanResponse = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      const parsed = JSON.parse(cleanResponse)
      
      return {
        customer_info: parsed.customer_info || {},
        delivery_info: {
          address: parsed.delivery_info?.address,
          delivery_date: parsed.delivery_info?.delivery_date,
          urgency: parsed.delivery_info?.urgency || 'medium'
        },
        line_items: parsed.line_items || [],
        confidence_score: parsed.confidence_score || 0.5
      }
    } catch (error) {
      logger.error('Failed to parse Gemini response', { error })
      throw new Error('Invalid response format from AI')
    }
  }

  private createFallbackResult(emailContent: string): EmailProcessingResult {
    return {
      customer_info: {
        email: this.extractEmailWithRegex(emailContent)
      },
      delivery_info: {
        urgency: emailContent.toLowerCase().includes('urgent') ? 'high' : 'medium'
      },
      line_items: [],
      confidence_score: 0.2
    }
  }

  private extractEmailWithRegex(email: string): string | undefined {
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    const match = email.match(emailPattern)
    return match ? match[1] : undefined
  }

  private generateCacheKey(emailContent: string): string {
    // Create hash of email content for caching
    const hash = Buffer.from(emailContent).toString('base64').substr(0, 16)
    return `email_${hash}`
  }
} 