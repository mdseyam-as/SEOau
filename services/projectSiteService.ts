import {
  MonitoringFrequency,
  ProjectSite,
  ProjectSiteImportResult
} from '../types';
import { apiService } from './apiService';

export const projectSiteService = {
  async getProjectSite(projectId: string): Promise<ProjectSite | null> {
    const { site } = await apiService.getProjectSite(projectId);
    return site;
  },

  async createProjectSite(projectId: string, data: {
    homepageUrl: string;
    name?: string;
    scanFrequency: MonitoringFrequency;
  }): Promise<ProjectSite> {
    const { site } = await apiService.createProjectSite(projectId, data);
    return site;
  },

  async updateProjectSite(siteId: string, data: {
    homepageUrl?: string;
    name?: string;
    scanFrequency?: MonitoringFrequency;
    isActive?: boolean;
  }): Promise<ProjectSite> {
    const { site } = await apiService.updateProjectSite(siteId, data);
    return site;
  },

  async deleteProjectSite(siteId: string): Promise<void> {
    await apiService.deleteProjectSite(siteId);
  },

  async scanProjectSite(siteId: string): Promise<ProjectSite> {
    const { site } = await apiService.scanProjectSite(siteId);
    return site;
  },

  async importLinks(siteId: string): Promise<{ site: ProjectSite | null; result: ProjectSiteImportResult }> {
    return apiService.importProjectSiteLinks(siteId);
  }
};
