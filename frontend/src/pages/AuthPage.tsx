import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { Phone, Shield, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const returnTo = location.state?.returnTo || '/exam';
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [useVoiceCall, setUseVoiceCall] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus code input when step changes to code
  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '');
    setCode(value);

    // Auto-submit when code is complete (4 digits for voice, 6 for SMS)
    const expectedLength = useVoiceCall ? 4 : 6;
    if (value.length === expectedLength) {
      // Use setTimeout to avoid React DOM issues
      setTimeout(() => {
        if (code.length === expectedLength) {
          handleVerifyCode({ preventDefault: () => {} } as any);
        }
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Only allow digits, max 4 for voice, 6 for SMS
    const expectedLength = useVoiceCall ? 4 : 6;
    const cleanedValue = pastedText.replace(/\D/g, '').slice(0, expectedLength);
    setCode(cleanedValue);

    // Auto-submit if complete
    if (cleanedValue.length === expectedLength) {
      setTimeout(() => {
        if (code.length === expectedLength) {
          handleVerifyCode({ preventDefault: () => {} } as any);
        }
      }, 0);
    }
  };

  const handleSendCode = async (e: React.FormEvent, forceVoiceCall?: boolean) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const shouldUseVoiceCall = forceVoiceCall !== undefined ? forceVoiceCall : useVoiceCall;
      if (shouldUseVoiceCall) {
        await authService.sendCodeVoice(phone);
      } else {
        await authService.sendCode(phone);
      }
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
    if (loading) return; // Prevent multiple submissions
    setLoading(true);
    setError('');

    console.log('[AuthPage] Starting code verification', { phone, code });

    try {
      const response = await authService.verifyCode(phone, code);

      console.log('[AuthPage] Verification response:', response);

      if (response.needsRegistration) {
        console.log('[AuthPage] User needs registration, navigating to /register');
        navigate('/register', { state: { phone, returnTo } });
      } else if (response.token && response.user) {
        console.log('[AuthPage] User authenticated, calling login()');

        login(response.token, response.user);

        console.log('[AuthPage] Navigating to returnTo in 100ms');
        setTimeout(() => {
          navigate(returnTo);
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
              ? useVoiceCall
                ? 'הכנס מספר טלפון לקבלת קוד בשיחה'
                : 'הכנס מספר טלפון לקבלת קוד אימות'
              : useVoiceCall
                ? 'הכנס את 4 הספרות האחרונות של המספר שמתקשר אליך'
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
                  {useVoiceCall ? 'מחייג...' : 'שולח...'}
                </>
              ) : (
                <>
                  {useVoiceCall ? 'קבל קוד בשיחה טלפונית' : 'שלח קוד אימות'}
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
            {!useVoiceCall ? (
              <button
                type="button"
                onClick={async () => {
                  setUseVoiceCall(true);
                  await handleSendCode({ preventDefault: () => {} } as any, true);
                }}
                disabled={loading}
                className="w-full text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors py-2"
              >
                <Phone className="w-3.5 h-3.5" />
                לקבלת קוד בשיחה טלפונית - לחץ כאן
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setUseVoiceCall(false);
                  await handleSendCode({ preventDefault: () => {} } as any, false);
                }}
                disabled={loading}
                className="w-full text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors py-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                לשליחה ב-SMS במקום
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                {useVoiceCall ? '4 ספרות אחרונות' : 'קוד אימות'}
              </label>
              <div className="relative">
                <input
                  ref={codeInputRef}
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  onPaste={handlePaste}
                  placeholder={useVoiceCall ? 'XXXX' : 'הזן קוד'}
                  className="input-field text-center text-xl tracking-[0.25em] font-mono pr-12 focus:ring-slate-900 border-slate-200"
                  maxLength={useVoiceCall ? 4 : 6}
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
              <>
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
                {!useVoiceCall ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUseVoiceCall(true);
                      setStep('phone');
                      setCode('');
                    }}
                    className="w-full text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors py-2"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    לקבלת אימות בשיחה טלפונית
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setUseVoiceCall(false);
                      setStep('phone');
                      setCode('');
                    }}
                    className="w-full text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors py-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    לשליחה ב-SMS במקום
                  </button>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;