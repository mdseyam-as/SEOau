import { Project, HistoryItem, GenerationConfig, SeoResult } from '../types';

const PROJECTS_KEY = 'seo_gen_projects';
const HISTORY_KEY = 'seo_gen_history';

// Helper for ID generation if crypto.randomUUID is not available
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const projectService = {
  // --- Projects ---

  getProjects: (userId: number): Project[] => {
    try {
      const all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
      return all
        .filter((p: Project) => p.userId === userId)
        .sort((a: Project, b: Project) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error("Error fetching projects", e);
      return [];
    }
  },

  createProject: (userId: number, name: string, description?: string): Project => {
    const all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    const newProject: Project = {
      id: generateId(),
      userId,
      name,
      description,
      createdAt: new Date().toISOString()
    };
    all.push(newProject);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
    return newProject;
  },

  deleteProject: (projectId: string) => {
    let all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    all = all.filter((p: Project) => p.id !== projectId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));

    // Cleanup history
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history = history.filter((h: HistoryItem) => h.projectId !== projectId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  },

  // --- History ---

  getHistory: (projectId: string): HistoryItem[] => {
    try {
      const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return all
        .filter((h: HistoryItem) => h.projectId === projectId)
        .sort((a: HistoryItem, b: HistoryItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.error("Error fetching history", e);
      return [];
    }
  },

  addToHistory: (projectId: string, config: GenerationConfig, result: SeoResult) => {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const item: HistoryItem = {
      id: generateId(),
      projectId,
      timestamp: new Date().toISOString(),
      topic: config.topic,
      targetUrl: config.targetUrl,
      config,
      result
    };
    all.push(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  },

  deleteHistoryItem: (itemId: string) => {
    let all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    all = all.filter((h: HistoryItem) => h.id !== itemId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  }
};
