import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { User, ArrowLeft, RefreshCw, CheckCircle2, Phone } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phone = location.state?.phone || '';
  const returnTo = location.state?.returnTo || '/exam';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.register(phone, fullName);
      login(response.token, response.user);
      navigate(returnTo);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="card max-w-md w-full animate-scale-in border border-slate-200 shadow-sm bg-white p-8">
        <button
          onClick={() => navigate('/auth', { state: { returnTo } })}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          חזרה לאימות
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <User className="w-5 h-5 text-slate-900" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">הרשמה</h2>
          <p className="text-sm text-slate-500">
            השלם את הפרטים כדי להמשיך
          </p>
        </div>

        {error && (
          <div className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              מספר טלפון
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                disabled
                className="input-field bg-slate-100/50 text-slate-500 text-left pr-12 cursor-not-allowed border-slate-200"
                dir="ltr"
              />
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              שם מלא
            </label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="הכנס שם מלא"
                className="input-field pr-12 focus:ring-slate-900 border-slate-200"
                required
              />
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
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
                נרשם...
              </>
            ) : (
              <>
                הרשם
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;