import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Smartphone, CheckCircle, Play, X, Download, GraduationCap, Volume2 } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl mt-4 px-6 shadow-lg shadow-slate-200/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl flex items-center justify-center shadow-inner">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">TAMU</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Learning Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="hidden md:flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
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
                    className="btn-primary text-sm px-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 border-none shadow-xl shadow-slate-900/20"
                  >
                    כניסה למבחן
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="btn-primary text-sm px-8 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 border-none shadow-xl shadow-slate-900/20"
                >
                  התחברות
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
        {/* Background Image with Parallax-like feel */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=2070" 
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/20 via-slate-50/80 to-slate-50"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50/40 via-transparent to-slate-50/40"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-slate-900 px-5 py-2 rounded-full text-xs font-bold mb-8 shadow-sm border border-white/50 animate-slide-up">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
            </span>
            גרסה מתקדמת 2026
          </div>
          
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1] animate-slide-up" style={{ animationDelay: '0.1s' }}>
            העתיד של הלימוד <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-600 to-slate-900">כבר כאן.</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto font-medium leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            מרחב למידה אינטליגנטי, ממוקד וחווייתי. <br className="hidden md:block" />
            כל מה שאתה צריך כדי להצליח, במקום אחד.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={handleStartExam}
              className="btn-primary text-lg px-12 py-5 shadow-2xl shadow-slate-900/30 w-full sm:w-auto hover:scale-105 transition-transform duration-300"
            >
              התחל מבחן עכשיו
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('learning-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary text-lg px-12 py-5 w-full sm:w-auto hover:bg-slate-50 transition-all"
            >
              חומרי לימוד
            </button>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce-slow hidden md:block">
          <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-2">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main id="learning-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        {/* Features / Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {[
            { icon: BookOpen, title: 'למידה חכמה', desc: 'גישה ישירה ומותאמת אישית לכל חומרי הלימוד שלך.' },
            { icon: Smartphone, title: 'חווית מובייל', desc: 'ממשק מלוטש שעובד מושלם מכל מכשיר, בכל זמן.' },
            { icon: CheckCircle, title: 'מערכת בחינות', desc: 'בחינות אינטראקטיביות המדמות שיחה טבעית וממוקדת.' }
          ].map((feature, i) => (
            <div key={i} className="group card-hover p-8 border-none bg-white/50 backdrop-blur-sm hover:bg-white transition-all duration-500">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-slate-900/10">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Learning Materials Header */}
        <div className="space-y-16">
          <div className="flex flex-col items-center text-center gap-6">
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              תכני לימוד ושיעורים
            </h3>
            <div className="flex flex-wrap justify-center gap-3 p-1.5 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setSelectedProgramId('all')}
                className={`text-sm font-bold px-6 py-3 rounded-xl transition-all duration-300 ${
                  selectedProgramId === 'all'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                כל השיעורים
              </button>
              {Array.isArray(studyPrograms) && studyPrograms.map((program) => (
                <button
                  key={program.id}
                  onClick={() => setSelectedProgramId(program.id)}
                  className={`text-sm font-bold px-6 py-3 rounded-xl transition-all duration-300 ${
                    selectedProgramId === program.id
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {program.title}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Lesson Section */}
          {weeklyLessons.length > 0 && currentWeeklyLesson && (
            <div className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl shadow-slate-900/20">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="space-y-6 flex-1 text-center md:text-right">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white/80 border border-white/10">
                    <Play className="w-3 h-3 fill-current" />
                    השיעור השבועי
                  </div>
                  <h4 className="text-3xl md:text-5xl font-black">{currentWeeklyLesson.title}</h4>
                  {currentWeeklyLesson.parasha && (
                    <p className="text-xl text-white/60 font-medium">פרשת {currentWeeklyLesson.parasha}</p>
                  )}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                    {currentWeeklyLesson.materials[0] && (
                      <a
                        href={currentWeeklyLesson.materials[0].fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !bg-white !text-slate-900 border-none px-8 py-4 text-base flex items-center gap-2 hover:scale-105 transition-transform"
                      >
                        <Download className="w-5 h-5" />
                        הורד חומרי לימוד
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="w-full md:w-auto min-w-[300px]">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-4">
                    <p className="text-sm font-bold text-white/40 uppercase tracking-widest">שיעורים קודמים</p>
                    <div className="space-y-2">
                      {weeklyLessons.slice(0, 3).map((lesson) => (
                        <button 
                          key={lesson.id}
                          onClick={() => lesson.materials[0]?.fileUrl && window.open(lesson.materials[0].fileUrl, '_blank')}
                          className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/10 transition-colors text-right"
                        >
                          <span className="font-bold text-sm">{lesson.parasha || lesson.title}</span>
                          <Download className="w-4 h-4 text-white/40" />
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
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Play className="w-5 h-5" />
                  </div>
                  מדיה ושיעורים
                </h4>
                <div className="h-px flex-1 bg-slate-100 mx-6 hidden sm:block"></div>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  {filteredLessons.filter(l => l.videoUrl || l.audioUrl).length} פריטים
                </span>
              </div>

              <div className="space-y-4">
                {filteredLessons.filter(l => l.videoUrl || l.audioUrl).length === 0 ? (
                  <div className="card bg-slate-50 border-dashed border-2 border-slate-200 py-16 text-center text-slate-400 font-medium">
                    אין שיעורי מולטימדיה זמינים כעת
                  </div>
                ) : (
                  filteredLessons.filter(l => l.videoUrl || l.audioUrl).map((lesson) => (
                    <div key={lesson.id} className="group card-hover p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 text-right">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
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
                            className="flex-1 sm:flex-none bg-slate-900 text-white text-xs font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            וידאו
                          </button>
                        )}
                        {lesson.audioUrl && (
                          <button
                            onClick={() => setActiveMedia({ title: lesson.title, url: lesson.audioUrl!, type: 'audio' })}
                            className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-900 text-xs font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
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
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  קבצים להורדה
                </h4>
                <div className="h-px flex-1 bg-slate-100 mx-6 hidden sm:block"></div>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  {filteredMaterials.length} קבצים
                </span>
              </div>

              <div className="space-y-4">
                {filteredMaterials.length === 0 ? (
                  <div className="card bg-slate-50 border-dashed border-2 border-slate-200 py-16 text-center text-slate-400 font-medium">
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
                        className="group card-hover p-4 bg-white flex items-center gap-4 text-right hover:border-slate-900/10"
                      >
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center shrink-0 group-hover:bg-slate-100 transition-colors">
                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-0.5">{material.fileType}</span>
                          <Download className="w-4 h-4 text-slate-600" />
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
      <footer className="bg-white border-t border-slate-100 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-right">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">TAMU</h1>
            </div>
            <p className="text-sm font-medium text-slate-400">
              © 2026 כל הזכויות שמורות למערכת הלמידה והמבחנים המתקדמת.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">תנאי שימוש</a>
              <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">פרטיות</a>
              <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">צור קשר</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Media Player */}
      {activeMedia && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 glass border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h5 className="text-sm font-bold text-slate-900 truncate pr-4">{activeMedia.title}</h5>
            <button
              onClick={() => setActiveMedia(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-hidden rounded-xl bg-slate-950">
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
              <div className="p-4 bg-slate-900 flex flex-col items-center gap-3">
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