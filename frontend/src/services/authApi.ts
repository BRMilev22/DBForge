import axios from 'axios';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  RegisterInitiateRequest,
  RegisterInitiateResponse,
  SendCodeRequest,
  VerifyCodeRequest
} from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    return response.data;
  },

  // Legacy register (will fail - requires phone verification now)
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, data);
    return response.data;
  },

  // Step 1: Initiate registration with phone number
  initiateRegistration: async (data: RegisterInitiateRequest): Promise<RegisterInitiateResponse> => {
    const response = await axios.post(`${API_BASE_URL}/auth/register/initiate`, data);
    return response.data;
  },

  // Step 2: Send verification code via Telegram
  sendVerificationCode: async (data: SendCodeRequest): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/auth/register/send-code`, data);
    return response.data;
  },

  // Step 3: Verify code and complete registration
  verifyAndComplete: async (data: VerifyCodeRequest): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/auth/register/verify`, data);
    return response.data;
  },

  // Check if phone is linked to Telegram
  checkTelegramLinked: async (phoneNumber: string): Promise<{ telegramLinked: boolean }> => {
    const response = await axios.get(`${API_BASE_URL}/auth/register/check-telegram`, {
      params: { phoneNumber }
    });
    return response.data;
  },

  getCurrentUser: async (token: string) => {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};
