import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, LogOut, Shield, CheckCircle, Circle, Download, Download as DownloadIcon, FileText, Video, Music } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { adminService, Exam } from '../services/admin';
import { authService } from '../services/auth';
import { materialsService, Lesson } from '../services/materials';

const AdminPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => !!localStorage.getItem('authToken'));
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [systemMessage, setSystemMessage] = useState('');
  const [newExamTitle, setNewExamTitle] = useState('');
  const [bulkTokenCount, setBulkTokenCount] = useState(1);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    answers: ['', '', '', ''],
    correctIdx: 0,
  });

  // Lessons and Materials state
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    videoUrl: '',
    audioUrl: '',
    order: 0,
  });
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    fileUrl: '',
    fileType: 'pdf',
    fileSize: 0,
    lessonId: '',
  });

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'exams' | 'lessons'>('exams');

  // Load exams from backend on mount
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const loadExams = async () => {
      try {
        const data = await adminService.getAllExams();
        setExams(data);
      } catch (error) {
        console.error('Failed to load exams:', error);
        setIsAdminAuthenticated(false);
        authService.logout();
      }
    };
    loadExams();

    const loadLessons = async () => {
      try {
        const data = await materialsService.getAllLessons();
        setLessons(data);
      } catch (error) {
        console.error('Failed to load lessons:', error);
      }
    };
    loadLessons();
  }, [isAdminAuthenticated]);

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAdminLoginError('');

    try {
      const result = await authService.adminLogin(adminPassword);
      authService.saveAuth(result.token, result.user);
      setIsAdminAuthenticated(true);
      setAdminPassword('');
    } catch (error) {
      console.error('Failed to login as admin:', error);
      setAdminLoginError('סיסמה שגויה');
    }
  };

  const handleCreateExam = async () => {
    if (!newExamTitle.trim()) return;
    
    try {
      const newExam = await adminService.createExam({
        title: newExamTitle,
        description: '',
        questions: [],
      });
      setExams([...exams, newExam]);
      setNewExamTitle('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create exam:', error);
      alert('נכשל ביצירת מבחן');
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedExam || !newQuestion.text.trim()) return;
    
    try {
      const question = await adminService.addQuestion(selectedExam.id, newQuestion);
      const updatedExam = {
        ...selectedExam,
        questions: [...selectedExam.questions, question],
      };
      
      setExams(exams.map(e => e.id === selectedExam.id ? updatedExam : e));
      setSelectedExam(updatedExam);
      setNewQuestion({
        text: '',
        answers: ['', '', '', ''],
        correctIdx: 0,
      });
    } catch (error) {
      console.error('Failed to add question:', error);
      alert('נכשל בהוספת שאלה');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedExam) return;
    
    try {
      await adminService.deleteQuestion(questionId);
      const updatedExam = {
        ...selectedExam,
        questions: selectedExam.questions.filter(q => q.id !== questionId),
      };
      
      setExams(exams.map(e => e.id === selectedExam.id ? updatedExam : e));
      setSelectedExam(updatedExam);
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('נכשל במחיקת שאלה');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      await adminService.deleteExam(examId);
      setExams(exams.filter(e => e.id !== examId));
      if (selectedExam?.id === examId) {
        setSelectedExam(null);
      }
    } catch (error) {
      console.error('Failed to delete exam:', error);
      alert('נכשל במחיקת מבחן');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAdminAuthenticated(false);
    navigate('/');
  };

  // Lessons management
  const handleCreateLesson = async () => {
    if (!newLesson.title.trim()) return;

    try {
      const lesson = await materialsService.createLesson(newLesson);
      setLessons([...lessons, lesson]);
      setNewLesson({ title: '', description: '', videoUrl: '', audioUrl: '', order: 0 });
      setShowLessonModal(false);
      setSystemMessage('שיעור חדש נוצר בהצלחה');
    } catch (error) {
      console.error('Failed to create lesson:', error);
      setSystemMessage('נכשל ביצירת שיעור');
    }
  };

  const handleUpdateLesson = async (id: string, data: any) => {
    try {
      const updatedLesson = await materialsService.updateLesson(id, data);
      setLessons(lessons.map(l => l.id === id ? updatedLesson : l));
      if (selectedLesson?.id === id) setSelectedLesson(updatedLesson);
      setSystemMessage('שיעור עודכן בהצלחה');
    } catch (error) {
      console.error('Failed to update lesson:', error);
      setSystemMessage('נכשל בעדכון שיעור');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await materialsService.deleteLesson(id);
      setLessons(lessons.filter(l => l.id !== id));
      if (selectedLesson?.id === id) setSelectedLesson(null);
      setSystemMessage('שיעור נמחק בהצלחה');
    } catch (error) {
      console.error('Failed to delete lesson:', error);
      setSystemMessage('נכשל במחיקת שיעור');
    }
  };

  // Materials management
  const handleCreateMaterial = async () => {
    if (!newMaterial.title.trim() || !newMaterial.fileUrl.trim()) return;

    try {
      const material = await materialsService.createMaterial(newMaterial);
      if (selectedLesson) {
        const updatedLesson = {
          ...selectedLesson,
          materials: [...selectedLesson.materials, material],
        };
        setLessons(lessons.map(l => l.id === selectedLesson.id ? updatedLesson : l));
        setSelectedLesson(updatedLesson);
      }
      setNewMaterial({ title: '', fileUrl: '', fileType: 'pdf', fileSize: 0, lessonId: '' });
      setShowMaterialModal(false);
      setSystemMessage('חומר חדש נוצר בהצלחה');
    } catch (error) {
      console.error('Failed to create material:', error);
      setSystemMessage('נכשל ביצירת חומר');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await materialsService.deleteMaterial(id);
      if (selectedLesson) {
        const updatedLesson = {
          ...selectedLesson,
          materials: selectedLesson.materials.filter(m => m.id !== id),
        };
        setLessons(lessons.map(l => l.id === selectedLesson.id ? updatedLesson : l));
        setSelectedLesson(updatedLesson);
      }
      setSystemMessage('חומר נמחק בהצלחה');
    } catch (error) {
      console.error('Failed to delete material:', error);
      setSystemMessage('נכשל במחיקת חומר');
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleAdminLogin} className="card max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">כניסת מנהל</h1>
            <p className="text-gray-500 mt-2">הזן סיסמת מנהל כדי להמשיך</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          {adminLoginError && (
            <div className="text-red-600 text-sm text-center">{adminLoginError}</div>
          )}

          <button type="submit" className="btn-primary w-full">
            כניסה
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">ממשק ניהול</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                חזרה לאתר
              </button>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'exams' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  מבחנים
                </button>
                <button
                  onClick={() => setActiveTab('lessons')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'lessons' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  שיעורים
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'exams' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Exams List */}
            <div className="lg:col-span-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">מבחנים</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary p-2"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className={`card-hover cursor-pointer transition-all duration-200 ${
                    selectedExam?.id === exam.id
                      ? 'ring-2 ring-blue-500 bg-blue-50/50'
                      : ''
                  }`}
                  onClick={() => setSelectedExam(exam)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{exam.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExam(exam.id);
                      }}
                      className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">{exam.questions.length} שאלות</p>
                  {exam.isRandom && (
                    <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      מעורבב
                    </span>
                  )}
                </div>
              ))}

              {exams.length === 0 && (
                <div className="card text-center py-8">
                  <p className="text-gray-500 mb-4">אין מבחנים עדיין</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                  >
                    צור מבחן חדש
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Exam Details */}
          <div className="lg:col-span-2">
            {selectedExam ? (
              <div className="space-y-6">
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">{selectedExam.title}</h2>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExam.isRandom}
                        onChange={async (e) => {
                          try {
                            const updatedExam = await adminService.updateExam(selectedExam.id, { isRandom: e.target.checked });
                            setExams(exams.map(ex => ex.id === selectedExam.id ? updatedExam : ex));
                            setSelectedExam(updatedExam);
                          } catch (error) {
                            console.error('Failed to update exam:', error);
                            alert('נכשל בעדכון מבחן');
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">מעורבב</span>
                    </label>
                  </div>

                  {/* Add Question */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold mb-4">הוסף שאלה</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          טקסט השאלה
                        </label>
                        <input
                          type="text"
                          value={newQuestion.text}
                          onChange={(e) =>
                            setNewQuestion({ ...newQuestion, text: e.target.value })
                          }
                          placeholder="הכנס שאלה"
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          תשובות
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {newQuestion.answers.map((answer, idx) => (
                            <div key={idx} className="relative">
                              <input
                                type="text"
                                value={answer}
                                onChange={(e) => {
                                  const newAnswers = [...newQuestion.answers];
                                  newAnswers[idx] = e.target.value;
                                  setNewQuestion({ ...newQuestion, answers: newAnswers });
                                }}
                                placeholder={`תשובה ${idx + 1}`}
                                className="input-field pr-10"
                              />
                              {newQuestion.correctIdx === idx && (
                                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                              )}
                              <button
                                onClick={() =>
                                  setNewQuestion({ ...newQuestion, correctIdx: idx })
                                }
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-500 transition-colors"
                                title="סמן כתשובה נכונה"
                              >
                                <Circle className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleAddQuestion}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        הוסף שאלה
                      </button>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div>
                    <h3 className="font-semibold mb-4">שאלות ({selectedExam.questions.length})</h3>
                    {selectedExam.questions.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">אין שאלות עדיין</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedExam.questions.map((question, idx) => (
                          <div key={question.id} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm text-gray-500">שאלה {idx + 1}</span>
                              <button
                                onClick={() => question.id && handleDeleteQuestion(question.id)}
                                className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="font-medium mb-2">{question.text}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {question.answers.map((answer, aIdx) => (
                                <div
                                  key={aIdx}
                                  className={`p-2 rounded ${
                                    question.correctIdx === aIdx
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-white'
                                  }`}
                                >
                                  {aIdx + 1}. {answer}
                                  {question.correctIdx === aIdx && ' ✓'}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate Tokens */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">טוקנים למבחן</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={bulkTokenCount}
                        onChange={(e) => setBulkTokenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                      />
                      <button
                        onClick={async () => {
                          try {
                            const tokens = await adminService.createBulkTokens({ examId: selectedExam.id, count: bulkTokenCount });
                            const updatedExam = {
                              ...selectedExam,
                              tokens: [...(selectedExam.tokens || []), ...tokens],
                            };
                            setExams(exams.map(ex => ex.id === selectedExam.id ? updatedExam : ex));
                            setSelectedExam(updatedExam);
                            setSystemMessage(`נוצרו ${bulkTokenCount} טוקנים חדשים`);
                          } catch (error) {
                            console.error('Failed to create bulk tokens:', error);
                            setSystemMessage('נכשל ביצירת טוקנים');
                          }
                        }}
                        className="btn-primary flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        צור טוקנים
                      </button>
                      {(selectedExam.tokens || []).length > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              await adminService.downloadAllQRCodes(selectedExam.id, selectedExam.title);
                              setSystemMessage('הורדת כל ה-QR codes התחילה');
                            } catch (error) {
                              console.error('Failed to download all QR codes:', error);
                              setSystemMessage('נכשל בהורדת QR codes');
                            }
                          }}
                          className="btn-secondary flex items-center justify-center gap-2"
                          title="הורד את כל קודי ה-QR"
                        >
                          <DownloadIcon className="w-5 h-5" />
                          הורד הכל
                        </button>
                      )}
                    </div>
                  </div>

                  {systemMessage && (
                    <div className="mb-4 rounded-xl bg-blue-50 text-blue-700 px-4 py-3 text-sm">
                      {systemMessage}
                    </div>
                  )}

                  <div className="space-y-2">
                    {(selectedExam.tokens || []).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">אין טוקנים למבחן הזה עדיין</p>
                    ) : (
                      (selectedExam.tokens || []).map((token) => (
                        <div key={token.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                          <div className="flex items-center gap-4">
                            <QRCodeCanvas value={token.tokenCode} size={60} level="H" />
                            <div>
                              <div className="font-mono text-lg font-bold tracking-wider">{token.tokenCode}</div>
                              <div className="text-xs text-gray-500">
                                {token.usedAt ? `נוצל בתאריך ${new Date(token.usedAt).toLocaleString('he-IL')}` : 'עדיין לא נוצל'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-3 py-1 rounded-full ${token.isUsed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {token.isUsed ? 'נוצל' : 'זמין'}
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  await adminService.downloadTokenQR(token.id);
                                  setSystemMessage(`הורדת QR עבור טוקן ${token.tokenCode}`);
                                } catch (error) {
                                  console.error('Failed to download QR:', error);
                                  setSystemMessage('נכשל בהורדת QR');
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="הורד QR code"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-16">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  בחר מבחן לעריכה
                </h3>
                <p className="text-gray-500">
                  או צור מבחן חדש כדי להתחיל
                </p>
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lessons List */}
            <div className="lg:col-span-1">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">שיעורים</h2>
                <button
                  onClick={() => setShowLessonModal(true)}
                  className="btn-primary p-2"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className={`card-hover cursor-pointer transition-all duration-200 ${
                      selectedLesson?.id === lesson.id
                        ? 'ring-2 ring-blue-500 bg-blue-50/50'
                        : ''
                    }`}
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{lesson.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLesson(lesson.id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">{lesson.materials.length} חומרים</p>
                    {lesson.videoUrl && (
                      <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <Video className="w-3 h-3 inline mr-1" />
                        וידאו
                      </span>
                    )}
                    {lesson.audioUrl && (
                      <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mr-2">
                        <Music className="w-3 h-3 inline mr-1" />
                        אודיו
                      </span>
                    )}
                  </div>
                ))}

                {lessons.length === 0 && (
                  <div className="card text-center py-8">
                    <p className="text-gray-500 mb-4">אין שיעורים עדיין</p>
                    <button
                      onClick={() => setShowLessonModal(true)}
                      className="btn-primary"
                    >
                      צור שיעור חדש
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lesson Details */}
            <div className="lg:col-span-2">
              {selectedLesson ? (
                <div className="space-y-6">
                  <div className="card">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">{selectedLesson.title}</h2>
                    </div>

                    {selectedLesson.description && (
                      <p className="text-gray-600 mb-4">{selectedLesson.description}</p>
                    )}

                    {/* Media URLs */}
                    <div className="space-y-4 mb-6">
                      {selectedLesson.videoUrl && (
                        <div className="bg-blue-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">קישור לוידאו</span>
                          </div>
                          <input
                            type="text"
                            value={selectedLesson.videoUrl}
                            onChange={(e) => handleUpdateLesson(selectedLesson.id, { videoUrl: e.target.value })}
                            className="input-field w-full"
                          />
                        </div>
                      )}

                      {selectedLesson.audioUrl && (
                        <div className="bg-green-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Music className="w-5 h-5 text-green-600" />
                            <span className="font-medium">קישור לאודיו</span>
                          </div>
                          <input
                            type="text"
                            value={selectedLesson.audioUrl}
                            onChange={(e) => handleUpdateLesson(selectedLesson.id, { audioUrl: e.target.value })}
                            className="input-field w-full"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateLesson(selectedLesson.id, { videoUrl: prompt('הכנס קישור לוידאו:') || '' })}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          הוסף וידאו
                        </button>
                        <button
                          onClick={() => handleUpdateLesson(selectedLesson.id, { audioUrl: prompt('הכנס קישור לאודיו:') || '' })}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                          <Music className="w-4 h-4" />
                          הוסף אודיו
                        </button>
                      </div>
                    </div>

                    {/* Materials */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">חומרים ({selectedLesson.materials.length})</h3>
                        <button
                          onClick={() => {
                            setNewMaterial({ ...newMaterial, lessonId: selectedLesson.id });
                            setShowMaterialModal(true);
                          }}
                          className="btn-primary flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          הוסף חומר
                        </button>
                      </div>

                      {selectedLesson.materials.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">אין חומרים לשיעור הזה עדיין</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedLesson.materials.map((material) => (
                            <div key={material.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-red-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{material.title}</p>
                                    <p className="text-sm text-gray-500">{material.fileType.toUpperCase()}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={material.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="פתח קובץ"
                                  >
                                    <Download className="w-5 h-5" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="מחק חומר"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-16">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    בחר שיעור לעריכה
                  </h3>
                  <p className="text-gray-500">
                    או צור שיעור חדש כדי להתחיל
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-md w-full animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">צור מבחן חדש</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כותרת המבחן
                </label>
                <input
                  type="text"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  placeholder="הכנס כותרת"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateExam}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  צור
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-md w-full animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">צור שיעור חדש</h3>
              <button
                onClick={() => setShowLessonModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כותרת השיעור
                </label>
                <input
                  type="text"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  placeholder="הכנס כותרת"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תיאור
                </label>
                <textarea
                  value={newLesson.description}
                  onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                  placeholder="הכנס תיאור"
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateLesson}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  צור
                </button>
                <button
                  onClick={() => setShowLessonModal(false)}
                  className="btn-secondary flex-1"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-md w-full animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">הוסף חומר חדש</h3>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כותרת החומר
                </label>
                <input
                  type="text"
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  placeholder="הכנס כותרת"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קישור לקובץ
                </label>
                <input
                  type="text"
                  value={newMaterial.fileUrl}
                  onChange={(e) => setNewMaterial({ ...newMaterial, fileUrl: e.target.value })}
                  placeholder="הכנס קישור לקובץ"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוג קובץ
                </label>
                <select
                  value={newMaterial.fileType}
                  onChange={(e) => setNewMaterial({ ...newMaterial, fileType: e.target.value })}
                  className="input-field"
                >
                  <option value="pdf">PDF</option>
                  <option value="doc">DOC</option>
                  <option value="docx">DOCX</option>
                  <option value="ppt">PPT</option>
                  <option value="pptx">PPTX</option>
                  <option value="zip">ZIP</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateMaterial}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  הוסף
                </button>
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="btn-secondary flex-1"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
