type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && level === 'debug') {
      return false;
    }
    return true;
  }

  debug(message: string, context?: Record<string, any>) {
    if (!this.shouldLog('debug')) return;

    const logEntry = this.formatMessage('debug', message, context);
    console.log(`[DEBUG] ${logEntry.timestamp} - ${message}`, context || '');
  }

  info(message: string, context?: Record<string, any>) {
    if (!this.shouldLog('info')) return;

    const logEntry = this.formatMessage('info', message, context);
    console.log(`[INFO] ${logEntry.timestamp} - ${message}`, context || '');
  }

  warn(message: string, context?: Record<string, any>) {
    if (!this.shouldLog('warn')) return;

    const logEntry = this.formatMessage('warn', message, context);
    console.warn(`[WARN] ${logEntry.timestamp} - ${message}`, context || '');
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    if (!this.shouldLog('error')) return;

    const logEntry = this.formatMessage('error', message, {
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    console.error(`[ERROR] ${logEntry.timestamp} - ${message}`, logEntry.context);
  }
}

export const logger = new Logger();
