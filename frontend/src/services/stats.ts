import api from './api';

export interface ActivityItem {
  type: 'exam' | 'redemption';
  title: string;
  date: string;
  points?: number;
}

export interface MyStats {
  totalExams: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalPoints: number;
  totalRedemptions: number;
  pointsSpent: number;
  recentActivity: ActivityItem[];
}

export interface AdminStats {
  totalUsers: number;
  totalExams: number;
  totalRedemptions: number;
  totalPointsDistributed: number;
  totalPointsSpent: number;
  popularBenefits: Array<{
    benefitId: string;
    title: string;
    redemptionCount: number;
  }>;
  topUsers: Array<{
    id: string;
    fullName?: string | null;
    phone: string;
    totalPoints: number;
  }>;
}

export const statsService = {
  getMyStats: async (): Promise<MyStats> => {
    const response = await api.get('/api/stats/me');
    return response.data;
  },

  getAdminStats: async (): Promise<AdminStats> => {
    const response = await api.get('/api/stats/admin');
    return response.data;
  },
};
