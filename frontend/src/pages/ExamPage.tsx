import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examService } from '../services/exam';
import { benefitsService } from '../services/benefits';
import { redemptionsService } from '../services/redemptions';
import { statsService } from '../services/stats';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Key, Send, Loader2, CheckCheck, User, MoreVertical, Paperclip, Smile, HelpCircle, Info, Star, Gift } from 'lucide-react';

// WhatsApp colors
const WA_BG = 'bg-[#efe7de]';
const WA_HEADER = 'bg-[#075e54]';
const WA_SENT = 'bg-[#dcf8c6]';
const WA_RECEIVED = 'bg-white';
const WA_TEXT = 'text-[#111b21]';
const WA_TIME = 'text-[#667781] text-[11px]';
const WA_BLUE_CHECK = 'text-[#53bdeb]';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  useEffect(() => {
    console.log('[ExamPage] useEffect running');
    
    const tokenFromStorage = localStorage.getItem('authToken');
    const userFromStorage = localStorage.getItem('user');
    
    console.log('[ExamPage] Token from localStorage:', tokenFromStorage);
    console.log('[ExamPage] User from localStorage:', userFromStorage);
    
    if (!tokenFromStorage || !userFromStorage) {
      console.log('[ExamPage] No auth in localStorage, redirecting to /auth');
      navigate('/auth', { state: { returnTo: token ? `/exam?token=${encodeURIComponent(token)}` : '/exam' } });
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
    // Don't set typing here if it's already set in handleAnswer, but ensure it's on
    setTyping(true);
    try {
      const response = await examService.getNextQuestion(sid);
      
      if (response.completed) {
        await handleCompleteExam(sid);
      } else if (response.question) {
        // Dynamic delay based on text length for a more natural feel
        const textLength = response.question.text.length;
        const delay = Math.min(Math.max(textLength * 10, 400), 1200);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        setCurrentQuestion(response.question);
        setMessages((prev) => [
          ...prev,
          { 
            type: 'question', 
            content: response.question, 
            id: Date.now(),
            time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
          },
        ]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת שאלה');
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!currentQuestion || loading) return;

    const answerText = currentQuestion.answers[answerIndex];
    
    // Handle special case for "חזרה לדף הביץ" after exam completion
    if (examCompleted && answerText === 'חזרה לדף הביץ') {
      navigate('/');
      return;
    }
    
    // Handle help/about menu responses
    if (answerText === 'הבנתי, תודה') {
      setMessages((prev) => [
        ...prev,
        { 
          type: 'answer', 
          content: answerText, 
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        },
      ]);
      return;
    }

    // Handle action menu responses
    if (answerText === 'חזרה למבחן') {
      setMessages((prev) => [
        ...prev,
        { 
          type: 'answer', 
          content: answerText, 
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        },
      ]);
      return;
    }

    if (answerText === 'רוצה לממש') {
      handleActionMenuClick('redeem');
      setMessages((prev) => [
        ...prev,
        { 
          type: 'answer', 
          content: answerText, 
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        },
      ]);
      return;
    }

    // Handle benefit redemption
    if (answerText.includes(' - ') && (answerText.includes('נקודות') || answerText.includes('לא זמין'))) {
      handleBenefitRedeem(answerText);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { 
        type: 'answer', 
        content: answerText, 
        id: Date.now(),
        time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
      },
    ]);

    setLoading(true);
    setCurrentQuestion(null);
    
    try {
      await examService.submitAnswer(sessionId, currentQuestion.id, answerIndex);
      
      // Immediately start showing typing state for the next question
      setTyping(true);
      
      // Small delay for natural feel, but faster than before
      setTimeout(() => {
        fetchNextQuestion(sessionId);
      }, 200);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בשליחת תשובה');
      setLoading(false);
    }
  };

  const handleCompleteExam = async (sid: string) => {
    try {
      const response = await examService.completeExam(sid);
      
      // Add score message to chat instead of showing separate page
      const encouragingMessages = [
        'כל הכבוד! עבדת נהדר! 🎉',
        'מדהים! הצלחת להגיע להישג מרשים! ⭐',
        'יופי! זה הראה הרבה מאמץ והבנה! 🌟',
        'כל הכבוד על ההשלמה! אתה בדרך הנכונה! 🚀',
        'מרשים! המשך כך! 💪'
      ];
      const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
      
      setMessages((prev) => [
        ...prev,
        {
          type: 'question',
          content: {
            text: `${randomMessage}\n\nציונך הסופי: ${response.score}%\n\nעכשיו אתה יכול לממש את ההטבות שצברת באזור האישי!`,
            answers: ['חזרה לדף הביץ']
          },
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        }
      ]);
      
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

  const handleMenuClick = (option: 'help' | 'about') => {
    setMenuOpen(false);
    
    if (option === 'help') {
      setMessages((prev) => [
        ...prev,
        {
          type: 'question',
          content: {
            text: '📝 **עזרה - מדריך למבחן**\n\n• ניתן לבצע את המבחן רק פעם אחת\n• אם יוצאים מהממשק, לא ניתן יהיה להיכנס שוב\n• בכל שלב יש לבחור את התשובה המתאימה מהאפשרויות\n• המבחן מורכב משאלות על חומר הלימוד\n• בסיום המבחן תקבל/י ציון ותוכל/י לממש הטבות',
            answers: ['הבנתי, תודה']
          },
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        }
      ]);
    } else if (option === 'about') {
      setMessages((prev) => [
        ...prev,
        {
          type: 'question',
          content: {
            text: '🌟 **אודות טעמו וראו**\n\nאנחנו ארגון גג למודעות יהודית, שמטרתו לקרב ולהטעים את האור והיופי שבחסידות לעם.\n\nעם סיום המבחן, תוכל לממש הטבות שונות שצברת באזור האישי!\n\nבהצלחה! 🚀',
            answers: ['הבנתי, תודה']
          },
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        }
      ]);
    }
  };

  const handleActionMenuClick = async (action: 'score' | 'redeem') => {
    setActionMenuOpen(false);
    
    if (action === 'score') {
      setLoading(true);
      try {
        const stats = await statsService.getMyStats();
        const availablePoints = stats.totalPoints - stats.pointsSpent;
        
        setMessages((prev) => [
          ...prev,
          {
            type: 'question',
            content: {
              text: `📊 **הניקוד שלך**\n\n• נקודות שצברת: ${stats.totalPoints}\n• נקודות שממשת: ${stats.pointsSpent}\n• נקודות זמינות: ${availablePoints}\n• מספר מבחנים: ${stats.totalExams}\n• ציון ממוצע: ${stats.averageScore}%`,
              answers: ['חזרה למבחן', 'רוצה לממש']
            },
            id: Date.now(),
            time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
          }
        ]);
      } catch (err: any) {
        setError('שגיאה בטעינת הניקוד');
      } finally {
        setLoading(false);
      }
    } else if (action === 'redeem') {
      setLoading(true);
      try {
        const benefits = await benefitsService.getAvailable();
        const stats = await statsService.getMyStats();
        const availablePoints = stats.totalPoints - stats.pointsSpent;
        
        if (benefits.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              type: 'question',
              content: {
                text: `🎁 **הטבות זמינות**\n\nכרגע אין הטבות זמינות למימוש.\n\nנקודות זמינות: ${availablePoints}`,
                answers: ['חזרה למבחן']
              },
              id: Date.now(),
              time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
            }
          ]);
        } else {
          const benefitAnswers = benefits.slice(0, 5).map(b => {
            const status = b.canRedeem ? `${b.costPoints} נקודות` : b.reason || 'לא זמין';
            return `${b.title} - ${status}`;
          });
          benefitAnswers.push('חזרה למבחן');
          
          setMessages((prev) => [
            ...prev,
            {
              type: 'question',
              content: {
                text: `🎁 **הטבות זמינות**\n\nנקודות זמינות: ${availablePoints}\n\nבחר הטבה למימוש:`,
                answers: benefitAnswers
              },
              id: Date.now(),
              time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
            }
          ]);
        }
      } catch (err: any) {
        setError('שגיאה בטעינת ההטבות');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBenefitRedeem = async (answerText: string) => {
    if (answerText === 'חזרה למבחן') {
      setMessages((prev) => [
        ...prev,
        {
          type: 'answer',
          content: answerText,
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        }
      ]);
      return;
    }

    // Extract benefit title from answer (format: "Title - X points")
    const benefitTitle = answerText.split(' - ')[0];
    
    setLoading(true);
    try {
      const benefits = await benefitsService.getAvailable();
      const benefit = benefits.find(b => b.title === benefitTitle);
      
      if (!benefit) {
        setError('הטבה לא נמצאה');
        setLoading(false);
        return;
      }

      if (!benefit.canRedeem) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'answer',
            content: answerText,
            id: Date.now(),
            time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
          },
          {
            type: 'question',
            content: {
              text: `❌ ${benefit.reason || 'לא ניתן לממש הטבה זו'}`,
              answers: ['חזרה למבחן']
            },
            id: Date.now(),
            time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
          }
        ]);
        setLoading(false);
        return;
      }

      const result = await redemptionsService.redeem(benefit.id);
      
      setMessages((prev) => [
        ...prev,
        {
          type: 'answer',
          content: answerText,
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        },
        {
          type: 'question',
          content: {
            text: `✅ ${result.message}\n\nהבקשה נשלחה לאישור מנהל.`,
            answers: ['חזרה למבחן']
          },
          id: Date.now(),
          time: new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date())
        }
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה במימוש ההטבה');
    } finally {
      setLoading(false);
    }
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


  return (
    <div className={`min-h-screen ${WA_BG} flex flex-col font-sans h-screen overflow-hidden`} dir="rtl">
      {/* WhatsApp Header */}
      <div className={`${WA_HEADER} text-white px-4 py-3 flex justify-between items-center shadow-md z-50`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-white/20">
            <User className="w-6 h-6 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight">עוזר המבחן של טעמו וראו</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${typing ? 'bg-white animate-pulse' : 'bg-[#00e676]'}`} />
              <span className="text-[12px] opacity-90 leading-tight">
                {typing ? 'מקליד/ה...' : 'מחובר'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 opacity-90 relative">
          <div className="relative">
            <MoreVertical 
              className="w-5 h-5 cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors" 
              onClick={() => setMenuOpen(!menuOpen)}
            />
            {menuOpen && (
              <div className="absolute top-8 left-0 bg-white rounded-lg shadow-xl py-2 min-w-[150px] z-50 animate-scale-in">
                <button
                  onClick={() => handleMenuClick('help')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-right"
                >
                  <HelpCircle className="w-4 h-4" />
                  עזרה
                </button>
                <button
                  onClick={() => handleMenuClick('about')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-right"
                >
                  <Info className="w-4 h-4" />
                  אודות
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button 
              className="hover:bg-white/10 p-2 rounded-full transition-colors flex items-center gap-2"
              onClick={() => setActionMenuOpen(!actionMenuOpen)}
            >
              <Gift className="w-5 h-5" />
            </button>
            {actionMenuOpen && (
              <div className="absolute top-8 left-0 bg-white rounded-lg shadow-xl py-2 min-w-[180px] z-50 animate-scale-in">
                <button
                  onClick={() => handleActionMenuClick('score')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-right"
                >
                  <Star className="w-4 h-4" />
                  כמה ניקוד יש לי?
                </button>
                <button
                  onClick={() => handleActionMenuClick('redeem')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-right"
                >
                  <Gift className="w-4 h-4" />
                  רוצה לממש
                </button>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative"
        style={{
          backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
          backgroundBlendMode: 'overlay',
          backgroundColor: '#efe7de'
        }}
      >
        {/* Encryption notice */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#fff9c2] text-[#54656f] text-[12.5px] px-3 py-1.5 rounded-lg shadow-sm text-center max-w-[90%] border border-[#e1d9b0]">
            הודעות אלו מוצפנות מקצה לקצה. אף אחד מחוץ לצ'אט הזה, אפילו לא TAMU, לא יכול לקרוא או להאזין להן. לחץ למידע נוסף.
          </div>
        </div>

        {/* Date bubble */}
        <div className="flex justify-center mb-4">
          <div className="bg-white/80 backdrop-blur-sm text-[#54656f] text-[12px] px-3 py-1 rounded-md shadow-sm uppercase font-medium">
            היום
          </div>
        </div>

        {Array.isArray(messages) && messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex ${msg.type === 'question' ? 'justify-start' : 'justify-end'} animate-scale-in origin-top`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative ${
                msg.type === 'question'
                  ? `${WA_RECEIVED} ${WA_TEXT} rounded-tr-none ml-4`
                  : `${WA_SENT} ${WA_TEXT} rounded-tl-none mr-4`
              }`}
            >
              {/* WhatsApp Bubble Tail */}
              <div 
                className={`absolute top-0 w-3 h-4 ${
                  msg.type === 'question' 
                    ? `-right-2 bg-white clip-path-left-tail` 
                    : `-left-2 bg-[#dcf8c6] clip-path-right-tail`
                }`}
                style={{
                  clipPath: msg.type === 'question' 
                    ? 'polygon(0 0, 100% 0, 0 100%)' 
                    : 'polygon(0 0, 100% 0, 100% 100%)'
                }}
              />

              {msg.type === 'question' ? (
                <div className="flex flex-col">
                  <p className="text-[14.5px] md:text-base leading-relaxed mb-2 whitespace-pre-wrap">{msg.content.text}</p>
                  
                  {/* Answers container - styled like selection chips or stacked buttons */}
                  <div className="space-y-2 mt-2">
                    {Array.isArray(msg.content.answers) && msg.content.answers.map((answer: string, aIdx: number) => (
                      <button
                        key={aIdx}
                        onClick={() => handleAnswer(aIdx)}
                        disabled={loading}
                        className="w-full text-right bg-white/50 hover:bg-white text-[#00a884] font-medium px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-100 hover:border-[#00a884]/30 active:scale-[0.98] text-[14px] shadow-sm flex items-center justify-between"
                      >
                        <span>{answer}</span>
                        <div className="w-5 h-5 rounded-full border border-[#00a884]/20 flex items-center justify-center bg-[#00a884]/5">
                          <span className="text-[10px]">{aIdx + 1}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex justify-end mt-1">
                    <span className={WA_TIME}>{msg.time}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-1.5">
                  <p className="text-[14.5px] md:text-base leading-relaxed">{msg.content}</p>
                  <div className="flex items-center gap-0.5 pb-0.5">
                    <span className={WA_TIME}>{msg.time}</span>
                    <CheckCheck className={`w-3.5 h-3.5 ${WA_BLUE_CHECK}`} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {typing && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white text-[#111b21] rounded-lg rounded-tr-none px-3 py-2 shadow-sm border border-slate-100 relative ml-4">
              <div className="flex space-x-1 items-center h-5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <div 
                className="absolute top-0 -right-2 w-3 h-4 bg-white"
                style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
              />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* WhatsApp Input-like Bottom Area */}
      <div className="bg-[#f0f2f5] px-3 py-2 flex items-center gap-2 border-t border-[#d1d7db]">
        <div className="flex gap-3 text-[#54656f]">
          <Smile className="w-6 h-6 cursor-pointer" />
          <Paperclip className="w-6 h-6 cursor-pointer" />
        </div>
        <div className="flex-1 bg-white rounded-lg px-4 py-2 text-[15px] text-[#8696a0] shadow-sm border border-white flex items-center justify-between">
          <span>{currentQuestion ? 'בחר תשובה מהאפשרויות למעלה...' : 'ממתין לשאלה...'}</span>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${currentQuestion ? 'bg-[#00a884]' : 'bg-[#8696a0] transition-colors shadow-sm'}`}>
          <Send className="w-5 h-5 mr-0.5 rtl:ml-0.5 rtl:mr-0" />
        </div>
      </div>

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] px-4 py-2 rounded-lg text-sm shadow-lg z-[100] flex items-center gap-2 animate-fade-in">
          <div className="w-2 h-2 bg-[#ef4444] rounded-full animate-pulse"></div>
          {error}
        </div>
      )}
    </div>
  );
};

export default ExamPage;
