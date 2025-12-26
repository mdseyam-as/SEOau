# Использование Streaming Generation (SSE)

## Обзор

Streaming Generation позволяет получать контент по мере его генерации, что улучшает пользовательский опыт за счёт мгновенной обратной связи.

## API Endpoints

### POST /api/streaming/generate

Потоковая генерация контента.

**Request:**
```json
{
  "topic": "SEO оптимизация для начинающих",
  "keywords": ["SEO", "оптимизация", "поисковая выдача"],
  "tone": "Professional",
  "language": "Russian",
  "model": "gemini",
  "promptType": "seo"
}
```

**Response (SSE):**
```
event: progress
data: {"value":10,"message":"Подготовка к генерации..."}

event: chunk
data: {"content":"SEO оптимизация является ключевым аспектом..."}

event: progress
data: {"value":30,"message":"Генерация контента..."}

event: complete
data: {"content":"...","metadata":{"model":"gemini","wordCount":500}}
```

### POST /api/streaming/faq

Потоковая генерация FAQ.

**Request:**
```json
{
  "topic": "SEO оптимизация",
  "keywords": ["SEO", "оптимизация"],
  "language": "Russian"
}
```

**Response (SSE):**
```
event: progress
data: {"value":40,"message":"Генерация FAQ..."}

event: complete
data: {"faqs":[{"question":"...","answer":"..."}]}
```

## Использование на фронтенде

### Hook useStreamingGeneration

```typescript
import { useStreamingGeneration } from '../hooks/useStreamingGeneration';
import { StreamingGenerationProgress } from '../components/StreamingGenerationProgress';

function GeneratorComponent() {
  const {
    isGenerating,
    progress,
    chunks,
    error,
    result,
    startGeneration,
    stopGeneration,
    reset
  } = useStreamingGeneration();
  
  const handleGenerate = () => {
    startGeneration({
      topic: 'SEO оптимизация',
      keywords: ['SEO', 'оптимизация'],
      tone: 'Professional',
      language: 'Russian',
      model: 'gemini',
      promptType: 'seo'
    });
  };
  
  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? 'Генерация...' : 'Начать генерацию'}
      </button>
      
      <StreamingGenerationProgress
        isGenerating={isGenerating}
        progress={progress}
        chunks={chunks}
        error={error}
        result={result}
      />
    </div>
  );
}
```

### Прямое использование EventSource

```typescript
function generateContent() {
  const eventSource = new EventSource('/api/streaming/generate');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'progress':
        console.log(`Progress: ${data.value}% - ${data.message}`);
        break;
      case 'chunk':
        console.log('Chunk:', data.content);
        break;
      case 'error':
        console.error('Error:', data.message);
        eventSource.close();
        break;
      case 'complete':
        console.log('Complete:', data);
        eventSource.close();
        break;
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
    eventSource.close();
  };
}
```

## События SSE

### progress
```json
{
  "value": 50,
  "message": "Генерация контента..."
}
```

### chunk
```json
{
  "content": "Часть сгенерированного контента..."
}
```

### error
```json
{
  "code": 5001,
  "message": "Ошибка генерации контента"
}
```

### complete
```json
{
  "content": "Полный сгенерированный контент...",
  "metadata": {
    "model": "gemini",
    "promptType": "seo",
    "wordCount": 500,
    "characterCount": 3000
  }
}
```

## Конфигурация

### Настройка таймаута keep-alive

```javascript
// backend/utils/sse.js
this.keepAliveInterval = setInterval(() => {
  if (this.isOpen) {
    sendSSEKeepAlive(res);
  }
}, 30000); // 30 секунд
```

### Настройка заголовков

```javascript
// backend/utils/sse.js
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no'); // Для Nginx
```

## Обработка ошибок

### На бэкенде

```javascript
try {
  await generateContentStream(req, res, options);
} catch (error) {
  logger.error({ error: error.message }, 'Generation failed');
  sse.error(5001, error.message);
}
```

### На фронтенде

```typescript
eventSource.onerror = (error) => {
  setError('Ошибка соединения');
  eventSource.close();
};
```

## Оптимизация

### Отмена генерации

```typescript
const stopGeneration = () => {
  if (eventSourceRef.current) {
    eventSourceRef.current.close();
    eventSourceRef.current = null;
  }
  setIsGenerating(false);
};
```

### Очистка при размонтировании

```typescript
useEffect(() => {
  return () => {
    stopGeneration();
  };
}, [stopGeneration]);
```

## Примеры

### Генерация с отображением прогресса

```typescript
function GeneratorWithProgress() {
  const { isGenerating, progress, startGeneration } = useStreamingGeneration();
  
  return (
    <div>
      <button onClick={() => startGeneration({ topic: '...', keywords: [...] })}>
        Генерировать
      </button>
      
      {isGenerating && progress && (
        <div>
          <div className="progress-bar">
            <div style={{ width: `${progress.value}%` }} />
          </div>
          <p>{progress.message}</p>
        </div>
      )}
    </div>
  );
}
```

### Генерация с отображением чанков

```typescript
function GeneratorWithChunks() {
  const { chunks, startGeneration } = useStreamingGeneration();
  
  return (
    <div>
      <button onClick={() => startGeneration({ topic: '...', keywords: [...] })}>
        Генерировать
      </button>
      
      <div className="chunks-container">
        {chunks.map((chunk, index) => (
          <p key={index}>{chunk}</p>
        ))}
      </div>
    </div>
  );
}
```

## Зависимости

### Backend
Нет дополнительных зависимостей - использует стандартный Express API.

### Frontend
Нет дополнительных зависимостей - использует стандартный EventSource API.

## Советы

1. **Всегда закрывайте EventSource** - для предотвращения утечек памяти
2. **Обрабатывайте ошибки** - для хорошего пользовательского опыта
3. **Показывайте прогресс** - для обратной связи с пользователем
4. **Используйте React.memo** - для оптимизации рендеринга
5. **Добавьте debounce** - для предотвращения лишних запросов
