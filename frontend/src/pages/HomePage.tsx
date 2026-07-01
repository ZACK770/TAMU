import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Smartphone, CheckCircle, Play, Download, GraduationCap } from 'lucide-react';
import { materialsService, Lesson, Material } from '../services/materials';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const lessonsData = await materialsService.getAllLessons();
        setLessons(lessonsData);
        const allMaterials = lessonsData.flatMap(lesson => lesson.materials);
        setMaterials(allMaterials);
      } catch (error) {
        console.error('Failed to load materials:', error);
      }
    };
    loadMaterials();
  }, []);

  const handleStartExam = () => {
    if (isAuthenticated) {
      navigate('/exam');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">מערכת למידה ומבחנים</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin')}
                className="btn-secondary text-sm"
              >
                ניהול
              </button>
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/exam')}
                  className="btn-primary"
                >
                  כניסה למבחן
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="btn-primary"
                >
                  התחברות
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            מערכת חדשה ומתקדמת
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 animate-slide-up">
            ברוכים הבאים ל
            <span className="gradient-text">מערכת הלמידה</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            מערכת מתקדמת ללמידה ומבחנים אינטראקטיביים, המאפשרת לכם ללמוד בצורה יעילה ונוחה
          </p>
          <button
            onClick={handleStartExam}
            className="btn-primary text-lg px-10 py-4 animate-scale-in"
            style={{ animationDelay: '0.2s' }}
          >
            התחל מבחן
          </button>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card-hover text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">למידה משותפת</h3>
            <p className="text-gray-600">
              גישה לחומרי לימוד, שיעורי וידאו וקבצים להורדה
            </p>
          </div>
          <div className="card-hover text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">נגישות מלאה</h3>
            <p className="text-gray-600">
              ממשק רספונסיבי המותאם לעבודה מכל מכשיר
            </p>
          </div>
          <div className="card-hover text-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">מבחנים אינטראקטיביים</h3>
            <p className="text-gray-600">
              מערכת מבחנים מתקדמת בסגנון צ'אט
            </p>
          </div>
        </div>

        {/* Learning Materials Section */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            חומרי לימוד
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Lessons */}
            <div className="card-hover animate-slide-up" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-600" />
                  שיעורי וידאו
                </h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{lessons.filter(l => l.videoUrl).length} שיעורים</span>
              </div>
              {lessons.filter(l => l.videoUrl).length === 0 ? (
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
                  <p className="text-gray-500">אין שיעורי וידאו כרגע</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.filter(l => l.videoUrl).map((lesson) => (
                    <div key={lesson.id} className="bg-gray-50 rounded-xl p-4">
                      <h5 className="font-medium mb-2">{lesson.title}</h5>
                      {lesson.description && <p className="text-sm text-gray-600 mb-3">{lesson.description}</p>}
                      <a
                        href={lesson.videoUrl || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        צפה בשיעור
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Downloadable Materials */}
            <div className="card-hover animate-slide-up" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  קבצים להורדה
                </h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{materials.length} קבצים</span>
              </div>
              {materials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">אין קבצים להורדה כרגע</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {materials.map((material) => (
                    <li key={material.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:from-gray-100 hover:to-gray-50 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 font-bold text-sm">{material.fileType.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{material.title}</p>
                          <p className="text-sm text-gray-500">{(material.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
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
      <footer className="glass mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            © 2024 מערכת למידה ומבחנים. כל הזכויות שמורות.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
