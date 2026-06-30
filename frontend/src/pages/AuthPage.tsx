import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { Phone, Shield, ArrowRight, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.sendCode(phone);
      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בשליחת הקוד');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('[AuthPage] Starting code verification', { phone, code });

    try {
      const response = await authService.verifyCode(phone, code);
      
      console.log('[AuthPage] Verification response:', response);
      
      if (response.needsRegistration) {
        console.log('[AuthPage] User needs registration, navigating to /register');
        navigate('/register', { state: { phone } });
      } else if (response.token && response.user) {
        console.log('[AuthPage] User authenticated, calling login()');
        console.log('[AuthPage] Token:', response.token);
        console.log('[AuthPage] User:', response.user);
        
        login(response.token, response.user);
        
        console.log('[AuthPage] After login(), checking localStorage');
        const storedAuth = authService.getAuth();
        console.log('[AuthPage] Stored auth:', storedAuth);
        
        console.log('[AuthPage] Navigating to /exam in 100ms');
        setTimeout(() => {
          console.log('[AuthPage] Executing navigation to /exam');
          navigate('/exam');
        }, 100);
      } else {
        console.log('[AuthPage] Unexpected response structure:', response);
        setError('תגובה לא צפויה מהשרת');
      }
    } catch (err: any) {
      console.error('[AuthPage] Verification error:', err);
      setError(err.response?.data?.error || 'קוד שגוי או פג תוקף');
    } finally {
      setLoading(false);
      console.log('[AuthPage] Verification process completed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full animate-scale-in">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          חזרה לדף הבית
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            {step === 'phone' ? (
              <Phone className="w-8 h-8 text-white" />
            ) : (
              <Shield className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'phone' ? 'התחברות' : 'אימות קוד'}
          </h2>
          <p className="text-gray-600">
            {step === 'phone' 
              ? 'הכנס מספר טלפון לקבלת קוד אימות'
              : 'הכנס את הקוד שנשלח לטלפון שלך'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 animate-fade-in">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מספר טלפון
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0500000000"
                  className="input-field text-left pr-12"
                  dir="ltr"
                  required
                />
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  שלח קוד אימות
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קוד אימות
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="הכנס קוד 6 ספרות"
                  className="input-field text-center text-3xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  required
                />
                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  מאמת...
                </>
              ) : (
                <>
                  אמת קוד
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
            {countdown > 0 ? (
              <p className="text-center text-sm text-gray-500 animate-pulse">
                שלח קוד חדש בעוד {countdown} שניות
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
                className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                שלח קוד חדש
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
