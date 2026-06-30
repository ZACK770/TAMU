import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examService } from '../services/exam';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Key, Trophy, CheckCircle, Send, Loader2 } from 'lucide-react';

const ExamPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const [token, setToken] = useState(searchParams.get('token') || '');
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
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (token) {
      handleVerifyToken(token);
    }
  }, [isAuthenticated]);

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
      setError(err.response?.data?.error || 'טוקן לא תקין');
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
      
      // Small delay for chat-like feel
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

  const handleManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyToken(manualToken);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full animate-scale-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold gradient-text">כניסה למבחן</h2>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 animate-fade-in">
              <span className="text-lg">⚠️</span>
              {error}
            </div>
          )}

          {token ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin mb-4" />
              <p className="text-gray-600">טוען מבחן...</p>
            </div>
          ) : (
            <form onSubmit={handleManualToken} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  מזהה מבחן
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="הכנס מזהה מבחן"
                    className="input-field text-center text-2xl tracking-[0.3em] font-mono pr-12"
                    required
                  />
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    טוען...
                  </>
                ) : (
                  <>
                    התחל מבחן
                    <Key className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  if (examCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center animate-scale-in">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce-slow">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">המבחן הסתיים!</h2>
          <p className="text-gray-600 mb-6">כל הכבוד על ההשלמה</p>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-6">
            <div className="text-6xl font-bold gradient-text mb-2">{score}%</div>
            <p className="text-gray-600">ציונך הסופי</p>
          </div>
          
          <button onClick={() => navigate('/')} className="btn-primary w-full flex items-center justify-center gap-2">
            חזרה לדף הבית
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="glass border-b border-gray-700 px-4 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">מבחן</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-all duration-200">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-400">המבחן מתחיל...</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex ${msg.type === 'question' ? 'justify-start' : 'justify-end'} animate-slide-up`}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3 sm:py-4 shadow-lg ${
                msg.type === 'question'
                  ? 'bg-gray-800 text-white rounded-br-none border border-gray-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-bl-none shadow-xl'
              }`}
            >
              {msg.type === 'question' ? (
                <>
                  <p className="mb-4 text-base sm:text-lg leading-relaxed">{msg.content.text}</p>
                  <div className="space-y-2 sm:space-y-3">
                    {msg.content.answers.map((answer: string, aIdx: number) => (
                      <button
                        key={aIdx}
                        onClick={() => handleAnswer(aIdx)}
                        disabled={loading}
                        className="w-full text-right bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-95 border border-gray-600 hover:border-gray-500"
                      >
                        {answer}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base sm:text-lg">{msg.content}</p>
                  <Send className="w-4 h-4 opacity-70 flex-shrink-0" />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-gray-800 text-white rounded-2xl rounded-br-none px-5 py-4 shadow-lg border border-gray-700">
              <div className="flex space-x-2 items-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-gray-400 text-sm">טוען שאלה הבאה...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="bg-red-900/90 backdrop-blur-sm border border-red-700 text-red-200 px-4 py-3 text-sm flex items-center gap-2 animate-fade-in">
          <span className="text-lg">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

export default ExamPage;
