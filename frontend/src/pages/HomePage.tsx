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

  const filteredLessons = selectedProgramId === 'all' ? lessons : lessons.filter((lesson) => lesson.studyProgramId === selectedProgramId);
  const filteredMaterials = filteredLessons.flatMap((lesson) => lesson.materials);
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
      <header className="glass sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">פורטל הלמידה והמבחנים</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="btn-secondary text-sm px-4 py-2"
              >
                ניהול
              </button>
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/personal')}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    אזור אישי
                  </button>
                  <button
                    onClick={() => navigate('/exam')}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    כניסה למבחן
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="btn-primary text-sm px-4 py-2"
                >
                  התחברות
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-wide">
            <span className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-ping"></span>
            גרסה מתקדמת 2.0
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            המרחב האישי ללמידה והצלחה
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto font-normal leading-relaxed">
            ריכוז חומרי הלימוד השבועיים, שיעורי שמע ווידאו, ומערכת בחינות אינטראקטיבית ונקייה מהסחות דעת.
          </p>
          <button
            onClick={handleStartExam}
            className="btn-primary text-base px-10 py-3.5 shadow-sm hover:shadow"
          >
            התחל מבחן
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">למידה מרוכזת</h3>
            <p className="text-sm text-slate-600">
              גישה ישירה לחומרי לימוד וקבצי עבודה להורדה מהירה
            </p>
          </div>
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">נגישות מובייל</h3>
            <p className="text-sm text-slate-600">
              ממשק נקי ומותאם במיוחד לעבודה יעילה מכל טלפון נייד
            </p>
          </div>
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">מבחני צ'אט</h3>
            <p className="text-sm text-slate-600">
              ממשק בחינה ממוקד ואינטראקטיבי המדמה שיחת צ'אט זורמת
            </p>
          </div>
        </div>

        {/* Learning Materials Section */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              תכני לימוד ושיעורים
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedProgramId('all')}
                className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                  selectedProgramId === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                כל השיעורים
              </button>
              {studyPrograms.map((program) => (
                <button
                  key={program.id}
                  onClick={() => setSelectedProgramId(program.id)}
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                    selectedProgramId === program.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {program.title}
                </button>
              ))}
            </div>
          </div>

          {weeklyLessons.length > 0 && currentWeeklyLesson && (
            <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">השיעור השבועי הנוכחי</span>
                <h4 className="text-xl font-bold text-slate-900">{currentWeeklyLesson.title}</h4>
                {currentWeeklyLesson.parasha && (
                  <p className="text-sm text-slate-600">פרשת השבוע: {currentWeeklyLesson.parasha}</p>
                )}
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                {currentWeeklyLesson.materials[0] && (
                  <a
                    href={currentWeeklyLesson.materials[0].fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-sm flex items-center justify-center gap-2 py-2.5 w-full md:w-auto"
                  >
                    <Download className="w-4 h-4" />
                    הורד חומרי לימוד
                  </a>
                )}
                <select
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-slate-900 w-full md:w-auto"
                  onChange={(event) => {
                    const lesson = weeklyLessons.find((item) => item.id === event.target.value);
                    if (lesson?.materials[0]?.fileUrl) window.open(lesson.materials[0].fileUrl, '_blank');
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>שיעורים נוספים לפי פרשה</option>
                  {weeklyLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>{lesson.parasha || lesson.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video & Audio Lessons */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-slate-900" />
                  שיעורי שמע ווידאו
                </h4>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {filteredLessons.filter(l => l.videoUrl || l.audioUrl).length} שיעורים
                </span>
              </div>

              {filteredLessons.filter(l => l.videoUrl || l.audioUrl).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  אין שיעורי מולטימדיה זמינים כעת
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLessons.filter(l => l.videoUrl || l.audioUrl).map((lesson) => (
                    <div key={lesson.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h5 className="font-semibold text-slate-900 text-sm md:text-base">{lesson.title}</h5>
                        {lesson.description && <p className="text-xs text-slate-500">{lesson.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {lesson.videoUrl && (
                          <button
                            onClick={() => setActiveMedia({ title: lesson.title, url: lesson.videoUrl!, type: 'video' })}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5" />
                            צפה בשיעור
                          </button>
                        )}
                        {lesson.audioUrl && (
                          <button
                            onClick={() => setActiveMedia({ title: lesson.title, url: lesson.audioUrl!, type: 'audio' })}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            האזן לשיעור
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Downloadable Materials */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-slate-900" />
                  קבצים להורדה
                </h4>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {filteredMaterials.length} קבצים
                </span>
              </div>

              {filteredMaterials.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  אין קבצים זמינים להורדה כעת
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredMaterials.map((material) => (
                    <li key={material.id} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 text-xs tracking-wider">
                          {material.fileType.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{material.title}</p>
                          <p className="text-xs text-slate-500">{(material.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-200/50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-slate-500">
          כל הזכויות שמורות למערכת הלמידה והמבחנים.
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