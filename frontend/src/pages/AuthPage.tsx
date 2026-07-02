import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { Phone, Shield, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
        
        login(response.token, response.user);
        
        console.log('[AuthPage] Navigating to /exam in 100ms');
        setTimeout(() => {
          navigate('/exam');
        }, 100);
      } else {
        setError('תגובה לא צפויה מהשרת');
      }
    } catch (err: any) {
      console.error('[AuthPage] Verification error:', err);
      setError(err.response?.data?.error || 'קוד שגוי או פג תוקף');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card max-w-md w-full animate-scale-in border border-slate-200 shadow-sm bg-white p-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          חזרה לדף הבית
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
            {step === 'phone' ? (
              <Phone className="w-5 h-5 text-slate-900" />
            ) : (
              <Shield className="w-5 h-5 text-slate-900" />
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {step === 'phone' ? 'התחברות' : 'אימות קוד'}
          </h2>
          <p className="text-sm text-slate-500">
            {step === 'phone' 
              ? 'הכנס מספר טלפון לקבלת קוד אימות'
              : 'הכנס את קוד האימות שקיבלת'
            }
          </p>
        </div>

        {error && (
          <div className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                מספר טלפון
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0500000000"
                  className="input-field text-left pr-12 focus:ring-slate-900 border-slate-200"
                  dir="ltr"
                  required
                />
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  שלח קוד אימות
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                קוד אימות
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="הזן קוד"
                  className="input-field text-center text-xl tracking-[0.25em] font-mono pr-12 focus:ring-slate-900 border-slate-200"
                  maxLength={6}
                  required
                />
                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  מאמת...
                </>
              ) : (
                <>
                  אמת קוד
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
            {countdown > 0 ? (
              <p className="text-center text-xs text-slate-500">
                ניתן לשלוח קוד חדש בעוד {countdown} שניות
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
                className="w-full text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors py-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
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