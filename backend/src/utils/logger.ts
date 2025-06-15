interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  private level: number;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.level = LOG_LEVELS[envLevel as keyof LogLevel] ?? LOG_LEVELS.INFO;
  }

  private shouldLog(level: number): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.formatMessage('INFO', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}

export const logger = new Logger(); 