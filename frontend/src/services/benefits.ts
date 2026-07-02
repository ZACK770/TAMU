import api from './api';

export interface Benefit {
  id: string;
  title: string;
  description?: string | null;
  costPoints: number;
  category?: string | null;
  imageUrl?: string | null;
  canRedeem: boolean;
  reason?: string;
}

export interface BenefitAdmin {
  id: string;
  title: string;
  description?: string | null;
  costPoints: number;
  isActive: boolean;
  category?: string | null;
  imageUrl?: string | null;
  maxUses?: number | null;
  currentUses: number;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const benefitsService = {
  getAvailable: async (): Promise<Benefit[]> => {
    const response = await api.get('/api/benefits/available');
    return response.data;
  },

  create: async (data: {
    title: string;
    description?: string;
    costPoints: number;
    category?: string;
    imageUrl?: string;
    maxUses?: number;
    validFrom?: string;
    validUntil?: string;
  }): Promise<BenefitAdmin> => {
    const response = await api.post('/api/benefits', data);
    return response.data;
  },

  getAll: async (): Promise<BenefitAdmin[]> => {
    const response = await api.get('/api/benefits');
    return response.data;
  },

  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      costPoints?: number;
      category?: string;
      imageUrl?: string;
      maxUses?: number;
      validFrom?: string;
      validUntil?: string;
      isActive?: boolean;
    }
  ): Promise<BenefitAdmin> => {
    const response = await api.patch(`/api/benefits/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/benefits/${id}`);
  },
};
