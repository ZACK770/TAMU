import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examService } from '../services/exam';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Key, Trophy, CheckCircle, Send, Loader2 } from 'lucide-react';

const ExamPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const [token] = useState(searchParams.get('token') || '');
  const [manualToken, setManualToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [examCompleted, setExamCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[ExamPage] useEffect running');
    
    const tokenFromStorage = localStorage.getItem('authToken');
    const userFromStorage = localStorage.getItem('user');
    
    console.log('[ExamPage] Token from localStorage:', tokenFromStorage);
    console.log('[ExamPage] User from localStorage:', userFromStorage);
    
    if (!tokenFromStorage || !userFromStorage) {
      console.log('[ExamPage] No auth in localStorage, redirecting to /auth');
      navigate('/auth');
      return;
    }

    console.log('[ExamPage] User is authenticated, proceeding');
    if (token) {
      handleVerifyToken(token);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleVerifyToken = async (examToken: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await examService.verifyToken(examToken);
      setSessionId(response.sessionId);
      await fetchNextQuestion(response.sessionId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'מזהה מבחן לא תקין');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextQuestion = async (sid: string) => {
    setLoading(true);
    try {
      const response = await examService.getNextQuestion(sid);
      
      if (response.completed) {
        await handleCompleteExam(sid);
      } else if (response.question) {
        setCurrentQuestion(response.question);
        setMessages((prev) => [
          ...prev,
          { type: 'question', content: response.question, id: Date.now() },
        ]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת שאלה');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!currentQuestion || loading) return;

    const answerText = currentQuestion.answers[answerIndex];
    setMessages((prev) => [
      ...prev,
      { type: 'answer', content: answerText, id: Date.now() },
    ]);

    setLoading(true);
    setCurrentQuestion(null);
    
    try {
      await examService.submitAnswer(sessionId, currentQuestion.id, answerIndex);
      
      // Delay for realistic chat flow feel
      setTimeout(() => {
        fetchNextQuestion(sessionId);
      }, 600);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בשליחת תשובה');
      setLoading(false);
    }
  };

  const handleCompleteExam = async (sid: string) => {
    try {
      const response = await examService.completeExam(sid);
      setScore(response.score);
      setExamCompleted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בסיום מבחן');
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken) {
      handleVerifyToken(manualToken);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleKeypadPress = (num: string) => {
    if (manualToken.length < 12) {
      setManualToken(prev => prev + num);
    }
  };

  const handleKeypadDelete = () => {
    setManualToken(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setManualToken('');
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="card max-w-md w-full animate-scale-in border border-slate-200 shadow-sm bg-white p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">כניסה למבחן</h2>
            <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 animate-fade-in">
              <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
              {error}
            </div>
          )}

          {token ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-slate-900 mx-auto animate-spin mb-4" />
              <p className="text-sm text-slate-500">טוען מבחן...</p>
            </div>
          ) : (
            <form onSubmit={handleManualTokenSubmit} className="space-y-6">
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                  מזהה מבחן
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualToken}
                    readOnly
                    placeholder="הקש מזהה מבחן"
                    className="input-field text-center text-xl tracking-[0.25em] font-mono pr-12 bg-slate-50 border-slate-200"
                    required
                  />
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>

                {/* Virtual Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-2" dir="ltr">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 font-mono text-lg py-3 rounded-xl active:bg-slate-200 transition-colors shadow-sm"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-3 rounded-xl active:bg-slate-200 transition-colors shadow-sm"
                  >
                    נקה
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 font-mono text-lg py-3 rounded-xl active:bg-slate-200 transition-colors shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadDelete}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-3 rounded-xl active:bg-slate-200 transition-colors shadow-sm"
                  >
                    מחק
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !manualToken}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    טוען...
                  </>
                ) : (
                  <>
                    התחל מבחן
                    <Key className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 text-slate-500 hover:text-slate-800 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  if (examCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="card max-w-md w-full text-center animate-scale-in border border-slate-200 shadow-sm bg-white p-8">
          <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-6 h-6 text-slate-900" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">המבחן הסתיים</h2>
          <p className="text-sm text-slate-500 mb-6">כל הכבוד על ההשלמה</p>
          
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 mb-6">
            <div className="text-5xl font-black text-slate-900 mb-1">{score}%</div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ציונך הסופי</p>
          </div>
          
          <button onClick={() => navigate('/')} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            חזרה לדף הבית
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100" dir="rtl">
      {/* Header */}
      <div className="glass border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base">ממשק מבחן</span>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-slate-400">המבחן מתחיל פה...</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex ${msg.type === 'question' ? 'justify-start' : 'justify-end'} animate-slide-up`}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.type === 'question'
                  ? 'bg-slate-900 text-slate-100 rounded-br-none border border-slate-800'
                  : 'bg-white text-slate-950 rounded-bl-none border border-slate-200 font-medium'
              }`}
            >
              {msg.type === 'question' ? (
                <>
                  <p className="mb-4 text-sm md:text-base leading-relaxed">{msg.content.text}</p>
                  <div className="space-y-2">
                    {msg.content.answers.map((answer: string, aIdx: number) => (
                      <button
                        key={aIdx}
                        onClick={() => handleAnswer(aIdx)}
                        disabled={loading}
                        className="w-full text-right bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800 hover:border-slate-700 active:scale-[0.99] text-sm"
                      >
                        {answer}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm md:text-base">{msg.content}</p>
                  <Send className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-slate-900 text-slate-100 rounded-2xl rounded-br-none px-4 py-3 shadow-sm border border-slate-800">
              <div className="flex space-x-2 items-center">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-slate-400 text-xs pr-1.5">טוען את השאלה הבאה...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="bg-slate-900 border-t border-slate-800 text-slate-200 px-4 py-3 text-xs flex items-center gap-2 animate-fade-in justify-center">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          {error}
        </div>
      )}
    </div>
  );
};

export default ExamPage;
