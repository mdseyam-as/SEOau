/**
 * Server-Sent Events (SSE) Utility
 * Для потоковой передачи данных клиенту
 */

/**
 * Отправка SSE события
 */
export function sendSSEEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Отправка SSE комментария
 */
export function sendSSEComment(res, comment) {
  res.write(`: ${comment}\n\n`);
}

/**
 * Отправка SSE с keep-alive
 */
export function sendSSEKeepAlive(res) {
  res.write(`: keep-alive\n\n`);
}

/**
 * Настройка SSE response
 */
export function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Для Nginx
  res.flushHeaders();
}

/**
 * SSE класс для управления соединением
 */
export class SSEConnection {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.isOpen = true;
    this.keepAliveInterval = null;
    
    // Настройка response
    setupSSE(res);
    
    // Обработка закрытия соединения клиентом
    req.on('close', () => {
      this.close();
    });
    
    // Запуск keep-alive (каждые 30 секунд)
    this.keepAliveInterval = setInterval(() => {
      if (this.isOpen) {
        sendSSEKeepAlive(res);
      }
    }, 30000);
  }
  
  /**
   * Отправка события
   */
  send(event, data) {
    if (!this.isOpen) return;
    sendSSEEvent(this.res, event, data);
  }
  
  /**
   * Отправка комментария
   */
  comment(text) {
    if (!this.isOpen) return;
    sendSSEComment(this.res, text);
  }
  
  /**
   * Отправка прогресса
   */
  progress(value, message) {
    this.send('progress', { value, message });
  }
  
  /**
   * Отправка чанка данных
   */
  chunk(data) {
    this.send('chunk', data);
  }
  
  /**
   * Отправка ошибки
   */
  error(code, message) {
    this.send('error', { code, message });
  }
  
  /**
   * Отправка завершения
   */
  complete(result) {
    this.send('complete', result);
    this.close();
  }
  
  /**
   * Закрытие соединения
   */
  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    try {
      this.res.end();
    } catch (error) {
      // Игнорируем ошибки при закрытии
    }
  }
}
