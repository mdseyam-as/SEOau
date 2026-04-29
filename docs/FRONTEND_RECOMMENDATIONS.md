# Рекомендации по фронтенду

## Обзор

Этот документ содержит рекомендации по улучшению фронтенда приложения.

---

## Критические проблемы

### 1. Архитектура App.tsx

**Проблема:** [`App.tsx`](../App.tsx) содержит слишком много логики и состояния.

**Решение:** Разбить на custom hooks:

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // ...
}

// hooks/useProjects.ts
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  // ...
}

// hooks/useGeneration.ts
export function useGeneration() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  // ...
}
```

### 2. Отсутствие глобального состояния

**Проблема:** Состояние передаётся через props, что создаёт prop drilling.

**Решение:** Использовать Context API или Zustand:

```typescript
// stores/authStore.ts (Zustand)
import create from 'zustand';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

### 3. Отсутствие оптимизации рендеринга

**Проблема:** Компоненты перерендериваются без необходимости.

**Решение:** Использовать `React.memo`, `useMemo`, `useCallback`:

```typescript
const MemoizedComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => processData(data), [data]);
  const handleClick = useCallback(() => {
    // ...
  }, [dependency]);
  // ...
});
```

---

## Высокий приоритет

### 4. Отсутствие error boundary

**Проблема:** Нет глобального error boundary для обработки ошибок.

**Решение:** Добавить error boundary:

```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    logger.error({ error, errorInfo }, 'React error');
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 5. Отсутствие loading states

**Проблема:** Нет индикаторов загрузки для async операций.

**Решение:** Добавить skeleton loaders:

```typescript
// components/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// Использование
{loading ? (
  <div className="space-y-4">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
) : (
  <Content data={data} />
)}
```

### 6. Отсутствие оптимизации изображений

**Проблема:** Изображения не оптимизированы.

**Решение:** Использовать lazy loading и оптимизацию:

```typescript
import Image from 'next/image'; // или использовать img с loading="lazy"

<img
  src={imageUrl}
  alt={alt}
  loading="lazy"
  decoding="async"
/>
```

---

## Средний приоритет

### 7. Отсутствие TypeScript strict mode

**Проблема:** TypeScript не настроен в strict mode.

**Решение:** Обновить [`tsconfig.json`](../tsconfig.json):

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 8. Отсутствие unit tests

**Проблема:** Тесты есть только для AuthScreen и apiService.

**Решение:** Добавить тесты для всех компонентов:

```typescript
// components/ProjectList.test.tsx
import { render, screen } from '@testing-library/react';
import { ProjectList } from './ProjectList';

describe('ProjectList', () => {
  it('renders projects', () => {
    const projects = [{ id: 1, name: 'Test' }];
    render(<ProjectList projects={projects} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### 9. Отсутствие accessibility

**Проблема:** Нет ARIA labels и keyboard navigation.

**Решение:** Добавить accessibility:

```typescript
<button
  onClick={handleClick}
  aria-label="Close modal"
  onKeyDown={(e) => {
    if (e.key === 'Escape') closeModal();
  }}
>
  Close
</button>
```

---

## Низкий приоритет

### 10. Отсутствие PWA

**Проблема:** Нет Progressive Web App функциональности.

**Решение:** Добавить service worker и manifest:

```typescript
// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll(['/index.html', '/static/...']);
    })
  );
});

// public/manifest.json
{
  "name": "SEO Generator",
  "short_name": "SEO Gen",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000"
}
```

### 11. Отсутствие аналитики

**Проблема:** Нет отслеживания пользовательских действий.

**Решение:** Добавить Google Analytics или Plausible:

```typescript
// utils/analytics.ts
export function trackEvent(eventName: string, params?: object) {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// Использование
trackEvent('project_created', { projectId: 123 });
```

### 12. Отсутствие i18n

**Проблема:** Нет поддержки мультиязычности.

**Решение:** Добавить i18n:

```typescript
// i18n/ru.json
{
  "welcome": "Добро пожаловать",
  "projects": "Проекты"
}

// i18n/en.json
{
  "welcome": "Welcome",
  "projects": "Projects"
}

// hooks/useTranslation.ts
export function useTranslation() {
  const [lang, setLang] = useState('ru');
  const t = (key: string) => translations[lang][key];
  return { t, lang, setLang };
}
```

---

## Рекомендации по производительности

### 1. Code Splitting

```typescript
// Используйте React.lazy для code splitting
const ProjectList = React.lazy(() => import('./components/ProjectList'));

<Suspense fallback={<Skeleton />}>
  <ProjectList />
</Suspense>
```

### 2. Virtual Scrolling

```typescript
// Используйте react-window для длинных списков
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={1000}
  itemSize={50}
>
  {({ index, style }) => <div style={style}>Item {index}</div>}
</FixedSizeList>
```

### 3. Debouncing/Throttling

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value) => search(value),
  500
);

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

---

## Рекомендации по безопасности

### 1. CSP Headers

```typescript
// Добавить в apps/backend/server.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));
```

### 2. XSS Prevention

```typescript
// Всегда экранируйте пользовательский ввод
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput);
```

### 3. Secure Storage

```typescript
// Не храните чувствительные данные в localStorage
// Используйте sessionStorage или encrypted cookies
```

---

## Следующие шаги

1. Разбить App.tsx на custom hooks
2. Добавить глобальное состояние (Zustand)
3. Добавить error boundary
4. Добавить skeleton loaders
5. Улучшить TypeScript конфигурацию
6. Добавить unit tests
7. Добавить accessibility
8. Оптимизировать производительность
