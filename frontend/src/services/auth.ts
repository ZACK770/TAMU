import api from './api';

export interface SendCodeResponse {
  message: string;
  expiresIn: number;
}

export interface VerifyCodeResponse {
  token?: string;
  user?: {
    id: string;
    phone: string;
    fullName?: string;
  };
  needsRegistration?: boolean;
  phone?: string;
}

export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    phone: string;
    fullName: string;
  };
}

export interface AdminLoginResponse {
  token: string;
  user: {
    id: string;
    phone: string;
    fullName: string;
  };
}

export const authService = {
  sendCode: async (phone: string): Promise<SendCodeResponse> => {
    const response = await api.post('/api/auth/send-code', { phone });
    return response.data;
  },

  verifyCode: async (phone: string, code: string): Promise<VerifyCodeResponse> => {
    const response = await api.post('/api/auth/verify-code', { phone, code });
    return response.data;
  },

  register: async (phone: string, fullName: string): Promise<RegisterResponse> => {
    const response = await api.post('/api/auth/register', { phone, fullName });
    return response.data;
  },

  adminLogin: async (password: string): Promise<AdminLoginResponse> => {
    const response = await api.post('/api/auth/admin-login', { password });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  saveAuth: (token: string, user: any) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  getAuth: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return {
      token,
      user: user ? JSON.parse(user) : null,
    };
  },
};
