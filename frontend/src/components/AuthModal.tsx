import { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User as UserIcon, Phone, MessageCircle, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authApi';
import type { RegisterInitiateResponse } from '../types/auth';

interface AuthModalProps {
  onClose: () => void;
}

type RegisterStep = 'form' | 'telegram' | 'verify';

export default function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { login } = useAuth();

  // Registration steps
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [initiateResponse, setInitiateResponse] = useState<RegisterInitiateResponse | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  // Polling interval ref
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '+359'
  });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for Telegram link status
  const startPollingTelegramStatus = (phoneNumber: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await authApi.checkTelegramLinked(phoneNumber);
        if (result.telegramLinked) {
          setTelegramLinked(true);
          setSuccess('Telegram linked successfully! You can now send the verification code.');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        console.error('Error checking Telegram status:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(loginForm);
      login(response.token, {
        id: response.userId,
        username: response.username,
        email: response.email,
        role: response.role
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Initiate registration
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate Bulgarian phone format
    if (!registerForm.phoneNumber.match(/^\+359\d{9}$/)) {
      setError('Please enter a valid Bulgarian phone number: +359XXXXXXXXX');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.initiateRegistration(registerForm);
      setInitiateResponse(response);
      setTelegramLinked(response.telegramLinked);
      setRegisterStep('telegram');
      
      // Start polling if not already linked
      if (!response.telegramLinked) {
        startPollingTelegramStatus(registerForm.phoneNumber);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Send verification code
  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.sendVerificationCode({ phoneNumber: registerForm.phoneNumber });
      setSuccess('Verification code sent to your Telegram!');
      setRegisterStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify and complete
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyAndComplete({
        phoneNumber: registerForm.phoneNumber,
        verificationCode
      });
      login(response.token, {
        id: response.userId,
        username: response.username,
        email: response.email,
        role: response.role
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    if (registerStep === 'verify') {
      setRegisterStep('telegram');
    } else if (registerStep === 'telegram') {
      setRegisterStep('form');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
    setError(null);
    setSuccess(null);
  };

  // Reset to login/register switch
  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    setRegisterStep('form');
    setError(null);
    setSuccess(null);
    setInitiateResponse(null);
    setTelegramLinked(false);
    setVerificationCode('');
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e11]/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 max-w-md w-full relative shadow-2xl shadow-purple-500/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header with back button for registration steps */}
        <div className="text-center mb-8">
          {!isLogin && registerStep !== 'form' && (
            <button
              onClick={handleBack}
              className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Back</span>
            </button>
          )}
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
            {isLogin ? 'Welcome Back' : (
              registerStep === 'form' ? 'Create Account' :
              registerStep === 'telegram' ? 'Link Telegram' :
              'Verify Code'
            )}
          </h2>
          <p className="text-gray-400">
            {isLogin ? 'Sign in to manage your databases' : (
              registerStep === 'form' ? 'Get started with DBForge' :
              registerStep === 'telegram' ? 'Link your Telegram to receive codes' :
              'Enter the code sent to your Telegram'
            )}
          </p>
          
          {/* Progress indicator for registration */}
          {!isLogin && (
            <div className="flex justify-center gap-2 mt-4">
              {['form', 'telegram', 'verify'].map((step, index) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    ['form', 'telegram', 'verify'].indexOf(registerStep) >= index
                      ? 'bg-purple-500'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* LOGIN FORM */}
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full bg-[#030014]/50 border border-purple-500/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-[#030014]/50 border border-purple-500/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <>
            {/* REGISTER STEP 1: Form */}
            {registerStep === 'form' && (
              <form onSubmit={handleInitiateRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      className="w-full bg-[#030014]/50 border border-purple-500/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="johndoe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="w-full bg-[#030014]/50 border border-purple-500/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      className="w-full bg-[#030014]/50 border border-purple-500/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      className="w-full bg-[#030014]/50 border border-purple-500/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number (Bulgarian)
                  </label>
                  {(() => {
                    const digits = registerForm.phoneNumber.slice(4).replace(/\D/g, '');
                    const isValid = digits.length === 9;
                    const isPartial = digits.length > 0 && digits.length < 9;
                    
                    // Format phone: +359 XX XXX XXXX
                    const formatPhone = (phone: string) => {
                      const d = phone.slice(4).replace(/\D/g, '');
                      if (d.length === 0) return '+359';
                      if (d.length <= 2) return `+359 ${d}`;
                      if (d.length <= 5) return `+359 ${d.slice(0,2)} ${d.slice(2)}`;
                      return `+359 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,9)}`;
                    };
                    
                    return (
                      <>
                        <div className="relative">
                          <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                            isValid ? 'text-green-400' : isPartial ? 'text-yellow-400' : 'text-gray-400'
                          }`} size={20} />
                          <input
                            type="tel"
                            value={formatPhone(registerForm.phoneNumber)}
                            onChange={(e) => {
                              // Extract only digits after +359
                              const rawValue = e.target.value.replace(/[\s\-\(\)]/g, '');
                              let digits = '';
                              if (rawValue.startsWith('+359')) {
                                digits = rawValue.slice(4).replace(/\D/g, '');
                              } else if (rawValue.startsWith('359')) {
                                digits = rawValue.slice(3).replace(/\D/g, '');
                              } else {
                                digits = rawValue.replace(/\D/g, '');
                              }
                              if (digits.length <= 9) {
                                setRegisterForm({ ...registerForm, phoneNumber: '+359' + digits });
                              }
                            }}
                            className={`w-full bg-[#030014]/50 border rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none transition-all ${
                              isValid 
                                ? 'border-green-500/50 focus:border-green-500' 
                                : isPartial 
                                  ? 'border-yellow-500/30 focus:border-yellow-500/50' 
                                  : 'border-purple-500/20 focus:border-purple-500/50'
                            }`}
                            placeholder="+359 88 888 8888"
                            required
                          />
                          {/* Validation icon */}
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isValid ? (
                              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="text-green-400" size={16} />
                              </div>
                            ) : isPartial ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-yellow-400 font-mono">{digits.length}/9</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              isValid ? 'bg-green-500' : isPartial ? 'bg-yellow-500' : 'bg-gray-600'
                            }`}
                            style={{ width: `${Math.min((digits.length / 9) * 100, 100)}%` }}
                          />
                        </div>
                        <p className={`text-xs mt-1 transition-colors ${
                          isValid ? 'text-green-400' : 'text-gray-500'
                        }`}>
                          {isValid ? '✓ Valid Bulgarian phone number' : 'Enter 9 digits after +359 (e.g., +359 88 888 8888)'}
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full bg-[#030014]/50 border border-purple-500/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Continue'}
                </button>
              </form>
            )}

            {/* REGISTER STEP 2: Telegram Link */}
            {registerStep === 'telegram' && initiateResponse && (
              <div className="space-y-6">
                {/* Animated Icon */}
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
                    telegramLinked 
                      ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                      : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30'
                  }`}>
                    {telegramLinked ? (
                      <CheckCircle className="text-green-400 animate-[scale_0.3s_ease-out]" size={40} />
                    ) : (
                      <MessageCircle className="text-blue-400" size={40} />
                    )}
                  </div>
                  
                  <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                    telegramLinked ? 'text-green-400' : 'text-white'
                  }`}>
                    {telegramLinked ? 'Telegram Linked!' : 'Link Your Telegram'}
                  </h3>
                  
                  <p className="text-gray-400 text-sm">
                    {telegramLinked 
                      ? 'Great! Now click below to receive your verification code.'
                      : 'Open Telegram and start the bot to link your account.'}
                  </p>
                </div>

                {/* Phone display card */}
                <div className="bg-[#030014]/50 border border-purple-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Phone className="text-purple-400" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone Number</p>
                        <p className="text-white font-mono">
                          {(() => {
                            const d = registerForm.phoneNumber.slice(4);
                            return `+359 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}`;
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${telegramLinked ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                  </div>
                </div>

                {!telegramLinked && (
                  <>
                    <a
                      href={initiateResponse.telegramDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#0088cc] to-[#00a0dc] hover:from-[#0077b5] hover:to-[#0088cc] text-white py-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <MessageCircle size={22} />
                      <span>Open @{initiateResponse.botUsername}</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    
                    <div className="flex items-center justify-center gap-3 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-gray-400 text-sm">Waiting for you to link Telegram...</span>
                    </div>
                  </>
                )}

                <button
                  onClick={handleSendCode}
                  disabled={!telegramLinked || loading}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all ${
                    telegramLinked 
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]' 
                      : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send size={20} />
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            )}

            {/* REGISTER STEP 3: Verify Code */}
            {registerStep === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <Lock className="text-purple-400" size={40} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Enter Verification Code
                  </h3>
                  <p className="text-gray-400 text-sm">
                    We sent a 6-digit code to your Telegram
                  </p>
                </div>

                {/* 6-digit code input boxes */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={verificationCode[index] || ''}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, '');
                        if (digit.length <= 1) {
                          const newCode = verificationCode.split('');
                          newCode[index] = digit;
                          setVerificationCode(newCode.join(''));
                          // Auto-focus next input
                          if (digit && index < 5) {
                            const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                            nextInput?.focus();
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle backspace to go to previous input
                        if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                          const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                          prevInput?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(pastedData);
                      }}
                      data-index={index}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-[#030014]/50 text-white focus:outline-none transition-all ${
                        verificationCode[index] 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-gray-700 focus:border-purple-500'
                      }`}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {/* Code validity indicator */}
                <div className="flex justify-center">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                    verificationCode.length === 6 
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-gray-800/50 text-gray-500'
                  }`}>
                    {verificationCode.length === 6 ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Ready to verify</span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono">{verificationCode.length}/6</span>
                        <span>digits entered</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Timer indicator */}
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Code expires in 10 minutes</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className={`w-full py-4 rounded-xl font-semibold transition-all ${
                    verificationCode.length === 6
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle size={20} />
                      Complete Registration
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full text-purple-400 hover:text-purple-300 text-sm transition-colors"
                >
                  Didn't receive the code? Resend
                </button>
              </form>
            )}
          </>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={handleSwitchMode}
            className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
