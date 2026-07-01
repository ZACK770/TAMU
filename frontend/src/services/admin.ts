import api from './api';

export interface Question {
  id?: string;
  text: string;
  answers: string[];
  correctIdx: number;
}

export interface ExamToken {
  id: string;
  tokenCode: string;
  isUsed: boolean;
  usedById?: string | null;
  usedAt?: string | null;
}

export interface Exam {
  id: string;
  title: string;
  isRandom: boolean;
  questions: Question[];
  tokens?: ExamToken[];
}

export const adminService = {
  // Exams
  createExam: async (data: { title: string; description: string; questions: Question[] }) => {
    const response = await api.post('/api/admin/exams', data);
    return response.data;
  },

  getAllExams: async (): Promise<Exam[]> => {
    const response = await api.get('/api/admin/exams');
    return response.data;
  },

  updateExam: async (id: string, data: { isRandom?: boolean }): Promise<Exam> => {
    const response = await api.patch(`/api/admin/exams/${id}`, data);
    return response.data;
  },

  deleteExam: async (id: string) => {
    const response = await api.delete(`/api/admin/exams/${id}`);
    return response.data;
  },

  addQuestion: async (examId: string, data: { text: string; answers: string[]; correctIdx: number }): Promise<Question> => {
    const response = await api.post(`/api/admin/exams/${examId}/questions`, data);
    return response.data;
  },

  deleteQuestion: async (questionId: string) => {
    const response = await api.delete(`/api/admin/questions/${questionId}`);
    return response.data;
  },

  // Tokens
  createToken: async (data: { examId: string }): Promise<ExamToken> => {
    const response = await api.post('/api/admin/tokens', data);
    return response.data;
  },
};
