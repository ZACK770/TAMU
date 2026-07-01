import api from './api';

export interface Exam {
  id: string;
  title: string;
  isRandom: boolean;
}

export interface Question {
  id: string;
  text: string;
  answers: string[];
}

export interface VerifyTokenResponse {
  sessionId: string;
  exam: Exam;
}

export interface NextQuestionResponse {
  question?: Question;
  completed?: boolean;
}

export interface SubmitAnswerResponse {
  correct: boolean;
}

export interface CompleteExamResponse {
  score: number;
  correctCount: number;
  totalQuestions: number;
}

export const examService = {
  verifyToken: async (token: string): Promise<VerifyTokenResponse> => {
    const response = await api.post('/api/exams/verify-token', { token });
    return response.data;
  },

  getNextQuestion: async (sessionId: string): Promise<NextQuestionResponse> => {
    const response = await api.get(`/api/exams/session/${sessionId}/next-question`);
    return response.data;
  },

  submitAnswer: async (
    sessionId: string,
    questionId: string,
    answerIndex: number
  ): Promise<SubmitAnswerResponse> => {
    const response = await api.post(`/api/exams/session/${sessionId}/submit-answer`, {
      questionId,
      answerIndex,
    });
    return response.data;
  },

  completeExam: async (sessionId: string): Promise<CompleteExamResponse> => {
    const response = await api.post(`/api/exams/session/${sessionId}/complete`);
    return response.data;
  },
};
