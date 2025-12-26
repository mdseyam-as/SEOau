# Custom Hooks Documentation

## Обзор

Custom hooks были созданы для улучшения архитектуры фронтенда и разделения логики из [`App.tsx`](../App.tsx).

## Доступные hooks

### useAuth

Hook для управления авторизацией и пользователем.

**Файл:** [`hooks/useAuth.ts`](../hooks/useAuth.ts)

**Возвращает:**
```typescript
{
  user: User | null;
  userPlan: SubscriptionPlan | null;
  isSubscriptionActive: boolean;
  daysRemaining: number;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number | string;
  monthlyRemaining: number | string;
  handleLogin: (user: User) => void;
  handleLogout: () => void;
  loadUserPlan: () => Promise<void>;
}
```

**Пример использования:**
```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, userPlan, isSubscriptionActive, handleLogout } = useAuth();
  
  return (
    <div>
      <p>Пользователь: {user?.name}</p>
      <p>План: {userPlan?.name}</p>
      <p>Подписка активна: {isSubscriptionActive ? 'Да' : 'Нет'}</p>
      <button onClick={handleLogout}>Выйти</button>
    </div>
  );
}
```

### useProjects

Hook для управления проектами.

**Файл:** [`hooks/useProjects.ts`](../hooks/useProjects.ts)

**Возвращает:**
```typescript
{
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (project: Project) => void;
  deselectProject: () => void;
}
```

**Пример использования:**
```typescript
import { useProjects } from './hooks/useProjects';
import { useAuth } from './hooks/useAuth';

function ProjectManager() {
  const { user } = useAuth();
  const { projects, currentProject, isLoading, createProject, selectProject } = useProjects(user);
  
  const handleCreate = async () => {
    await createProject('Новый проект', 'Описание проекта');
  };
  
  if (isLoading) return <div>Загрузка...</div>;
  
  return (
    <div>
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            <button onClick={() => selectProject(project)}>
              {project.name}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={handleCreate}>Создать проект</button>
    </div>
  );
}
```

### useGeneration

Hook для управления генерацией контента.

**Файл:** [`hooks/useGeneration.ts`](../hooks/useGeneration.ts)

**Возвращает:**
```typescript
{
  keywords: KeywordRow[];
  setKeywords: (keywords: KeywordRow[]) => void;
  config: GenerationConfig;
  setConfig: (config: GenerationConfig) => void;
  result: SeoResult | null;
  setResult: (result: SeoResult | null) => void;
  isGenerating: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  handleGenerate: () => Promise<void>;
  handleFixSpam: (content: string, analysis: string, model: string) => Promise<void>;
  handleOptimizeRelevance: (missingKeywords: string[]) => Promise<void>;
  handleHumanize: (content: string, intensity: 'light' | 'medium' | 'strong', model: string) => Promise<void>;
}
```

**Пример использования:**
```typescript
import { useGeneration } from './hooks/useGeneration';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';

function GeneratorComponent() {
  const { user, userPlan } = useAuth();
  const { currentProject } = useProjects(user);
  const { keywords, config, result, isGenerating, error, handleGenerate, handleFixSpam } = useGeneration(
    user,
    userPlan,
    currentProject?.id || null,
    (type) => console.log('Haptic:', type)
  );
  
  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Генерация...' : 'Генерировать'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {result && (
        <div>
          <h3>Результат:</h3>
          <p>{result.content}</p>
          {userPlan?.canCheckSpam && (
            <button onClick={() => handleFixSpam(result.content, result.spamAnalysis, config.model)}>
              Исправить спам
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

### useStreamingGeneration

Hook для работы с потоковой генерацией контента через SSE.

**Файл:** [`hooks/useStreamingGeneration.ts`](../hooks/useStreamingGeneration.ts)

**Возвращает:**
```typescript
{
  isGenerating: boolean;
  progress: { value: number; message: string } | null;
  chunks: string[];
  error: string | null;
  result: GenerationResult | null;
  startGeneration: (options: GenerationOptions) => void;
  stopGeneration: () => void;
  reset: () => void;
}
```

**Пример использования:**
```typescript
import { useStreamingGeneration } from './hooks/useStreamingGeneration';

function StreamingGenerator() {
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
  
  const handleStart = () => {
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
      <button onClick={handleStart} disabled={isGenerating}>
        {isGenerating ? 'Генерация...' : 'Начать генерацию'}
      </button>
      
      {progress && (
        <div>
          <div className="progress-bar">
            <div style={{ width: `${progress.value}%` }} />
          </div>
          <p>{progress.message} ({progress.value}%)</p>
        </div>
      )}
      
      {chunks.map((chunk, index) => (
        <p key={index}>{chunk}</p>
      ))}
      
      {error && <div className="error">{error}</div>}
      
      {result && (
        <div>
          <h3>Генерация завершена!</h3>
          <p>Слов: {result.metadata.wordCount}</p>
          <p>Символов: {result.metadata.characterCount}</p>
        </div>
      )}
    </div>
  );
}
```

## Преимущества использования custom hooks

1. **Разделение логики** - логика вынесена из компонентов
2. **Переиспользование** - хуки можно использовать в разных компонентах
3. **Тестируемость** - хуки легче тестировать
4. **Читаемость** - код становится более понятным
5. **Оптимизация** - меньше перерендеринга благодаря useCallback и useMemo

## Интеграция с App.tsx

Для интеграции хуков в [`App.tsx`](../App.tsx):

```typescript
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useGeneration } from './hooks/useGeneration';

export default function App() {
  const toast = useToast();
  const { hapticNotification } = useTelegramWebApp();
  
  // Auth hook
  const { user, userPlan, isSubscriptionActive, daysRemaining, dailyRemaining, monthlyRemaining, handleLogin, handleLogout } = useAuth();
  
  // Projects hook
  const { projects, currentProject, isLoading: projectsLoading, createProject, deleteProject, selectProject, deselectProject } = useProjects(user);
  
  // Generation hook
  const { keywords, setKeywords, config, setConfig, result, setResult, isGenerating, error, setError, handleGenerate, handleFixSpam, handleOptimizeRelevance, handleHumanize } = useGeneration(
    user,
    userPlan,
    currentProject?.id || null,
    hapticNotification
  );
  
  // ... остальной код
}
```

## Советы по использованию

1. **Используйте useCallback для обработчиков** - для предотвращения лишних перерендеров
2. **Используйте useMemo для вычисляемых значений** - для оптимизации производительности
3. **Разделяйте хуки по ответственности** - каждый хук должен отвечать за одну область
4. **Документируйте хуки** - добавляйте JSDoc комментарии
5. **Тестируйте хуки отдельно** - используйте @testing-library/react-hooks

## Тестирование хуков

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

describe('useAuth', () => {
  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });
  
  it('should handle login', () => {
    const { result } = renderHook(() => useAuth());
    const mockUser = { id: '1', name: 'Test' };
    
    act(() => {
      result.current.handleLogin(mockUser);
    });
    
    expect(result.current.user).toEqual(mockUser);
  });
});
```
