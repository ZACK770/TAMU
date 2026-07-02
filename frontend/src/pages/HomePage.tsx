import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Play, X, Download, Volume2, Sparkles, Users, Zap, ArrowRight, Heart, Flame } from 'lucide-react';
import { materialsService, Lesson, StudyProgram } from '../services/materials';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('all');
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
  const weeklyLessons = filteredLessons.filter((lesson) => lesson.parasha || lesson.weekDate);
  const currentWeeklyLesson = weeklyLessons.find((lesson) => lesson.weekDate && new Date(lesson.weekDate) >= new Date()) || weeklyLessons[0];

  const handleStartExam = () => {
    if (isAuthenticated) {
      navigate('/exam');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 bg-white/90 backdrop-blur-xl border border-violet-100 rounded-2xl mt-4 px-6 shadow-lg shadow-violet-200/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" fillOpacity="0.9"/>
                  <path d="M12 6L13.5 9.5L17 10L14 13L15 17L12 15L9 17L10 13L7 10L10.5 9.5L12 6Z" fill="url(#grad1)" fillOpacity="0.8"/>
                  <defs>
                    <linearGradient id="grad1" x1="12" y1="6" x2="12" y2="17" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8B5CF6"/>
                      <stop offset="1" stopColor="#6366F1"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">טעמו וראו</h1>
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mt-1">ארגון גג למודעות יהודית</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="hidden md:flex items-center gap-2 text-slate-600 hover:text-violet-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                ניהול
              </button>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/personal')}
                    className="btn-secondary text-sm px-4 py-2.5 hidden sm:block"
                  >
                    אזור אישי
                  </button>
                  <button
                    onClick={() => navigate('/exam')}
                    className="btn-primary text-sm px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 border-none shadow-xl shadow-violet-500/30"
                  >
                    כניסה למבחן
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="btn-primary text-sm px-8 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 border-none shadow-xl shadow-violet-500/30"
                >
                  הצטרפות
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-24">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-900 px-5 py-2 rounded-full text-xs font-bold mb-8 shadow-lg shadow-violet-200/50 border border-violet-200 animate-slide-up">
            <Flame className="w-4 h-4" />
            המהפכה כבר כאן
            <Flame className="w-4 h-4" />
          </div>
          
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tight mb-6 leading-[1.05] animate-slide-up" style={{ animationDelay: '0.1s' }}>
            גלה את העומק. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600">התחבר למשמעות.</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto font-medium leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            לא רק לימוד. <span className="text-violet-600 font-bold">חוויה</span> שמשנה את הכל.
            <br className="hidden md:block" />
            אלפי בני נוער כבר בפנים. אתה הבא?
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={handleStartExam}
              className="group btn-primary text-lg px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 border-none shadow-2xl shadow-violet-500/40 w-full sm:w-auto hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              מתחילים עכשיו
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('learning-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary text-lg px-10 py-4 w-full sm:w-auto hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5 text-violet-600" />
              חומרי לימוד
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">+2,500 משתתפים</p>
                <p className="text-xs text-slate-500">הצטרפו השנה</p>
              </div>
            </div>
            <div className="h-12 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">50+ סניפים</p>
                <p className="text-xs text-slate-500">בכל הארץ</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Main Content Area */}
      <main id="learning-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        {/* Testimonials Section */}
        <div className="mb-32">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-900 px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-md shadow-violet-200/50">
              <Heart className="w-3 h-3" />
              מה הם אומרים
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              סיפורים אמיתיים
            </h3>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              אלפי בני נוער שכבר עברו את המסע
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'עידו סטונדט',
                role: 'בוגר שלב א\'',
                quote: 'זה פשוט הפך אותי לאדם אחר. התוכן, האנשים, החוויה - שום דבר לא משווה.',
                color: 'from-violet-500 to-indigo-500'
              },
              {
                name: 'מאיה לוי',
                role: 'בוגרת שלב ב\'',
                quote: 'לא ידעתי שלימוד יכול להיות כל כך מעניין ומחובר למציאות שלי.',
                color: 'from-pink-500 to-rose-500'
              },
              {
                name: 'יונתן כהן',
                role: 'בוגר שלב א\'',
                quote: 'הקהילה כאן היא משהו אחר. כולם רוצים לראות אותך מצליח.',
                color: 'from-amber-500 to-orange-500'
              }
            ].map((testimonial, i) => (
              <div key={i} className="group relative bg-white rounded-3xl p-8 shadow-lg shadow-violet-100/50 hover:shadow-xl hover:shadow-violet-200/50 transition-all duration-500">
                <div className="absolute -top-4 right-6 w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-serif shadow-lg">
                  "
                </div>
                <div className="mb-6">
                  <p className="text-lg text-slate-700 leading-relaxed font-medium">
                    {testimonial.quote}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features / Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
          {[
            { icon: Sparkles, title: 'למידה ברמה אחרת', desc: 'תוכן שמעורר סקרנות ומאתגר אותך לצמוח. כל שיעור הוא הזדמנות לגלות משהו חדש על עצמך.' },
            { icon: Users, title: 'קהילה של חברים', desc: 'אלפי בני נוער שכמוך מחפשים משמעות. הצטרף למסע משותף של גילוי והתפתחות.' },
            { icon: Zap, title: 'חוויה דינמית', desc: 'ממשק עכשווי שעובד מכל מכשיר, בכל זמן. הלמידה שלך, הכללים שלך.' }
          ].map((feature, i) => (
            <div key={i} className="group card-hover p-8 border-none bg-white/70 backdrop-blur-sm hover:bg-white transition-all duration-500 rounded-3xl shadow-lg shadow-violet-100/50 hover:shadow-xl hover:shadow-violet-200/50">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl shadow-violet-500/30">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed text-lg">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Learning Materials Header */}
        <div className="space-y-16">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-900 px-4 py-1.5 rounded-full text-xs font-bold mb-2 shadow-md shadow-violet-200/50">
              <Sparkles className="w-3 h-3" />
              תוכן מעודכן ורלוונטי
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              מה קורה פה?
            </h3>
            <p className="text-xl text-slate-600 max-w-2xl">
              שיעורים, חומרים ותכנים שנבנו במיוחד בשבילך
            </p>
            <div className="flex flex-wrap justify-center gap-3 p-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl shadow-inner">
              <button
                onClick={() => setSelectedProgramId('all')}
                className={`text-sm font-bold px-6 py-3 rounded-xl transition-all duration-300 ${
                  selectedProgramId === 'all'
                    ? 'bg-white text-violet-900 shadow-lg shadow-violet-200/50'
                    : 'text-slate-500 hover:text-violet-900 hover:bg-white/50'
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
                      ? 'bg-white text-violet-900 shadow-lg shadow-violet-200/50'
                      : 'text-slate-500 hover:text-violet-900 hover:bg-white/50'
                  }`}
                >
                  {program.title}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Lesson Section */}
          {weeklyLessons.length > 0 && currentWeeklyLesson && (
            <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-8 md:p-12 text-white shadow-2xl shadow-violet-500/30">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-400/20 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="space-y-6 flex-1 text-center md:text-right">
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white border border-white/20">
                    <Flame className="w-3 h-3 fill-current" />
                    השיעור השבועי 🔥
                  </div>
                  <h4 className="text-3xl md:text-5xl font-black">{currentWeeklyLesson.title}</h4>
                  {currentWeeklyLesson.parasha && (
                    <p className="text-xl text-white/80 font-medium">פרשת {currentWeeklyLesson.parasha}</p>
                  )}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                    {currentWeeklyLesson.materials[0] && (
                      <a
                        href={currentWeeklyLesson.materials[0].fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !bg-white !text-violet-900 border-none px-8 py-4 text-base flex items-center gap-2 hover:scale-105 transition-transform shadow-xl"
                      >
                        <Download className="w-5 h-5" />
                        הורד חומרי לימוד
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="w-full md:w-auto min-w-[300px]">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 space-y-4">
                    <p className="text-sm font-bold text-white/60 uppercase tracking-widest">שיעורים קודמים</p>
                    <div className="space-y-2">
                      {weeklyLessons.slice(0, 3).map((lesson) => (
                        <button 
                          key={lesson.id}
                          onClick={() => lesson.materials[0]?.fileUrl && window.open(lesson.materials[0].fileUrl, '_blank')}
                          className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/20 transition-colors text-right"
                        >
                          <span className="font-bold text-sm">{lesson.parasha || lesson.title}</span>
                          <Download className="w-4 h-4 text-white/60" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Video & Audio Lessons */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <Play className="w-5 h-5 text-violet-600" />
                  </div>
                  מדיה ושיעורים
                </h4>
                <div className="h-px flex-1 bg-violet-100 mx-6 hidden sm:block"></div>
                <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100">
                  {Array.isArray(filteredLessons) && filteredLessons.filter(l => l.videoUrl || l.audioUrl).length} פריטים
                </span>
              </div>

              <div className="space-y-4">
                {!Array.isArray(filteredLessons) || filteredLessons.filter(l => l.videoUrl || l.audioUrl).length === 0 ? (
                  <div className="card bg-gradient-to-br from-violet-50 to-indigo-50 border-dashed border-2 border-violet-200 py-16 text-center text-violet-400 font-medium rounded-3xl">
                    אין שיעורי מולטימדיה זמינים כעת
                  </div>
                ) : (
                  Array.isArray(filteredLessons) && filteredLessons.filter(l => l.videoUrl || l.audioUrl).map((lesson) => (
                    <div key={lesson.id} className="group card-hover p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl shadow-lg shadow-violet-100/50 hover:shadow-xl hover:shadow-violet-200/50">
                      <div className="flex items-start gap-4 text-right">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:from-violet-500 group-hover:to-indigo-500 group-hover:text-white transition-all duration-300">
                          {lesson.videoUrl ? <Play className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1">
                          <h5 className="font-bold text-slate-900 text-lg leading-tight">{lesson.title}</h5>
                          {lesson.description && <p className="text-sm text-slate-500 font-medium">{lesson.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lesson.videoUrl && (
                          <button
                            onClick={() => setActiveMedia({ title: lesson.title, url: lesson.videoUrl!, type: 'video' })}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            וידאו
                          </button>
                        )}
                        {lesson.audioUrl && (
                          <button
                            onClick={() => setActiveMedia({ title: lesson.title, url: lesson.audioUrl!, type: 'audio' })}
                            className="flex-1 sm:flex-none bg-white border-2 border-violet-200 text-violet-600 text-xs font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 hover:bg-violet-50 transition-all"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            שמע
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Downloadable Materials */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <Download className="w-5 h-5 text-violet-600" />
                  </div>
                  קבצים להורדה
                </h4>
                <div className="h-px flex-1 bg-violet-100 mx-6 hidden sm:block"></div>
                <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100">
                  {Array.isArray(filteredMaterials) ? filteredMaterials.length : 0} קבצים
                </span>
              </div>

              <div className="space-y-4">
                {!Array.isArray(filteredMaterials) || filteredMaterials.length === 0 ? (
                  <div className="card bg-gradient-to-br from-violet-50 to-indigo-50 border-dashed border-2 border-violet-200 py-16 text-center text-violet-400 font-medium rounded-3xl">
                    אין קבצים זמינים להורדה כעת
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredMaterials.map((material) => (
                      <a
                        key={material.id}
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group card-hover p-4 bg-white flex items-center gap-4 text-right rounded-2xl shadow-lg shadow-violet-100/50 hover:shadow-xl hover:shadow-violet-200/50"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl flex flex-col items-center justify-center shrink-0 group-hover:from-violet-500 group-hover:to-indigo-500 group-hover:text-white transition-all">
                          <span className="text-[10px] font-black uppercase leading-none mb-0.5">{material.fileType}</span>
                          <Download className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 truncate leading-tight">{material.title}</p>
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
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-violet-900 via-indigo-900 to-violet-900 text-white mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-right">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" fillOpacity="0.9"/>
                  <path d="M12 6L13.5 9.5L17 10L14 13L15 17L12 15L9 17L10 13L7 10L10.5 9.5L12 6Z" fill="url(#grad2)" fillOpacity="0.8"/>
                  <defs>
                    <linearGradient id="grad2" x1="12" y1="6" x2="12" y2="17" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8B5CF6"/>
                      <stop offset="1" stopColor="#6366F1"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">טעמו וראו</h1>
                <p className="text-xs font-bold text-violet-200 uppercase tracking-widest mt-1">ארגון גג למודעות יהודית</p>
              </div>
            </div>
            <p className="text-sm font-medium text-violet-200">
              © 2026 כל הזכויות שמורות
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs font-bold text-violet-200 hover:text-white transition-colors">תנאי שימוש</a>
              <a href="#" className="text-xs font-bold text-violet-200 hover:text-white transition-colors">פרטיות</a>
              <a href="#" className="text-xs font-bold text-violet-200 hover:text-white transition-colors">צור קשר</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Media Player */}
      {activeMedia && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white/95 backdrop-blur-xl border border-violet-200 rounded-2xl shadow-2xl shadow-violet-500/20 z-50 p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-violet-100">
            <h5 className="text-sm font-bold text-slate-900 truncate pr-4">{activeMedia.title}</h5>
            <button
              onClick={() => setActiveMedia(null)}
              className="text-slate-400 hover:text-violet-600 p-1 rounded-md hover:bg-violet-50 transition-colors"
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

export default HomePage;