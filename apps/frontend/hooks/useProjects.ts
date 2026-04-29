/**
 * useProjects Hook
 * Hook для управления проектами
 */

import { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../services/projectService';
import { User } from '../services/authService';

interface UseProjectsReturn {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (project: Project) => void;
  deselectProject: () => void;
}

export function useProjects(user: User | null): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const loadedProjects = await projectService.getProjects(user.telegramId);
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (name: string, description: string) => {
    if (!user) return;
    
    try {
      await projectService.createProject(user.telegramId, name, description);
      await loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectService.deleteProject(id);
      await loadProjects();
      
      // Если удаляем текущий проект, сбрасываем его
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
  };

  const deselectProject = () => {
    setCurrentProject(null);
  };

  // Загружаем проекты при изменении пользователя
  useEffect(() => {
    if (user) {
      loadProjects();
    } else {
      setProjects([]);
      setCurrentProject(null);
    }
  }, [user]);

  return {
    projects,
    currentProject,
    isLoading,
    loadProjects,
    createProject,
    deleteProject,
    selectProject,
    deselectProject,
  };
}
