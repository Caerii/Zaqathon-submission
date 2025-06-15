interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: Map<string, RequestRecord[]>;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  async checkLimit(identifier: string = 'default'): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create request history for this identifier
    let requestHistory = this.requests.get(identifier) || [];
    
    // Clean old requests outside the window
    requestHistory = requestHistory.filter(req => req.timestamp > windowStart);

    // Count current requests in window
    const currentCount = requestHistory.reduce((sum, req) => sum + req.count, 0);

    if (currentCount >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    requestHistory.push({ timestamp: now, count: 1 });
    this.requests.set(identifier, requestHistory);

    return true; // Request allowed
  }

  async waitForSlot(identifier: string = 'default'): Promise<void> {
    while (!(await this.checkLimit(identifier))) {
      // Calculate time to wait until oldest request expires
      const requestHistory = this.requests.get(identifier) || [];
      if (requestHistory.length > 0) {
        const oldestRequest = requestHistory[0];
        const waitTime = Math.max(0, (oldestRequest.timestamp + this.windowMs) - Date.now());
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 1000)));
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  getRemainingRequests(identifier: string = 'default'): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requestHistory = this.requests.get(identifier) || [];
    const validRequests = requestHistory.filter(req => req.timestamp > windowStart);
    const currentCount = validRequests.reduce((sum, req) => sum + req.count, 0);
    
    return Math.max(0, this.maxRequests - currentCount);
  }

  getResetTime(identifier: string = 'default'): number {
    const requestHistory = this.requests.get(identifier) || [];
    if (requestHistory.length === 0) return 0;
    
    const oldestRequest = requestHistory[0];
    return oldestRequest.timestamp + this.windowMs;
  }

  // Clean up old request records periodically
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, history] of this.requests.entries()) {
      const validRequests = history.filter(req => req.timestamp > (now - this.windowMs));
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
} 