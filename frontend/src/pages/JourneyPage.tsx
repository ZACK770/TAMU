import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  BookOpen, 
  FileText, 
  Gift, 
  ChevronLeft, 
  Menu,
  X,
  Play,
  Download,
  Volume2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Award,
  TrendingUp,
  Star,
  Flame,
  Zap,
  Crown,
  Target,
  Layers,
  Home,
  User,
  Settings,
  Users
} from 'lucide-react';
import { materialsService, Lesson, StudyProgram } from '../services/materials';

const JourneyPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('all');
  const [activeStage, setActiveStage] = useState<'learn' | 'test' | 'redeem' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<{ title: string; url: string; type: 'video' | 'audio' } | null>(null);

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const [lessonsData, programsData] = await Promise.all([
          materialsService.getAllLessons(),
          materialsService.getStudyPrograms(),
        ]);
        setLessons(lessonsData);
        setStudyPrograms(programsData);
      } catch (error) {
        console.error('Failed to load materials:', error);
      }
    };
    loadMaterials();
  }, []);

  const filteredLessons = selectedProgramId === 'all' 
    ? (Array.isArray(lessons) ? lessons : [])
    : (Array.isArray(lessons) ? lessons : []).filter((lesson) => lesson.studyProgramId === selectedProgramId);
  const filteredMaterials = filteredLessons.flatMap((lesson) => Array.isArray(lesson.materials) ? lesson.materials : []);

  const handleStageClick = (stage: 'learn' | 'test' | 'redeem') => {
    setActiveStage(stage);
    setIsSidebarOpen(false);
  };

  const handleStartExam = () => {
    if (isAuthenticated) {
      navigate('/exam');
    } else {
      navigate('/auth');
    }
  };

  const handleRedeem = () => {
    if (isAuthenticated) {
      navigate('/personal');
    } else {
      navigate('/auth');
    }
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
      }
    }
    return url;
  };

  const stages = [
    {
      id: 'learn' as const,
      title: 'משתתפים',
      subtitle: 'תוכן שמעורר סקרנות ומחובר',
      icon: BookOpen,
      color: 'from-violet-500 to-indigo-500',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-600'
    },
    {
      id: 'test' as const,
      title: 'מנצחים',
      subtitle: 'בוחן עצמי מהנה ואינטראקטיבי',
      icon: FileText,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    },
    {
      id: 'redeem' as const,
      title: 'מממשים',
      subtitle: 'הטבות ופרסים בלעדיים',
      icon: Gift,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    }
  ];

  const companyLogos = [
    { name: 'Nike', color: 'from-gray-800 to-black' },
    { name: 'Adidas', color: 'from-blue-600 to-blue-800' },
    { name: 'Apple', color: 'from-gray-600 to-gray-800' },
    { name: 'Samsung', color: 'from-blue-800 to-blue-900' },
    { name: 'Spotify', color: 'from-green-500 to-green-600' },
    { name: 'Netflix', color: 'from-red-600 to-red-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-violet-500/30 selection:text-violet-900">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-pink-600/15 via-rose-600/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-br from-amber-600/10 via-orange-600/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl mt-4 px-6 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2.5 hover:bg-white/10 rounded-xl transition-all duration-300 group"
              >
                {isSidebarOpen ? <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" /> : <Menu className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />}
              </button>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 via-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" fillOpacity="0.95"/>
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full shadow-lg shadow-pink-500/50 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white leading-none font-sans">טעמו וראו</h1>
                <p className="text-[10px] font-bold text-violet-300 uppercase tracking-[0.2em] mt-1">המסע שלך</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/personal')}
                  className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105 hidden sm:block"
                >
                  אזור אישי
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all duration-300 shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 border border-violet-400/30"
                >
                  הצטרפות
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 p-6 shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-white tracking-tight">תפריט</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-300 group"
              >
                <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>
            <nav className="space-y-2">
              {[
                { label: 'דף הבית', path: '/', icon: Home },
                { label: 'המסע שלנו', path: '/journey', active: true, icon: Sparkles },
                { label: 'מבחן', path: '/exam', icon: FileText },
                { label: 'אזור אישי', path: '/personal', icon: User },
                { label: 'ניהול', path: '/admin', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-right px-4 py-4 rounded-2xl transition-all duration-300 flex items-center gap-3 ${
                      item.active
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    <span className="font-bold">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-2xl p-4 border border-violet-500/30">
                <p className="text-xs font-bold text-violet-300 text-center">גרסת מערכת 1.0</p>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 w-full">
        {/* Hero Message */}
        {!activeStage && (
          <div className="text-center mb-20 animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-violet-500/20 text-violet-300 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 border border-violet-500/30 shadow-xl shadow-violet-500/20 backdrop-blur-sm">
              <Flame className="w-4 h-4 animate-pulse" />
              הכיף מתחיל כאן
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-tight mb-8 leading-[0.95] font-sans">
              <span className="block animate-slide-up" style={{ animationDelay: '0.1s' }}>משתתפים</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 animate-slide-up" style={{ animationDelay: '0.2s' }}>מנצחים</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 animate-slide-up" style={{ animationDelay: '0.3s' }}>מממשים</span>
            </h2>
            <p className="text-xl sm:text-2xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed animate-slide-up" style={{ animationDelay: '0.4s' }}>
              שלושה שלבים פשוטים לחוויה שמשנה את הכל
            </p>
            
            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">2,500+</p>
                  <p className="text-xs font-bold text-slate-400">במשחק</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">50+</p>
                  <p className="text-xs font-bold text-slate-400">סניפים</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">4.9</p>
                  <p className="text-xs font-bold text-slate-400">דירוג</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bento Grid Stages */}
        {!activeStage ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isLarge = index === 1;
              return (
                <div
                  key={stage.id}
                  onClick={() => handleStageClick(stage.id)}
                  className={`group relative bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 border border-white/10 hover:border-white/20 transition-all duration-500 cursor-pointer overflow-hidden animate-slide-up ${
                    isLarge ? 'md:row-span-2' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Animated gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  {/* Decorative pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-xl"></div>
                  </div>

                  {/* Connection line (not on last item) */}
                  {index < stages.length - 1 && (
                    <div className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 w-12 z-10">
                      <ChevronLeft className="w-12 h-12 text-white/30 group-hover:text-white/60 transition-colors" />
                    </div>
                  )}

                  <div className="relative z-10 h-full flex flex-col">
                    <div className={`w-24 h-24 bg-gradient-to-br ${stage.color} rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl shadow-${stage.color.split('-')[1]}-500/30 relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                      <Icon className="w-12 h-12 text-white relative z-10" />
                    </div>
                    <div className={`flex-1 ${isLarge ? 'flex flex-col justify-center' : ''}`}>
                      <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-white/60 mb-4 w-fit">
                        <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${stage.color}`}></span>
                        שלב {index + 1}
                      </div>
                      <h3 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">{stage.title}</h3>
                      <p className="text-slate-400 font-medium mb-6 text-lg leading-relaxed">{stage.subtitle}</p>
                      <div className="flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all duration-300 mt-auto">
                        <span className="relative">
                          בוא נתחיל
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 group-hover:w-full transition-all duration-300"></span>
                        </span>
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Active Stage Content */
          <div className="animate-scale-in">
            <button
              onClick={() => setActiveStage(null)}
              className="flex items-center gap-2 text-slate-400 hover:text-white font-bold mb-8 transition-all duration-300 group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="relative">
                חזרה למסע
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 group-hover:w-full transition-all duration-300"></span>
              </span>
            </button>

            {activeStage === 'learn' && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 bg-violet-500/20 text-violet-300 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6 border border-violet-500/30 backdrop-blur-sm">
                    <BookOpen className="w-3 h-3" />
                    שלב 1
                  </div>
                  <h3 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">משתתפים</h3>
                  <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                    תוכן שמעורר סקרנות ומחובר - כל השיעורים והחומרים במקום אחד
                  </p>
                </div>

                {/* Program Filter */}
                <div className="flex flex-wrap justify-center gap-3 p-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 max-w-2xl mx-auto">
                  <button
                    onClick={() => setSelectedProgramId('all')}
                    className={`text-sm font-bold px-6 py-3 rounded-xl transition-all duration-300 ${
                      selectedProgramId === 'all'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    הכל
                  </button>
                  {Array.isArray(studyPrograms) && studyPrograms.map((program) => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgramId(program.id)}
                      className={`text-sm font-bold px-6 py-3 rounded-xl transition-all duration-300 ${
                        selectedProgramId === program.id
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {program.title}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Video & Audio */}
                  <div className="space-y-6">
                    <h4 className="text-2xl font-black text-white flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-violet-500/30">
                        <Play className="w-6 h-6 text-violet-400" />
                      </div>
                      שיעורי מדיה
                    </h4>
                    <div className="space-y-4">
                      {!Array.isArray(filteredLessons) || filteredLessons.filter(l => l.videoUrl || l.audioUrl).length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-xl border-2 border-dashed border-white/10 py-16 text-center text-slate-500 font-medium rounded-3xl">
                          עוד לא העלנו תוכן - אבל זה בקרוב! 🔥
                        </div>
                      ) : (
                        Array.isArray(filteredLessons) && filteredLessons.filter(l => l.videoUrl || l.audioUrl).map((lesson) => (
                          <div key={lesson.id} className="group bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-3xl transition-all duration-300 hover:bg-white/10">
                            <div className="flex items-start gap-4 text-right">
                              <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:from-violet-500 group-hover:to-indigo-500 group-hover:text-white transition-all duration-300 border border-violet-500/30">
                                {lesson.videoUrl ? <Play className="w-6 h-6 text-violet-400 group-hover:text-white" /> : <Volume2 className="w-6 h-6 text-violet-400 group-hover:text-white" />}
                              </div>
                              <div className="space-y-2">
                                <h5 className="font-bold text-white text-xl leading-tight">{lesson.title}</h5>
                                {lesson.description && <p className="text-sm text-slate-400 font-medium">{lesson.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {lesson.videoUrl && (
                                <button
                                  onClick={() => setActiveMedia({ title: lesson.title, url: lesson.videoUrl!, type: 'video' })}
                                  className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all"
                                >
                                  <Play className="w-4 h-4 fill-current" />
                                  וידאו
                                </button>
                              )}
                              {lesson.audioUrl && (
                                <button
                                  onClick={() => setActiveMedia({ title: lesson.title, url: lesson.audioUrl!, type: 'audio' })}
                                  className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                  <Volume2 className="w-4 h-4" />
                                  שמע
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Downloads */}
                  <div className="space-y-6">
                    <h4 className="text-2xl font-black text-white flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-violet-500/30">
                        <Download className="w-6 h-6 text-violet-400" />
                      </div>
                      קבצים להורדה
                    </h4>
                    <div className="space-y-4">
                      {!Array.isArray(filteredMaterials) || filteredMaterials.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-xl border-2 border-dashed border-white/10 py-16 text-center text-slate-500 font-medium rounded-3xl">
                          עוד אין קבצים - אבל נטען בקרוב! 📦
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {filteredMaterials.map((material) => (
                            <a
                              key={material.id}
                              href={material.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 p-5 flex items-center gap-4 text-right rounded-3xl transition-all duration-300 hover:bg-white/10"
                            >
                              <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl flex flex-col items-center justify-center shrink-0 group-hover:from-violet-500 group-hover:to-indigo-500 group-hover:text-white transition-all border border-violet-500/30">
                                <span className="text-[10px] font-black uppercase leading-none mb-0.5 text-violet-400 group-hover:text-white">{material.fileType}</span>
                                <Download className="w-5 h-5 text-violet-400 group-hover:text-white" />
                              </div>
                              <div className="min-w-0 overflow-hidden">
                                <p className="text-sm font-bold text-white truncate leading-tight">{material.title}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                  {(material.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStage === 'test' && (
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 bg-pink-500/20 text-pink-300 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6 border border-pink-500/30 backdrop-blur-sm">
                    <FileText className="w-3 h-3" />
                    שלב 2
                  </div>
                  <h3 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">מנצחים</h3>
                  <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                    בוחן עצמי מהנה ואינטראקטיבי - תראה כמה אתה יודע
                  </p>
                </div>

                <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-xl rounded-[2rem] p-8 md:p-12 border border-pink-500/20 shadow-2xl shadow-pink-500/20 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-pink-500/30 transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-pink-500/30">
                        <Award className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">אתגר מהנה</h4>
                      <p className="text-slate-400 leading-relaxed">
                        שאלות מעניינות על התוכן שלמדת. אפשר לענות מכל מקום ובכל זמן - אין לחץ, רק כיף.
                      </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-pink-500/30 transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-pink-500/30">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">עלה רמות</h4>
                      <p className="text-slate-400 leading-relaxed">
                        כל ניצחון מקדם אותך במסע ופותח אפשרויות חדשות. ככל שמשתתפים יותר - מממשים יותר.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-2xl p-6 border border-pink-500/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shrink-0">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">טיפ לניצחון</h4>
                        <p className="text-slate-400 text-sm">למד בכיף, קח את הזמן שלך, ואל תהסס לנסות שוב</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartExam}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-lg font-bold px-10 py-6 rounded-2xl shadow-2xl shadow-pink-500/40 hover:shadow-pink-500/60 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 border border-pink-400/30"
                >
                  לאתגר
                  <ArrowRight className="w-6 h-6" />
                </button>

                {!isAuthenticated && (
                  <p className="text-center text-slate-500 mt-4 text-sm font-medium">
                    צריך להתחבר כדי להתחיל - זה לוקח שניות! 🚀
                  </p>
                )}
              </div>
            )}

            {activeStage === 'redeem' && (
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6 border border-amber-500/30 backdrop-blur-sm">
                    <Gift className="w-3 h-3" />
                    שלב 3
                  </div>
                  <h3 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">מממשים</h3>
                  <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                    הטבות ופרסים בלעדיים מהמותגים הכי חמים
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl rounded-[2rem] p-8 md:p-12 border border-amber-500/20 shadow-2xl shadow-amber-500/20 mb-8">
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 mb-4">
                      <Crown className="w-6 h-6 text-amber-400" />
                      <h4 className="text-2xl font-bold text-white">חברות שותפות</h4>
                      <Crown className="w-6 h-6 text-amber-400" />
                    </div>
                    <p className="text-slate-400">מימוש הטבות אצל המותגים המובילים בישראל</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-10">
                    {companyLogos.map((company, index) => (
                      <div
                        key={index}
                        className="aspect-square bg-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10 hover:border-amber-500/30 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer group"
                      >
                        <div className={`w-16 h-16 bg-gradient-to-br ${company.color} rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                          {company.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-amber-500/30">
                        <Gift className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">איך זה עובד?</h4>
                      <p className="text-slate-400 leading-relaxed">
                        אחרי שעוברים מבחנים וצוברים נקודות, אפשר לממש אותן להטבות אמיתיות - הנחות, מוצרים חינם, וחוויות בלעדיות.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl p-6 border border-amber-500/30">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-amber-500/30">
                        <Layers className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">רמות הטבה</h4>
                      <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500/30 rounded-lg flex items-center justify-center text-amber-400 font-bold text-sm">1</div>
                          <span className="text-slate-300 text-sm">הנחות בסיסיות</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500/50 rounded-lg flex items-center justify-center text-amber-300 font-bold text-sm">2</div>
                          <span className="text-slate-300 text-sm">הנחות משודרגות</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">3</div>
                          <span className="text-slate-300 text-sm">חוויות בלעדיות</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRedeem}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-lg font-bold px-10 py-6 rounded-2xl shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 border border-amber-400/30"
                >
                  למימוש הטבות
                  <ArrowRight className="w-6 h-6" />
                </button>

                {!isAuthenticated && (
                  <p className="text-center text-slate-500 mt-4 text-sm font-medium">
                    צריך להתחבר כדי לממש - זה משתלם! 🎁
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Media Player */}
      {activeMedia && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <h5 className="text-sm font-bold text-white truncate pr-4">{activeMedia.title}</h5>
            <button
              onClick={() => setActiveMedia(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-violet-900 to-indigo-900">
            {activeMedia.type === 'video' ? (
              activeMedia.url.includes('youtube') || activeMedia.url.includes('youtu.be') ? (
                <iframe
                  src={getEmbedUrl(activeMedia.url)}
                  title={activeMedia.title}
                  className="w-full aspect-video border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <video
                  src={activeMedia.url}
                  controls
                  className="w-full aspect-video"
                  autoPlay
                ></video>
              )
            ) : (
              <div className="p-4 bg-gradient-to-br from-violet-900 to-indigo-900 flex flex-col items-center gap-3">
                <Volume2 className="w-8 h-8 text-white animate-pulse" />
                <audio
                  src={activeMedia.url}
                  controls
                  className="w-full"
                  autoPlay
                ></audio>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneyPage;
