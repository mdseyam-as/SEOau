/**
 * Custom API Errors
 * Кастомные ошибки для API с кодами и HTTP статусами
 */

export class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
    this.httpStatus = details.httpStatus || 500;
  }
}

export const ERROR_CODES = {
  // Authentication errors (4xxx)
  INVALID_API_KEY: { 
    code: 4001, 
    message: 'API ключ не настроен', 
    httpStatus: 400 
  },
  INVALID_INIT_DATA: { 
    code: 4002, 
    message: 'Неверные данные авторизации Telegram', 
    httpStatus: 401 
  },
  SUBSCRIPTION_EXPIRED: { 
    code: 4003, 
    message: 'Подписка истекла', 
    httpStatus: 403 
  },
  
  // Rate limiting errors (429x)
  RATE_LIMIT_EXCEEDED: { 
    code: 4291, 
    message: 'Превышен лимит запросов', 
    httpStatus: 429 
  },
  GENERATION_LIMIT_EXCEEDED: { 
    code: 4292, 
    message: 'Превышен лимит генераций', 
    httpStatus: 429 
  },
  
  // Generation errors (5xxx)
  GENERATION_FAILED: { 
    code: 5001, 
    message: 'Не удалось сгенерировать контент', 
    httpStatus: 500 
  },
  AI_API_ERROR: { 
    code: 5002, 
    message: 'Ошибка AI API', 
    httpStatus: 500 
  },
  AI_API_TIMEOUT: { 
    code: 5003, 
    message: 'Таймаут AI API', 
    httpStatus: 504 
  },
  
  // Database errors (5xxx)
  DATABASE_ERROR: { 
    code: 5004, 
    message: 'Ошибка базы данных', 
    httpStatus: 500 
  },
  DATABASE_CONNECTION_ERROR: { 
    code: 5005, 
    message: 'Ошибка подключения к базе данных', 
    httpStatus: 503 
  }
};

/**
 * Создание API ошибки с кодом
 */
export function createApiError(errorCode, details = {}) {
  const errorInfo = ERROR_CODES[errorCode];
  if (!errorInfo) {
    return new ApiError(5000, 'Неизвестная ошибка', { httpStatus: 500, ...details });
  }
  
  return new ApiError(
    errorInfo.code,
    errorInfo.message,
    { ...details, httpStatus: errorInfo.httpStatus }
  );
}

/**
 * Проверка, является ли ошибка ApiError
 */
export function isApiError(error) {
  return error instanceof ApiError;
}
