import api from './api';

export interface Student {
  id: string;
  phone: string;
  fullName: string | null;
  totalPoints: number;
  availablePoints: number;
  isActive: boolean;
  adminNotes: string | null;
  blockedAt: string | null;
  blockedBy: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    examSessions: number;
    redemptions: number;
  };
}

export interface StudentListResponse {
  students: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentDetail extends Student {
  examSessions: Array<{
    id: string;
    score: number | null;
    earnedPoints: number;
    isCompleted: boolean;
    startedAt: string;
    completedAt: string | null;
    exam: {
      id: string;
      title: string;
    };
  }>;
  redemptions: Array<{
    id: string;
    pointsUsed: number;
    status: string;
    redeemedAt: string;
    processedAt: string | null;
    notes: string | null;
    benefit: {
      id: string;
      title: string;
    };
  }>;
  pointHistory: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string | null;
    description: string | null;
    createdAt: string;
    createdBy: string | null;
  }>;
}

export const studentsService = {
  getAllStudents: async (params?: {
    search?: string;
    status?: 'active' | 'blocked';
    minPoints?: number;
    maxPoints?: number;
    page?: number;
    limit?: number;
  }): Promise<StudentListResponse> => {
    const response = await api.get('/api/admin/students', { params });
    return response.data;
  },

  getStudentById: async (id: string): Promise<StudentDetail> => {
    const response = await api.get(`/api/admin/students/${id}`);
    return response.data;
  },

  updateStudent: async (id: string, data: {
    fullName?: string;
    phone?: string;
    adminNotes?: string;
  }): Promise<Student> => {
    const response = await api.patch(`/api/admin/students/${id}`, data);
    return response.data;
  },

  blockStudent: async (id: string): Promise<Student> => {
    const response = await api.post(`/api/admin/students/${id}/block`);
    return response.data;
  },

  unblockStudent: async (id: string): Promise<Student> => {
    const response = await api.post(`/api/admin/students/${id}/unblock`);
    return response.data;
  },

  adjustStudentPoints: async (id: string, data: {
    type: 'manual_add' | 'manual_subtract';
    amount: number;
    reason: string;
    description?: string;
  }): Promise<Student> => {
    const response = await api.post(`/api/admin/students/${id}/points`, data);
    return response.data;
  },

  deleteStudent: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/students/${id}`);
  },
};
