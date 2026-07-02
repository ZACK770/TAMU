import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, LogOut, Shield, CheckCircle, Circle, Download, Download as DownloadIcon, FileText, Video, Music } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { adminService, Exam } from '../services/admin';
import { authService } from '../services/auth';
import { materialsService, Lesson, StudyProgram } from '../services/materials';
import { benefitsService, BenefitAdmin } from '../services/benefits';
import { redemptionsService, RedemptionAdmin } from '../services/redemptions';
import { DataTable } from '../components/DataTable';

const APP_BASE_URL = 'https://tamu-6suv.onrender.com';
const buildExamUrl = (tokenCode: string) => `${APP_BASE_URL}/exam?token=${encodeURIComponent(tokenCode)}`;

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
  const [newExamStudyProgramId, setNewExamStudyProgramId] = useState('');
  const [bulkTokenCount, setBulkTokenCount] = useState(1);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    answers: ['', '', '', ''],
    correctIdx: 0,
  });

  // Lessons and Materials state
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [newProgramTitle, setNewProgramTitle] = useState('');
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
    studyProgramId: '',
    weekDate: '',
  });
  
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    fileUrl: '',
    fileType: 'pdf',
    fileSize: 0,
    lessonId: '',
  });

  // Benefits and Redemptions state
  const [benefits, setBenefits] = useState<BenefitAdmin[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionAdmin[]>([]);
  const [newBenefit, setNewBenefit] = useState({
    title: '',
    description: '',
    costPoints: 0,
    category: '',
    imageUrl: '',
    maxUses: '',
    validFrom: '',
    validUntil: '',
  });
  const [showBenefitModal, setShowBenefitModal] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'exams' | 'lessons' | 'benefits' | 'redemptions' | 'students'>('exams');
  
  // Exam sub-tabs
  const [examSubTab, setExamSubTab] = useState<'management' | 'tokens' | 'scores'>('management');
  
  // Benefit search
  const [benefitSearch, setBenefitSearch] = useState('');

  const refreshStudyPrograms = async () => {
    const programs = await materialsService.getStudyPrograms();
    setStudyPrograms(programs);
  };

  const loadBenefits = async () => {
    try {
      const data = await benefitsService.getAll();
      setBenefits(data);
    } catch (error) {
      console.error('Failed to load benefits:', error);
    }
  };

  const loadRedemptions = async () => {
    try {
      const data = await redemptionsService.getAllRedemptions();
      setRedemptions(data);
    } catch (error) {
      console.error('Failed to load redemptions:', error);
    }
  };

  // Load data from backend on mount
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
    refreshStudyPrograms();
    loadBenefits();
    loadRedemptions();
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
        studyProgramId: newExamStudyProgramId || undefined,
      });
      setExams([...exams, newExam]);
      setNewExamTitle('');
      setNewExamStudyProgramId('');
      setShowCreateModal(false);
      setSystemMessage('המבחן נוצר בהצלחה');
    } catch (error) {
      console.error('Failed to create exam:', error);
      setSystemMessage('נכשל ביצירת מבחן');
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

      setExams(Array.isArray(exams) ? exams.map(e => e.id === selectedExam.id ? updatedExam : e) : []);
      setSelectedExam(updatedExam);
      setNewQuestion({
        text: '',
        answers: ['', '', '', ''],
        correctIdx: 0,
      });
      setSystemMessage('שאלה נוספה בהצלחה');
    } catch (error) {
      console.error('Failed to add question:', error);
      setSystemMessage('נכשל בהוספת שאלה');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedExam) return;
    
    try {
      await adminService.deleteQuestion(questionId);
      const updatedExam = {
        ...selectedExam,
        questions: Array.isArray(selectedExam.questions) ? selectedExam.questions.filter(q => q.id !== questionId) : [],
      };

      setExams(Array.isArray(exams) ? exams.map(e => e.id === selectedExam.id ? updatedExam : e) : []);
      setSelectedExam(updatedExam);
      setSystemMessage('שאלה נמחקה בהצלחה');
    } catch (error) {
      console.error('Failed to delete question:', error);
      setSystemMessage('נכשל במחיקת שאלה');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      await adminService.deleteExam(examId);
      setExams(Array.isArray(exams) ? exams.filter(e => e.id !== examId) : []);
      if (selectedExam?.id === examId) {
        setSelectedExam(null);
      }
      setSystemMessage('מבחן נמחק בהצלחה');
    } catch (error) {
      console.error('Failed to delete exam:', error);
      setSystemMessage('נכשל במחיקת מבחן');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAdminAuthenticated(false);
    navigate('/');
  };

  const handleCreateStudyProgram = async () => {
    if (!newProgramTitle.trim()) return;
    try {
      const program = await materialsService.createStudyProgram({ title: newProgramTitle });
      setStudyPrograms([...studyPrograms, program]);
      setNewProgramTitle('');
      setSystemMessage('תכנית לימוד נוצרה בהצלחה');
    } catch (error) {
      console.error('Failed to create study program:', error);
      setSystemMessage('נכשל ביצירת תכנית לימוד');
    }
  };

  const handleUpdateExamRewards = async (rewardRules = selectedExam?.rewardRules || [], benefits = selectedExam?.benefits || []) => {
    if (!selectedExam) return;
    try {
      const updatedExam = await adminService.updateExam(selectedExam.id, { rewardRules, benefits });
      setExams(Array.isArray(exams) ? exams.map(e => e.id === selectedExam.id ? updatedExam : e) : []);
      setSelectedExam(updatedExam);
      setSystemMessage('הגדרות הניקוד עודכנו');
    } catch (error) {
      console.error('Failed to update rewards:', error);
      setSystemMessage('נכשל בעדכון הגדרות הניקוד');
    }
  };

  // Lessons management
  const handleCreateLesson = async () => {
    if (!newLesson.title.trim()) return;

    try {
      const lesson = await materialsService.createLesson(newLesson);
      setLessons([...lessons, lesson]);
      setNewLesson({ title: '', description: '', videoUrl: '', audioUrl: '', order: 0, studyProgramId: '', weekDate: '' });
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
      setLessons(Array.isArray(lessons) ? lessons.map(l => l.id === id ? updatedLesson : l) : []);
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
      setLessons(Array.isArray(lessons) ? lessons.filter(l => l.id !== id) : []);
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
        setLessons(Array.isArray(lessons) ? lessons.map(l => l.id === selectedLesson.id ? updatedLesson : l) : []);
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
          materials: Array.isArray(selectedLesson.materials) ? selectedLesson.materials.filter(m => m.id !== id) : [],
        };
        setLessons(Array.isArray(lessons) ? lessons.map(l => l.id === selectedLesson.id ? updatedLesson : l) : []);
        setSelectedLesson(updatedLesson);
      }
      setSystemMessage('חומר נמחק בהצלחה');
    } catch (error) {
      console.error('Failed to delete material:', error);
      setSystemMessage('נכשל במחיקת חומר');
    }
  };

  // Benefits management
  const handleCreateBenefit = async () => {
    if (!newBenefit.title.trim() || !newBenefit.costPoints) return;
    try {
      const benefit = await benefitsService.create({
        title: newBenefit.title,
        description: newBenefit.description,
        costPoints: Number(newBenefit.costPoints),
        category: newBenefit.category,
        imageUrl: newBenefit.imageUrl,
        maxUses: newBenefit.maxUses ? Number(newBenefit.maxUses) : undefined,
        validFrom: newBenefit.validFrom || undefined,
        validUntil: newBenefit.validUntil || undefined,
      });
      setBenefits([...benefits, benefit]);
      setNewBenefit({ title: '', description: '', costPoints: 0, category: '', imageUrl: '', maxUses: '', validFrom: '', validUntil: '' });
      setShowBenefitModal(false);
      setSystemMessage('הטבה חדשה נוצרה בהצלחה');
    } catch (error) {
      console.error('Failed to create benefit:', error);
      setSystemMessage('נכשל ביצירת הטבה');
    }
  };

  const handleUpdateBenefit = async (id: string, data: any) => {
    try {
      const updatedBenefit = await benefitsService.update(id, data);
      setBenefits(Array.isArray(benefits) ? benefits.map(b => b.id === id ? updatedBenefit : b) : []);
      setSystemMessage('הטבה עודכנה בהצלחה');
    } catch (error) {
      console.error('Failed to update benefit:', error);
      setSystemMessage('נכשל בעדכון הטבה');
    }
  };

  const handleDeleteBenefit = async (id: string) => {
    try {
      await benefitsService.delete(id);
      setBenefits(Array.isArray(benefits) ? benefits.filter(b => b.id !== id) : []);
      setSystemMessage('הטבה נמחקה בהצלחה');
    } catch (error) {
      console.error('Failed to delete benefit:', error);
      setSystemMessage('נכשל במחיקת הטבה');
    }
  };

  // Redemptions management
  const handleProcessRedemption = async (redemptionId: string, status: string, notes?: string) => {
    try {
      await redemptionsService.processRedemption(redemptionId, { status: status as 'approved' | 'rejected', notes });
      loadRedemptions();
      setSystemMessage(`המימוש ${status === 'approved' ? 'אושר' : 'נדחה'} בהצלחה`);
    } catch (error) {
      console.error('Failed to process redemption:', error);
      setSystemMessage('נכשל בעיבוד המימוש');
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleAdminLogin} className="card max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-bold">כניסת מנהל</h1>
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
            <div className="text-slate-600 text-sm text-center">{adminLoginError}</div>
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
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-bold">ממשק ניהול</h1>
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
                    activeTab === 'exams' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  מבחנים
                </button>
                <button
                  onClick={() => setActiveTab('lessons')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'lessons' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  שיעורים
                </button>
                <button
                  onClick={() => setActiveTab('benefits')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'benefits' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  הטבות
                </button>
                <button
                  onClick={() => setActiveTab('redemptions')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'redemptions' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  מימושים
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'students' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  תלמידים
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {systemMessage && (
          <div className="mb-6 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm flex justify-between items-center">
            <span>{systemMessage}</span>
            <button onClick={() => setSystemMessage('')} className="text-gray-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">תכניות לימוד</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newProgramTitle}
              onChange={(e) => setNewProgramTitle(e.target.value)}
              placeholder="שם תכנית לימוד חדשה"
              className="input-field flex-1"
            />
            <button onClick={handleCreateStudyProgram} className="btn-primary">צור תכנית</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(studyPrograms) && studyPrograms.map((program) => (
              <span key={program.id} className="px-3 py-1 rounded-full bg-slate-50 text-slate-900 text-sm">{program.title}</span>
            ))}
          </div>
        </div>

        {}
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
                {Array.isArray(exams) && exams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`card-hover cursor-pointer transition-all duration-200 ${
                      selectedExam?.id === exam.id
                        ? 'ring-2 ring-slate-900 bg-slate-50'
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
                        className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">{Array.isArray(exam.questions) ? exam.questions.length : 0} שאלות</p>
                    {exam.isRandom && (
                      <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        מעורבב
                      </span>
                    )}
                  </div>
                ))}

                {(!Array.isArray(exams) || exams.length === 0) && (
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

            {}
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
                              setSystemMessage('נכשל בעדכון מבחן');
                            }
                          }}
                          className="w-4 h-4 text-slate-900 rounded"
                        />
                        <span className="text-sm">מעורבב</span>
                      </label>
                    </div>

                    {/* Exam Sub-tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                      <button
                        onClick={() => setExamSubTab('management')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          examSubTab === 'management' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ניהול מבחן
                      </button>
                      <button
                        onClick={() => setExamSubTab('tokens')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          examSubTab === 'tokens' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ניהול טוקנים
                      </button>
                      <button
                        onClick={() => setExamSubTab('scores')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          examSubTab === 'scores' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ניהול ניקוד
                      </button>
                    </div>

                    {/* Management Tab */}
                    {examSubTab === 'management' && (
                      <div className="space-y-6">
                        <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">שיוך לתכנית לימוד</label>
                            <select
                              value={selectedExam.studyProgramId || ''}
                              onChange={async (e) => {
                                const updatedExam = await adminService.updateExam(selectedExam.id, { studyProgramId: e.target.value || null });
                                setExams(Array.isArray(exams) ? exams.map(ex => ex.id === selectedExam.id ? updatedExam : ex) : []);
                                setSelectedExam(updatedExam);
                              }}
                              className="input-field"
                            >
                              <option value="">ללא תכנית</option>
                              {Array.isArray(studyPrograms) && studyPrograms.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
                            </select>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-3">מדרגות ניקוד</h3>
                            <div className="space-y-2">
                              {Array.isArray(selectedExam.rewardRules) && selectedExam.rewardRules.map((rule, idx) => (
                                <div key={idx} className="grid grid-cols-3 gap-2">
                                  <input type="number" value={rule.minScore} onChange={(e) => {
                                    const rewardRules = [...(selectedExam.rewardRules || [])];
                                    rewardRules[idx] = { ...rule, minScore: Number(e.target.value) };
                                    setSelectedExam({ ...selectedExam, rewardRules });
                                  }} className="input-field" placeholder="מציון" />
                                  <input type="number" value={rule.points} onChange={(e) => {
                                    const rewardRules = [...(selectedExam.rewardRules || [])];
                                    rewardRules[idx] = { ...rule, points: Number(e.target.value) };
                                    setSelectedExam({ ...selectedExam, rewardRules });
                                  }} className="input-field" placeholder="נקודות" />
                                  <button onClick={() => handleUpdateExamRewards((selectedExam.rewardRules || []).filter((_, ruleIdx) => ruleIdx !== idx))} className="btn-secondary">מחק</button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => setSelectedExam({ ...selectedExam, rewardRules: [...(selectedExam.rewardRules || []), { minScore: 80, points: 10 }] })} className="btn-secondary">הוסף מדרגה</button>
                              <button onClick={() => handleUpdateExamRewards()} className="btn-primary">שמור ניקוד</button>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-3">הטבות למימוש</h3>
                            <div className="space-y-2">
                              {Array.isArray(selectedExam.benefits) && selectedExam.benefits.map((benefit, idx) => (
                                <div key={idx} className="grid grid-cols-4 gap-2">
                                  <input value={benefit.title} onChange={(e) => {
                                    const benefits = [...(selectedExam.benefits || [])];
                                    benefits[idx] = { ...benefit, title: e.target.value };
                                    setSelectedExam({ ...selectedExam, benefits });
                                  }} className="input-field" placeholder="שם הטבה" />
                                  <input value={benefit.description || ''} onChange={(e) => {
                                    const benefits = [...(selectedExam.benefits || [])];
                                    benefits[idx] = { ...benefit, description: e.target.value };
                                    setSelectedExam({ ...selectedExam, benefits });
                                  }} className="input-field" placeholder="תיאור" />
                                  <input type="number" value={benefit.costPoints} onChange={(e) => {
                                    const benefits = [...(selectedExam.benefits || [])];
                                    benefits[idx] = { ...benefit, costPoints: Number(e.target.value) };
                                    setSelectedExam({ ...selectedExam, benefits });
                                  }} className="input-field" placeholder="עלות" />
                                  <button onClick={() => handleUpdateExamRewards(undefined, (selectedExam.benefits || []).filter((_, benefitIdx) => benefitIdx !== idx))} className="btn-secondary">מחק</button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => setSelectedExam({ ...selectedExam, benefits: [...(selectedExam.benefits || []), { title: '', description: '', costPoints: 10 }] })} className="btn-secondary">הוסף הטבה</button>
                              <button onClick={() => handleUpdateExamRewards()} className="btn-primary">שמור הטבות</button>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-3">הטבות מותרות למימוש</h3>
                            <div className="mb-3">
                              <input
                                type="text"
                                value={benefitSearch}
                                onChange={(e) => setBenefitSearch(e.target.value)}
                                placeholder="חפש הטבה..."
                                className="input-field w-full"
                              />
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {Array.isArray(benefits) && benefits
                                .filter(b => !benefitSearch || b.title.toLowerCase().includes(benefitSearch.toLowerCase()))
                                .map((benefit) => {
                                  const isAllowed = selectedExam.allowedBenefits?.some(ab => ab.benefitId === benefit.id);
                                  return (
                                    <div key={benefit.id} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                                      <input
                                        type="checkbox"
                                        checked={isAllowed}
                                        onChange={async () => {
                                          const currentAllowedIds = selectedExam.allowedBenefits?.map(ab => ab.benefitId) || [];
                                          const newAllowedIds = isAllowed
                                            ? currentAllowedIds.filter(id => id !== benefit.id)
                                            : [...currentAllowedIds, benefit.id];
                                          try {
                                            const updatedExam = await adminService.updateExamAllowedBenefits(selectedExam.id, newAllowedIds);
                                            setExams(Array.isArray(exams) ? exams.map(ex => ex.id === selectedExam.id ? updatedExam : ex) : []);
                                            setSelectedExam(updatedExam);
                                          } catch (error) {
                                            console.error('Failed to update allowed benefits:', error);
                                            setSystemMessage('נכשל בעדכון הטבות מותרות');
                                          }
                                        }}
                                        className="w-4 h-4 text-slate-900 rounded"
                                      />
                                      <div className="flex-1">
                                        <span className="font-medium">{benefit.title}</span>
                                        <span className="text-sm text-gray-500 mr-2">({benefit.costPoints} נקודות)</span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">השאר ריק כדי לאפשר את כל ההטבות</p>
                          </div>
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
                                {Array.isArray(newQuestion.answers) && newQuestion.answers.map((answer, idx) => (
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
                                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 w-5 h-5" />
                                    )}
                                    <button
                                      onClick={() =>
                                        setNewQuestion({ ...newQuestion, correctIdx: idx })
                                      }
                                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-900 transition-colors"
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
                          <h3 className="font-semibold mb-4">שאלות ({Array.isArray(selectedExam.questions) ? selectedExam.questions.length : 0})</h3>
                          {(!Array.isArray(selectedExam.questions) || selectedExam.questions.length === 0) ? (
                            <p className="text-gray-500 text-center py-8">אין שאלות עדיין</p>
                          ) : (
                            <div className="space-y-3">
                              {Array.isArray(selectedExam.questions) && selectedExam.questions.map((question, idx) => (
                                <div key={question.id} className="bg-gray-50 rounded-xl p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm text-gray-500">שאלה {idx + 1}</span>
                                    <button
                                      onClick={() => question.id && handleDeleteQuestion(question.id)}
                                      className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <p className="font-medium mb-2">{question.text}</p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {Array.isArray(question.answers) && question.answers.map((answer, aIdx) => (
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
                    )}
                  </div> {/* Ends card wrapper */}

                  {}
                  {/* Tokens Tab */}
                  {examSubTab === 'tokens' && (
                    <div className="space-y-4">
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
                                  tokens: [...(Array.isArray(selectedExam.tokens) ? selectedExam.tokens : []), ...tokens],
                                };
                                setExams(Array.isArray(exams) ? exams.map(ex => ex.id === selectedExam.id ? updatedExam : ex) : []);
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
                          {Array.isArray(selectedExam.tokens) && selectedExam.tokens.length > 0 && (
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

                      {/* Cost Statistics */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-xl p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">עלות פוטנציאלית</h4>
                          <p className="text-2xl font-bold text-blue-900">
                            {(selectedExam.tokens || []).length * (selectedExam.rewardRules?.reduce((sum, r) => Math.max(sum, r.points), 0) || 0)} נקודות
                          </p>
                          <p className="text-sm text-blue-700">על סמך כל הטוקנים שהונפקו</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4">
                          <h4 className="font-semibold text-green-900 mb-2">עלות בפועל</h4>
                          <p className="text-2xl font-bold text-green-900">
                            {(selectedExam.sessions || []).reduce((sum, s) => sum + (s.earnedPoints || 0), 0)} נקודות
                          </p>
                          <p className="text-sm text-green-700">על סמך ניקוד שניתן בפועל</p>
                        </div>
                      </div>

                      {/* Token Table */}
                      {(!Array.isArray(selectedExam.tokens) || selectedExam.tokens.length === 0) ? (
                        <p className="text-sm text-gray-500 text-center py-4">אין טוקנים למבחן הזה עדיין</p>
                      ) : (
                        <DataTable
                          data={selectedExam.tokens}
                          columns={[
                            {
                              key: 'tokenCode',
                              label: 'קוד טוקן',
                              sortable: true,
                              render: (value) => <span className="font-mono font-bold">{value}</span>
                            },
                            {
                              key: 'qrCode',
                              label: 'QR',
                              sortable: false,
                              render: (_, row) => (
                                <QRCodeCanvas value={buildExamUrl(row.tokenCode)} size={40} level="H" />
                              )
                            },
                            {
                              key: 'isUsed',
                              label: 'סטטוס',
                              sortable: true,
                              render: (value) => (
                                <span className={`text-xs px-3 py-1 rounded-full ${value ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {value ? 'נוצל' : 'זמין'}
                                </span>
                              )
                            },
                            {
                              key: 'usedAt',
                              label: 'תאריך ניצול',
                              sortable: true,
                              render: (value) => value ? new Date(value).toLocaleString('he-IL') : '-'
                            },
                            {
                              key: 'actions',
                              label: 'פעולות',
                              render: (_, row) => (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await adminService.downloadTokenQR(row.id);
                                      setSystemMessage(`הורדת QR עבור טוקן ${row.tokenCode}`);
                                    } catch (error) {
                                      console.error('Failed to download QR:', error);
                                      setSystemMessage('נכשל בהורדת QR');
                                    }
                                  }}
                                  className="text-slate-900 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-lg transition-colors"
                                  title="הורד QR code"
                                >
                                  <Download className="w-5 h-5" />
                                </button>
                              )
                            }
                          ]}
                          filters={[
                            {
                              key: 'isUsed',
                              type: 'select',
                              options: [
                                { value: '', label: 'הכל' },
                                { value: 'true', label: 'נוצלו' },
                                { value: 'false', label: 'זמינים' }
                              ]
                            }
                          ]}
                          pageSize={50}
                          sortable={true}
                        />
                      )}
                    </div>
                  )}

                  {}
                  {/* Scores Tab */}
                  {examSubTab === 'scores' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold">ניקוד וסטטיסטיקות</h3>
                      
                      {/* Score Statistics */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-purple-50 rounded-xl p-4">
                          <h4 className="font-semibold text-purple-900 mb-2">סה"כ ניסיונות</h4>
                          <p className="text-2xl font-bold text-purple-900">
                            {(selectedExam.sessions || []).length}
                          </p>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-4">
                          <h4 className="font-semibold text-yellow-900 mb-2">ציון ממוצע</h4>
                          <p className="text-2xl font-bold text-yellow-900">
                            {(() => {
                              const completedSessions = (selectedExam.sessions || []).filter(s => s.isCompleted && s.score !== undefined);
                              if (completedSessions.length === 0) return '-';
                              const avg = completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / completedSessions.length;
                              return avg.toFixed(1);
                            })()}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4">
                          <h4 className="font-semibold text-green-900 mb-2">סה"כ נקודות שניתנו</h4>
                          <p className="text-2xl font-bold text-green-900">
                            {(selectedExam.sessions || []).reduce((sum, s) => sum + (s.earnedPoints || 0), 0)}
                          </p>
                        </div>
                      </div>

                      {/* Sessions Table */}
                      {(!Array.isArray(selectedExam.sessions) || selectedExam.sessions.length === 0) ? (
                        <p className="text-sm text-gray-500 text-center py-4">אין ניסיונות עדיין</p>
                      ) : (
                        <DataTable
                          data={selectedExam.sessions}
                          columns={[
                            {
                              key: 'user',
                              label: 'תלמיד',
                              sortable: true,
                              render: (value) => value?.fullName || value?.phone || 'משתמש אנונימי'
                            },
                            {
                              key: 'startedAt',
                              label: 'התחיל',
                              sortable: true,
                              render: (value) => new Date(value).toLocaleString('he-IL')
                            },
                            {
                              key: 'completedAt',
                              label: 'הסתיים',
                              sortable: true,
                              render: (value) => value ? new Date(value).toLocaleString('he-IL') : '-'
                            },
                            {
                              key: 'score',
                              label: 'ציון',
                              sortable: true,
                              render: (value) => value !== undefined ? value : '-'
                            },
                            {
                              key: 'earnedPoints',
                              label: 'נקודות',
                              sortable: true,
                              render: (value) => <span className="font-bold text-green-600">{value}</span>
                            },
                            {
                              key: 'isCompleted',
                              label: 'סטטוס',
                              sortable: true,
                              render: (value) => (
                                <span className={`text-xs px-3 py-1 rounded-full ${value ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {value ? 'הושלם' : 'בתהליך'}
                                </span>
                              )
                            }
                          ]}
                          filters={[
                            {
                              key: 'isCompleted',
                              type: 'select',
                              options: [
                                { value: '', label: 'הכל' },
                                { value: 'true', label: 'הושלם' },
                                { value: 'false', label: 'בתהליך' }
                              ]
                            }
                          ]}
                          pageSize={50}
                          sortable={true}
                          getRowLink={(row) => `/personal-area?userId=${row.userId}`}
                        />
                      )}
                    </div>
                  )}
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
        ) : activeTab === 'lessons' ? (
          
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

              {(!Array.isArray(lessons) || lessons.length === 0) ? (
                <div className="card text-center py-8">
                  <p className="text-gray-500 mb-4">אין שיעורים עדיין</p>
                  <button
                    onClick={() => setShowLessonModal(true)}
                    className="btn-primary"
                  >
                    צור שיעור חדש
                  </button>
                </div>
              ) : (
                <DataTable
                  data={lessons}
                  columns={[
                    {
                      key: 'title',
                      label: 'כותרת',
                      sortable: true
                    },
                    {
                      key: 'materials',
                      label: 'חומרים',
                      sortable: true,
                      render: (value) => Array.isArray(value) ? value.length : 0
                    },
                    {
                      key: 'videoUrl',
                      label: 'וידאו',
                      sortable: true,
                      render: (value) => value ? '✓' : '-'
                    },
                    {
                      key: 'audioUrl',
                      label: 'אודיו',
                      sortable: true,
                      render: (value) => value ? '✓' : '-'
                    },
                    {
                      key: 'actions',
                      label: 'פעולות',
                      render: (_, row) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLesson(row.id);
                          }}
                          className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    }
                  ]}
                  pageSize={50}
                  sortable={true}
                  onRowClick={(row) => setSelectedLesson(row)}
                />
              )}
            </div>

            {}
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
                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="w-5 h-5 text-slate-900" />
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
                          onClick={() => {
                            const url = prompt('הכנס קישור לוידאו:');
                            if(url !== null) handleUpdateLesson(selectedLesson.id, { videoUrl: url });
                          }}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          הוסף וידאו
                        </button>
                        <button
                          onClick={() => {
                            const url = prompt('הכנס קישור לאודיו:');
                            if(url !== null) handleUpdateLesson(selectedLesson.id, { audioUrl: url });
                          }}
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
                        <h3 className="text-xl font-bold">חומרים ({Array.isArray(selectedLesson.materials) ? selectedLesson.materials.length : 0})</h3>
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

                      {(!Array.isArray(selectedLesson.materials) || selectedLesson.materials.length === 0) ? (
                        <p className="text-gray-500 text-center py-8">אין חומרים לשיעור הזה עדיין</p>
                      ) : (
                        <div className="space-y-3">
                          {Array.isArray(selectedLesson.materials) && selectedLesson.materials.map((material) => (
                            <div key={material.id} className="bg-gray-50 rounded-xl p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-slate-600" />
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
                                    className="text-slate-900 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-lg transition-colors"
                                    title="פתח קובץ"
                                  >
                                    <Download className="w-5 h-5" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-colors"
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
        ) : null}

        {}
        {activeTab === 'benefits' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">ניהול הטבות</h2>
              <button
                onClick={() => setShowBenefitModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                צור הטבה חדשה
              </button>
            </div>

            {(!Array.isArray(benefits) || benefits.length === 0) ? (
              <div className="card text-center py-8">
                <p className="text-gray-500 mb-4">אין הטבות עדיין</p>
                <button
                  onClick={() => setShowBenefitModal(true)}
                  className="btn-primary"
                >
                  צור הטבה חדשה
                </button>
              </div>
            ) : (
              <DataTable
                data={benefits}
                columns={[
                  {
                    key: 'title',
                    label: 'כותרת',
                    sortable: true
                  },
                  {
                    key: 'description',
                    label: 'תיאור',
                    sortable: true,
                    render: (value) => value || '-'
                  },
                  {
                    key: 'costPoints',
                    label: 'עלות נקודות',
                    sortable: true
                  },
                  {
                    key: 'category',
                    label: 'קטגוריה',
                    sortable: true,
                    render: (value) => value ? (
                      <span className="text-xs bg-slate-100 text-slate-900 px-2 py-1 rounded-full">{value}</span>
                    ) : '-'
                  },
                  {
                    key: 'isActive',
                    label: 'פעיל',
                    sortable: true,
                    render: (value, row) => (
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateBenefit(row.id, { isActive: e.target.checked });
                        }}
                        className="w-4 h-4"
                      />
                    )
                  },
                  {
                    key: 'actions',
                    label: 'פעולות',
                    render: (_, row) => (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBenefit(row.id);
                        }}
                        className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  }
                ]}
                filters={[
                  {
                    key: 'isActive',
                    type: 'select',
                    options: [
                      { value: '', label: 'הכל' },
                      { value: 'true', label: 'פעיל' },
                      { value: 'false', label: 'לא פעיל' }
                    ]
                  }
                ]}
                pageSize={50}
                sortable={true}
              />
            )}
          </div>
        )}

        {}
        {activeTab === 'redemptions' && (
          <div className="card">
            <h2 className="text-xl font-bold mb-6">ניהול מימושים</h2>
            {(!Array.isArray(redemptions) || redemptions.length === 0) ? (
              <div className="text-center py-8">
                <p className="text-gray-500">אין מימושים עדיין</p>
              </div>
            ) : (
              <DataTable
                data={redemptions}
                columns={[
                  {
                    key: 'benefit',
                    label: 'הטבה',
                    sortable: true,
                    render: (value) => value?.title || '-'
                  },
                  {
                    key: 'user',
                    label: 'משתמש',
                    sortable: true,
                    render: (value) => value?.fullName || value?.phone || '-'
                  },
                  {
                    key: 'redeemedAt',
                    label: 'תאריך מימוש',
                    sortable: true,
                    render: (value) => new Date(value).toLocaleDateString('he-IL')
                  },
                  {
                    key: 'status',
                    label: 'סטטוס',
                    sortable: true,
                    render: (value) => (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        value === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        value === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {value === 'pending' ? 'בהמתנה' :
                         value === 'approved' ? 'אושר' : 'נדחה'}
                      </span>
                    )
                  },
                  {
                    key: 'notes',
                    label: 'הערות',
                    sortable: true,
                    render: (value) => value || '-'
                  },
                  {
                    key: 'actions',
                    label: 'פעולות',
                    render: (_, row) => row.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProcessRedemption(row.id, 'approved');
                          }}
                          className="btn-primary text-xs px-3 py-1"
                        >
                          אשר
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const notes = prompt('הערה לדחייה:');
                            if (notes !== null) handleProcessRedemption(row.id, 'rejected', notes);
                          }}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          דחה
                        </button>
                      </div>
                    ) : null
                  }
                ]}
                filters={[
                  {
                    key: 'status',
                    type: 'select',
                    options: [
                      { value: '', label: 'הכל' },
                      { value: 'pending', label: 'בהמתנה' },
                      { value: 'approved', label: 'אושר' },
                      { value: 'rejected', label: 'נדחה' }
                    ]
                  }
                ]}
                pageSize={50}
                sortable={true}
                getRowLink={(row) => `/personal-area?userId=${row.user.id}`}
              />
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="card text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ניהול תלמידים
            </h3>
            <p className="text-gray-500 mb-4">
              לחץ כאן לעבור לדף ניהול התלמידים
            </p>
            <button
              onClick={() => navigate('/admin/students')}
              className="btn-primary"
            >
              עבור לניהול תלמידים
            </button>
          </div>
        )}
      </main>

      {}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תכנית לימוד</label>
                <select value={newExamStudyProgramId} onChange={(e) => setNewExamStudyProgramId(e.target.value)} className="input-field">
                  <option value="">ללא תכנית</option>
                  {Array.isArray(studyPrograms) && studyPrograms.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
                </select>
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

      {/* Create Benefit Modal */}
      {showBenefitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-md w-full animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">צור הטבה חדשה</h3>
              <button
                onClick={() => setShowBenefitModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כותרת ההטבה
                </label>
                <input
                  type="text"
                  value={newBenefit.title}
                  onChange={(e) => setNewBenefit({ ...newBenefit, title: e.target.value })}
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
                  value={newBenefit.description}
                  onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                  placeholder="הכנס תיאור"
                  className="input-field"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  עלות בנקודות
                </label>
                <input
                  type="number"
                  value={newBenefit.costPoints}
                  onChange={(e) => setNewBenefit({ ...newBenefit, costPoints: Number(e.target.value) })}
                  placeholder="הכנס עלות"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קטגוריה
                </label>
                <input
                  type="text"
                  value={newBenefit.category}
                  onChange={(e) => setNewBenefit({ ...newBenefit, category: e.target.value })}
                  placeholder="הכנס קטגוריה"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קישור לתמונה
                </label>
                <input
                  type="text"
                  value={newBenefit.imageUrl}
                  onChange={(e) => setNewBenefit({ ...newBenefit, imageUrl: e.target.value })}
                  placeholder="הכנס קישור לתמונה"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  מקסימום שימושים
                </label>
                <input
                  type="number"
                  value={newBenefit.maxUses}
                  onChange={(e) => setNewBenefit({ ...newBenefit, maxUses: e.target.value })}
                  placeholder="השאר ריק ללא הגבלה"
                  className="input-field"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateBenefit}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  צור
                </button>
                <button
                  onClick={() => setShowBenefitModal(false)}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תכנית לימוד</label>
                <select value={newLesson.studyProgramId} onChange={(e) => setNewLesson({ ...newLesson, studyProgramId: e.target.value })} className="input-field">
                  <option value="">ללא תכנית</option>
                  {Array.isArray(studyPrograms) && studyPrograms.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input type="date" value={newLesson.weekDate} onChange={(e) => setNewLesson({ ...newLesson, weekDate: e.target.value })} className="input-field" />
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