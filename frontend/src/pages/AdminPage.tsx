import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Save, X, LogOut, Shield, CheckCircle, Circle } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  answers: string[];
  correctIdx: number;
}

interface Exam {
  id: string;
  title: string;
  isRandom: boolean;
  questions: Question[];
}

const AdminPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    answers: ['', '', '', ''],
    correctIdx: 0,
  });

  const handleCreateExam = () => {
    if (!newExamTitle.trim()) return;
    
    const newExam: Exam = {
      id: Date.now().toString(),
      title: newExamTitle,
      isRandom: false,
      questions: [],
    };
    
    setExams([...exams, newExam]);
    setNewExamTitle('');
    setShowCreateModal(false);
  };

  const handleAddQuestion = () => {
    if (!selectedExam || !newQuestion.text.trim()) return;
    
    const question: Question = {
      id: Date.now().toString(),
      text: newQuestion.text,
      answers: newQuestion.answers,
      correctIdx: newQuestion.correctIdx,
    };
    
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
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!selectedExam) return;
    
    const updatedExam = {
      ...selectedExam,
      questions: selectedExam.questions.filter(q => q.id !== questionId),
    };
    
    setExams(exams.map(e => e.id === selectedExam.id ? updatedExam : e));
    setSelectedExam(updatedExam);
  };

  const handleDeleteExam = (examId: string) => {
    setExams(exams.filter(e => e.id !== examId));
    if (selectedExam?.id === examId) {
      setSelectedExam(null);
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

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
                        onChange={(e) => {
                          const updatedExam = {
                            ...selectedExam,
                            isRandom: e.target.checked,
                          };
                          setExams(exams.map(ex => ex.id === selectedExam.id ? updatedExam : ex));
                          setSelectedExam(updatedExam);
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
                                onClick={() => handleDeleteQuestion(question.id)}
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
                  <h3 className="text-xl font-bold mb-4">טוקנים למבחן</h3>
                  <button
                    onClick={() => {
                      // This would normally call the API to generate tokens
                      alert('פונקציונליות זו דורשת חיבור למסד נתונים');
                    }}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    צור טוקנים חדשים
                  </button>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    דורש חיבור למסד נתונים
                  </p>
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
    </div>
  );
};

export default AdminPage;
