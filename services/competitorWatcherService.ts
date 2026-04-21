import {
  Competitor,
  CompetitorComparison,
  CompetitorPageChange,
  CompetitorPriority,
  CompetitorWeeklySummary,
  MonitoringFrequency
} from '../types';
import { apiService } from './apiService';

export const competitorWatcherService = {
  async getCompetitors(projectId: string): Promise<Competitor[]> {
    const { competitors } = await apiService.getCompetitors(projectId);
    return competitors;
  },

  async createCompetitor(projectId: string, data: {
    homepageUrl: string;
    name?: string;
    priority: CompetitorPriority;
    scanFrequency: MonitoringFrequency;
    notes?: string;
  }): Promise<Competitor> {
    const { competitor } = await apiService.createCompetitor(projectId, data);
    return competitor;
  },

  async updateCompetitor(competitorId: string, data: {
    homepageUrl?: string;
    name?: string;
    priority?: CompetitorPriority;
    scanFrequency?: MonitoringFrequency;
    notes?: string;
    isActive?: boolean;
  }): Promise<Competitor> {
    const { competitor } = await apiService.updateCompetitor(competitorId, data);
    return competitor;
  },

  async deleteCompetitor(competitorId: string): Promise<void> {
    await apiService.deleteCompetitor(competitorId);
  },

  async scanCompetitor(competitorId: string): Promise<{ competitor: Competitor; changes: CompetitorPageChange[]; weeklySummary: CompetitorWeeklySummary }> {
    return apiService.scanCompetitor(competitorId);
  },

  async getChanges(competitorId: string, limit = 20): Promise<CompetitorPageChange[]> {
    const { changes } = await apiService.getCompetitorChanges(competitorId, limit);
    return changes;
  },

  async getComparison(competitorId: string): Promise<CompetitorComparison[]> {
    const { comparisons } = await apiService.getCompetitorComparison(competitorId);
    return comparisons;
  },

  async getWeeklySummary(competitorId: string, days = 7): Promise<CompetitorWeeklySummary> {
    const { summary } = await apiService.getCompetitorWeeklySummary(competitorId, days);
    return summary;
  }
};
