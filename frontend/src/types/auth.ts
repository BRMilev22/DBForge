export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// New phone verification types
export interface RegisterInitiateRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string; // Bulgarian format: +359XXXXXXXXX
}

export interface RegisterInitiateResponse {
  success: boolean;
  message: string;
  telegramDeepLink: string;
  botUsername: string;
  telegramLinked: boolean;
  registrationToken: string;
}

export interface SendCodeRequest {
  phoneNumber: string;
}

export interface VerifyCodeRequest {
  phoneNumber: string;
  verificationCode: string;
}
