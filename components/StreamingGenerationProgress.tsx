/**
 * StreamingGenerationProgress Component
 * Компонент для отображения прогресса потоковой генерации
 */

import React from 'react';

interface GenerationProgress {
  value: number;
  message: string;
}

interface StreamingGenerationProgressProps {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  chunks: string[];
  error: string | null;
  result: any;
}

export function StreamingGenerationProgress({
  isGenerating,
  progress,
  chunks,
  error,
  result
}: StreamingGenerationProgressProps) {
  if (!isGenerating && !error && !result) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isGenerating ? 'Генерация контента...' : 'Генерация завершена'}
        </h3>
        {isGenerating && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        )}
      </div>
      
      {/* Прогресс бар */}
      {isGenerating && progress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{progress.message}</span>
            <span>{progress.value}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.value}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Чанки контента */}
      {chunks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Сгенерированный контент:
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {chunks.map((chunk, index) => (
              <p key={index} className="text-gray-800 mb-2">
                {chunk}
              </p>
            ))}
          </div>
        </div>
      )}
      
      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}
      
      {/* Результат */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <svg
              className="w-5 h-5 text-green-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-green-800 font-medium">Генерация успешно завершена!</span>
          </div>
          <div className="text-sm text-gray-600">
            <p>Модель: {result.metadata.model}</p>
            <p>Слов: {result.metadata.wordCount}</p>
            <p>Символов: {result.metadata.characterCount}</p>
          </div>
        </div>
      )}
    </div>
  );
}
