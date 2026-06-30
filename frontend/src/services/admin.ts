import api from './api';

export interface Question {
  id?: string;
  text: string;
  answers: string[];
  correctIdx: number;
}

export interface Exam {
  id: string;
  title: string;
  isRandom: boolean;
  questions: Question[];
}

export const adminService = {
  // Exams
  createExam: async (data: { title: string; description: string; questions: Question[] }) => {
    const response = await api.post('/admin/exams', data);
    return response.data;
  },

  getAllExams: async (): Promise<Exam[]> => {
    const response = await api.get('/admin/exams');
    return response.data;
  },

  deleteExam: async (id: string) => {
    const response = await api.delete(`/admin/exams/${id}`);
    return response.data;
  },

  // Tokens
  createToken: async (data: { examId: string; maxAttempts?: number }) => {
    const response = await api.post('/admin/tokens', data);
    return response.data;
  },
};
