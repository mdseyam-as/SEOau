import { MonitoredPage, MonitoringEvent, MonitoringFrequency } from '../types';
import { apiService } from './apiService';

export const monitoringService = {
  async getPages(projectId: string): Promise<MonitoredPage[]> {
    const { pages } = await apiService.getMonitoringPages(projectId);
    return pages;
  },

  async createPage(projectId: string, data: { url: string; label?: string; frequency: MonitoringFrequency }): Promise<MonitoredPage> {
    const { page } = await apiService.createMonitoringPage(projectId, data);
    return page;
  },

  async updatePage(pageId: string, data: { label?: string; frequency?: MonitoringFrequency; isActive?: boolean }): Promise<MonitoredPage> {
    const { page } = await apiService.updateMonitoringPage(pageId, data);
    return page;
  },

  async deletePage(pageId: string): Promise<void> {
    await apiService.deleteMonitoringPage(pageId);
  },

  async runCheck(pageId: string): Promise<{ page: MonitoredPage; event?: MonitoringEvent | null }> {
    return apiService.runMonitoringCheck(pageId);
  },

  async getEvents(pageId: string, limit = 20): Promise<MonitoringEvent[]> {
    const { events } = await apiService.getMonitoringEvents(pageId, limit);
    return events;
  }
};
