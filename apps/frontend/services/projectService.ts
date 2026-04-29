import { Project, HistoryItem, GenerationConfig, SeoResult } from '../types';
import { apiService } from './apiService';

export const projectService = {
  // --- Projects ---

  getProjects: async (userId: number): Promise<Project[]> => {
    try {
      const { projects } = await apiService.getProjects();
      return projects;
    } catch (e) {
      console.error("Error fetching projects", e);
      return [];
    }
  },

  createProject: async (userId: number, name: string, description?: string): Promise<Project> => {
    const { project } = await apiService.createProject(name, description);
    return project;
  },

  deleteProject: async (projectId: string) => {
    await apiService.deleteProject(projectId);
  },

  // --- History ---

  getHistory: async (projectId: string): Promise<HistoryItem[]> => {
    try {
      const { history } = await apiService.getHistory(projectId);
      return history;
    } catch (e) {
      console.error("Error fetching history", e);
      return [];
    }
  },

  addToHistory: async (projectId: string, config: GenerationConfig, result: SeoResult) => {
    await apiService.addToHistory(projectId, config, result);
  },

  deleteHistoryItem: async (itemId: string) => {
    await apiService.deleteHistoryItem(itemId);
  }
};

