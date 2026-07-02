import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Award, Gift, LogOut, Trophy, ArrowLeft } from 'lucide-react';
import { examService, ExamHistoryResponse } from '../services/exam';
import { authService } from '../services/auth';
import { benefitsService, Benefit } from '../services/benefits';
import { redemptionsService, Redemption } from '../services/redemptions';
import { statsService, MyStats } from '../services/stats';
import { studentsService, StudentDetail } from '../services/students';
import { DataTable } from '../components/DataTable';

type TabType = 'exams' | 'benefits' | 'redemptions';

const PersonalAreaPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const isViewingOtherUser = !!userId;
  
  const [activeTab, setActiveTab] = useState<TabType>('exams');
  const [history, setHistory] = useState<ExamHistoryResponse | null>(null);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [studentData, setStudentData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/auth');
      return;
    }

    const loadData = async () => {
      try {
        if (isViewingOtherUser && userId) {
          // Admin viewing another user's profile
          const student = await studentsService.getStudentById(userId);
          setStudentData(student);
          
          // Convert student data to match the expected format
          const convertedHistory: ExamHistoryResponse = {
            availablePoints: student.availablePoints,
            totalPoints: student.totalPoints,
            exams: student.examSessions.map(session => ({
              sessionId: session.id,
              examId: session.exam.id,
              examTitle: session.exam.title,
              score: session.score || 0,
              earnedPoints: session.earnedPoints,
              completedAt: session.completedAt || new Date().toISOString(),
              questionStats: null, // Not available in student data
              studyProgram: null, // Not available in student data
            }))
          };
          
          const convertedStats: MyStats = {
            totalExams: student.examSessions.filter(s => s.isCompleted).length,
            averageScore: student.examSessions
              .filter(s => s.isCompleted && s.score !== null)
              .reduce((sum, s) => sum + (s.score || 0), 0) / 
              (student.examSessions.filter(s => s.isCompleted && s.score !== null).length || 1),
            pointsSpent: student.redemptions.reduce((sum, r) => sum + r.pointsUsed, 0),
          };
          
          setHistory(convertedHistory);
          setStats(convertedStats);
          setRedemptions(student.redemptions);
          // Don't load benefits for other users
          setBenefits([]);
        } else {
          // Load current user's data
          const [historyData, statsData, benefitsData, redemptionsData] = await Promise.all([
            examService.getMyHistory(),
            statsService.getMyStats(),
            benefitsService.getAvailable(),
            redemptionsService.getMyRedemptions(),
          ]);
          setHistory(historyData);
          setStats(statsData);
          setBenefits(benefitsData);
          setRedemptions(redemptionsData);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'שגיאה בטעינת האיזור האישי');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, isViewingOtherUser, userId]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const handleRedeem = async (benefitId: string) => {
    try {
      await redemptionsService.redeem(benefitId);
      // Reload data
      const [historyData, statsData, benefitsData, redemptionsData] = await Promise.all([
        examService.getMyHistory(),
        statsService.getMyStats(),
        benefitsService.getAvailable(),
        redemptionsService.getMyRedemptions(),
      ]);
      setHistory(historyData);
      setStats(statsData);
      setBenefits(benefitsData);
      setRedemptions(redemptionsData);
      alert('הבקשה התקבלה וממתינה לאישור מנהל');
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה במימוש ההטבה');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'completed': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'בהמתנה';
      case 'approved': return 'אושר';
      case 'rejected': return 'נדחה';
      case 'completed': return 'הושלם';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen px-4 py-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {isViewingOtherUser && (
              <button
                onClick={() => navigate('/admin/students')}
                className="btn-secondary p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-4xl font-bold text-slate-900 font-bold">
                {isViewingOtherUser ? (studentData?.fullName || 'פרופיל תלמיד') : 'האזור האישי'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isViewingOtherUser 
                  ? `צפייה בפרופיל של ${studentData?.fullName || studentData?.phone}`
                  : 'הציונים, הנקודות וההטבות שלך במקום אחד'
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isViewingOtherUser && (
              <>
                <button onClick={() => navigate('/')} className="btn-secondary">דף הבית</button>
                <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  יציאה
                </button>
              </>
            )}
          </div>
          </div>
        </div>

        {loading ? (
          <div className="card text-center py-12">טוען נתונים...</div>
        ) : error ? (
          <div className="card text-center py-12 text-red-600">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className="w-8 h-8 text-slate-800" />
                  <h2 className="text-xl font-bold">נקודות זמינות</h2>
                </div>
                <p className="text-4xl font-bold text-slate-900">{history?.availablePoints || 0}</p>
                <p className="text-sm text-gray-600 mt-2">סה״כ: {history?.totalPoints || 0} נקודות</p>
              </div>
              <div className="card bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-8 h-8 text-slate-800" />
                  <h2 className="text-xl font-bold">מבחנים שבוצעו</h2>
                </div>
                <p className="text-4xl font-bold text-slate-900">{stats?.totalExams || 0}</p>
                <p className="text-sm text-gray-600 mt-2">ציון ממוצע: {stats?.averageScore || 0}%</p>
              </div>
              <div className="card bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <Gift className="w-8 h-8 text-slate-800" />
                  <h2 className="text-xl font-bold">מימושים</h2>
                </div>
                <p className="text-4xl font-bold text-slate-900">{Array.isArray(redemptions) ? redemptions.length : 0}</p>
                <p className="text-sm text-gray-600 mt-2">נקודות שמומשו: {stats?.pointsSpent || 0}</p>
              </div>
            </div>

            <div className="card">
              <div className="flex gap-2 border-b border-gray-200 pb-4 mb-6">
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'exams' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  היסטוריית מבחנים
                </button>
                <button
                  onClick={() => setActiveTab('benefits')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'benefits' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  הטבות זמינות
                </button>
                <button
                  onClick={() => setActiveTab('redemptions')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'redemptions' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  היסטוריית מימושים
                </button>
              </div>

              {activeTab === 'exams' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">היסטוריית מבחנים</h2>
                  {!Array.isArray(history?.exams) || history.exams.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">עדיין אין מבחנים שהושלמו</p>
                  ) : (
                    <DataTable
                      data={history.exams}
                      columns={[
                        {
                          key: 'examTitle',
                          label: 'מבחן',
                          sortable: true
                        },
                        {
                          key: 'examId',
                          label: 'מזהה מבחן',
                          sortable: true
                        },
                        {
                          key: 'sessionId',
                          label: 'מזהה ביצוע',
                          sortable: true
                        },
                        {
                          key: 'studyProgram',
                          label: 'תכנית',
                          sortable: true,
                          render: (value) => value?.title || '-'
                        },
                        {
                          key: 'score',
                          label: 'ציון',
                          sortable: true,
                          render: (value) => <span className="text-3xl font-bold text-slate-900">{value}%</span>
                        },
                        {
                          key: 'earnedPoints',
                          label: 'נקודות',
                          sortable: true,
                          render: (value) => <span className="font-semibold text-slate-900">+{value}</span>
                        },
                        {
                          key: 'completedAt',
                          label: 'תאריך',
                          sortable: true,
                          render: (value) => new Date(value).toLocaleDateString('he-IL')
                        },
                        {
                          key: 'questionStats',
                          label: 'סטטיסטיקה',
                          sortable: true,
                          render: (value) => value ? (
                            <div className="flex gap-2 text-sm">
                              <span className="text-green-600">✓ {value.correct}</span>
                              <span className="text-red-600">✗ {value.incorrect}</span>
                              {value.skipped > 0 && <span className="text-gray-500">○ {value.skipped}</span>}
                            </div>
                          ) : '-'
                        }
                      ]}
                      pageSize={50}
                      sortable={true}
                    />
                  )}
                </div>
              )}

              {activeTab === 'benefits' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">הטבות זמינות</h2>
                  {!Array.isArray(benefits) || benefits.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">אין הטבות זמינות כרגע</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.isArray(benefits) && benefits.map((benefit) => (
                        <div key={benefit.id} className="rounded-2xl border border-gray-100 p-5 bg-white hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{benefit.title}</h3>
                              {benefit.description && <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>}
                            </div>
                            {benefit.imageUrl && (
                              <img src={benefit.imageUrl} alt={benefit.title} className="w-16 h-16 object-cover rounded-lg" />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-xl font-bold text-slate-900">{benefit.costPoints} נקודות</div>
                            <button
                              onClick={() => handleRedeem(benefit.id)}
                              disabled={!benefit.canRedeem}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                benefit.canRedeem
                                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {benefit.canRedeem ? 'ממש' : benefit.reason || 'לא זמין'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'redemptions' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">היסטוריית מימושים</h2>
                  {!Array.isArray(redemptions) || redemptions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">עדיין לא מימשת הטבות</p>
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
                          key: 'benefit',
                          label: 'תיאור',
                          sortable: true,
                          render: (value) => value?.description || '-'
                        },
                        {
                          key: 'redeemedAt',
                          label: 'תאריך מימוש',
                          sortable: true,
                          render: (value) => new Date(value).toLocaleDateString('he-IL')
                        },
                        {
                          key: 'pointsUsed',
                          label: 'נקודות',
                          sortable: true,
                          render: (value) => <span className="text-2xl font-bold text-slate-900">-{value}</span>
                        },
                        {
                          key: 'status',
                          label: 'סטטוס',
                          sortable: true,
                          render: (value) => (
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(value)}`}>
                              {getStatusText(value)}
                            </span>
                          )
                        },
                        {
                          key: 'processedAt',
                          label: 'עודכן',
                          sortable: true,
                          render: (value) => value ? new Date(value).toLocaleDateString('he-IL') : '-'
                        },
                        {
                          key: 'notes',
                          label: 'הערות',
                          sortable: true,
                          render: (value) => value || '-'
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
                            { value: 'rejected', label: 'נדחה' },
                            { value: 'completed', label: 'הושלם' }
                          ]
                        }
                      ]}
                      pageSize={50}
                      sortable={true}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PersonalAreaPage;
