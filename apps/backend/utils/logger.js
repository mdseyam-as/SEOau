/**
 * Structured Logging Utility
 * Использует Pino для структурированного логирования
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProduction ? {} : {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }),
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  },
  formatters: {
    level: (label) => ({ level: label })
  }
});

export default logger;

/**
 * Создание child logger с дополнительными полями
 */
export function createLogger(fields) {
  return logger.child(fields);
}

/**
 * Создание logger для конкретного запроса
 */
export function createRequestLogger(requestId, userId = null) {
  return logger.child({ requestId, userId });
}
