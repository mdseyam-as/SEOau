/**
 * useStreamingGeneration Hook
 * Hook для работы с потоковой генерацией контента через SSE
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface GenerationOptions {
  topic: string;
  keywords: string[];
  tone?: string;
  language?: string;
  model?: string;
  promptType?: string;
  useKnowledgeBase?: boolean;
  ragTopK?: number;
}

interface GenerationProgress {
  value: number;
  message: string;
}

interface GenerationResult {
  content: string;
  metadata: {
    model: string;
    promptType: string;
    wordCount: number;
    characterCount: number;
    rag?: {
      used: boolean;
      sourceCount: number;
      embeddingModel?: string;
    };
  };
  knowledgeBaseSources?: Array<{
    chunkId: string;
    chunkIndex: number;
    file: { id: string; fileName: string; fileType?: string };
    similarity: number;
    matchType: string;
    snippet: string;
  }>;
}

interface UseStreamingGenerationReturn {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  chunks: string[];
  error: string | null;
  result: GenerationResult | null;
  startGeneration: (options: GenerationOptions) => void;
  stopGeneration: () => void;
  reset: () => void;
}

export function useStreamingGeneration(): UseStreamingGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const stopGeneration = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsGenerating(false);
  }, []);
  
  const startGeneration = useCallback((options: GenerationOptions) => {
    // Сброс состояния
    setError(null);
    setProgress(null);
    setChunks([]);
    setResult(null);
    setIsGenerating(true);
    
    // Создание EventSource для SSE
    const url = new URL('/api/streaming/generate', window.location.origin);
    
    // Отправка данных через POST (EventSource не поддерживает POST)
    // Используем fetch для POST, а EventSource для получения событий
    fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to start generation');
      }
      
      // Создание EventSource для получения событий
      const sseUrl = new URL('/api/streaming/generate', window.location.origin);
      const eventSource = new EventSource(sseUrl.toString());
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'progress':
            setProgress(data);
            break;
          case 'chunk':
            setChunks(prev => [...prev, data.content]);
            break;
          case 'error':
            setError(data.message);
            stopGeneration();
            break;
          case 'complete':
            setResult(data);
            stopGeneration();
            break;
        }
      };
      
      eventSource.onerror = (error) => {
        setError('Connection error');
        stopGeneration();
      };
    }).catch(err => {
      setError(err.message);
      setIsGenerating(false);
    });
  }, [stopGeneration]);
  
  const reset = useCallback(() => {
    setError(null);
    setProgress(null);
    setChunks([]);
    setResult(null);
    setIsGenerating(false);
  }, []);
  
  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, [stopGeneration]);
  
  return {
    isGenerating,
    progress,
    chunks,
    error,
    result,
    startGeneration,
    stopGeneration,
    reset,
  };
}
