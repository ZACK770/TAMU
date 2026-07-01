import api from './api';

export interface Material {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  lessonId?: string | null;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  materials: Material[];
}

export const materialsService = {
  // Lessons
  getAllLessons: async (): Promise<Lesson[]> => {
    const response = await api.get('/api/materials/lessons');
    return response.data;
  },

  createLesson: async (data: { title: string; description?: string; videoUrl?: string; audioUrl?: string; order?: number }): Promise<Lesson> => {
    const response = await api.post('/api/materials/lessons', data);
    return response.data;
  },

  updateLesson: async (id: string, data: { title?: string; description?: string; videoUrl?: string; audioUrl?: string; order?: number }): Promise<Lesson> => {
    const response = await api.patch(`/api/materials/lessons/${id}`, data);
    return response.data;
  },

  deleteLesson: async (id: string) => {
    const response = await api.delete(`/api/materials/lessons/${id}`);
    return response.data;
  },

  // Materials
  createMaterial: async (data: { title: string; fileUrl: string; fileType: string; fileSize: number; lessonId?: string }): Promise<Material> => {
    const response = await api.post('/api/materials/materials', data);
    return response.data;
  },

  deleteMaterial: async (id: string) => {
    const response = await api.delete(`/api/materials/materials/${id}`);
    return response.data;
  },
};
