import api from './api';

export interface RedemptionBenefit {
  id: string;
  title: string;
  description?: string | null;
  costPoints: number;
}

export interface Redemption {
  id: string;
  benefit: RedemptionBenefit;
  pointsUsed: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  redeemedAt: string;
  processedAt?: string;
  notes?: string;
}

export interface RedemptionAdmin {
  id: string;
  user: {
    id: string;
    phone: string;
    fullName?: string | null;
  };
  benefit: {
    id: string;
    title: string;
    costPoints: number;
  };
  pointsUsed: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  redeemedAt: string;
  processedAt?: string;
  notes?: string;
}

export const redemptionsService = {
  redeem: async (benefitId: string): Promise<{ redemptionId: string; status: string; message: string }> => {
    const response = await api.post(`/api/redemptions/benefits/${benefitId}/redeem`);
    return response.data;
  },

  getMyRedemptions: async (): Promise<Redemption[]> => {
    const response = await api.get('/api/redemptions/my-redemptions');
    return response.data;
  },

  getAllRedemptions: async (params?: {
    status?: string;
    userId?: string;
    benefitId?: string;
  }): Promise<RedemptionAdmin[]> => {
    const response = await api.get('/api/redemptions', { params });
    return response.data;
  },

  processRedemption: async (
    redemptionId: string,
    data: { status: 'approved' | 'rejected'; notes?: string }
  ): Promise<{ message: string }> => {
    const response = await api.patch(`/api/redemptions/${redemptionId}`, data);
    return response.data;
  },
};
