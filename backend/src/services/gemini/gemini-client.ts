import { GoogleGenAI } from '@google/genai'
import { logger } from '../../utils/logger'
import { RateLimiter } from '../../utils/rate-limiter'

export interface GeminiApiRequest {
  prompt: string
  systemInstruction?: string
  temperature?: number
  maxTokens?: number
}

export interface GeminiApiResponse {
  text: string
  tokens_used: number
}

export class GeminiClient {
  private client: GoogleGenAI
  private rateLimiter: RateLimiter

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }

    this.client = new GoogleGenAI({ apiKey })
    this.rateLimiter = new RateLimiter(100, 60000) // 100 requests per minute
  }

  async generateContent(request: GeminiApiRequest): Promise<GeminiApiResponse> {
    // Check rate limit
    await this.rateLimiter.waitForSlot()

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: request.prompt }]
          }
        ],
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature || 0.1,
          maxOutputTokens: request.maxTokens || 2000,
          topP: 0.8,
          topK: 40
        }
      })

      if (!response.text) {
        throw new Error('Empty response from Gemini API')
      }

      return {
        text: response.text,
        tokens_used: this.estimateTokens(request.prompt + (response.text || ''))
      }

    } catch (error: any) {
      logger.error('Gemini API call failed', { error: error.message })
      throw error
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }
} 