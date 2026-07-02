import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CalendarDays, Gift, LogOut, Trophy } from 'lucide-react';
import { examService, ExamHistoryResponse } from '../services/exam';
import { authService } from '../services/auth';
import { benefitsService, Benefit } from '../services/benefits';
import { redemptionsService, Redemption } from '../services/redemptions';
import { statsService, MyStats } from '../services/stats';

type TabType = 'exams' | 'benefits' | 'redemptions';

const PersonalAreaPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('exams');
  const [history, setHistory] = useState<ExamHistoryResponse | null>(null);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
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
      } catch (err: any) {
        setError(err.response?.data?.error || 'שגיאה בטעינת האיזור האישי');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

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
          <div>
            <h1 className="text-4xl font-bold text-slate-900 font-bold">האזור האישי</h1>
            <p className="text-gray-600 mt-2">הציונים, הנקודות וההטבות שלך במקום אחד</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/')} className="btn-secondary">דף הבית</button>
            <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              יציאה
            </button>
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
                    <div className="space-y-4">
                      {Array.isArray(history?.exams) && history.exams.map((exam) => (
                        <div key={exam.sessionId} className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold">{exam.examTitle}</h3>
                              <p className="text-sm text-gray-500 mt-1">מזהה מבחן: {exam.examId}</p>
                              <p className="text-sm text-gray-500">מזהה ביצוע: {exam.sessionId}</p>
                              {exam.studyProgram && <p className="text-sm text-slate-800 mt-1">תכנית: {exam.studyProgram.title}</p>}
                            </div>
                            <div className="text-left md:text-right">
                              <div className="text-3xl font-bold text-slate-900">{exam.score}%</div>
                              <div className="text-slate-900 font-semibold">+{exam.earnedPoints} נקודות</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1 justify-end mt-1">
                                <CalendarDays className="w-4 h-4" />
                                {new Date(exam.completedAt).toLocaleDateString('he-IL')}
                              </div>
                            </div>
                          </div>
                          {exam.questionStats && (
                            <div className="mt-4 flex gap-4 text-sm">
                              <span className="text-green-600">✓ {exam.questionStats.correct} נכונים</span>
                              <span className="text-red-600">✗ {exam.questionStats.incorrect} שגויים</span>
                              {exam.questionStats.skipped > 0 && <span className="text-gray-500">○ {exam.questionStats.skipped} דילגו</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
                    <div className="space-y-4">
                      {Array.isArray(redemptions) && redemptions.map((redemption) => (
                        <div key={redemption.id} className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold">{redemption.benefit.title}</h3>
                              {redemption.benefit.description && (
                                <p className="text-sm text-gray-600 mt-1">{redemption.benefit.description}</p>
                              )}
                              <div className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                                <CalendarDays className="w-4 h-4" />
                                {new Date(redemption.redeemedAt).toLocaleDateString('he-IL')}
                              </div>
                            </div>
                            <div className="text-left md:text-right">
                              <div className="text-2xl font-bold text-slate-900">-{redemption.pointsUsed} נקודות</div>
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(redemption.status)}`}>
                                {getStatusText(redemption.status)}
                              </span>
                              {redemption.processedAt && (
                                <div className="text-sm text-gray-500 mt-1">
                                  עודכן: {new Date(redemption.processedAt).toLocaleDateString('he-IL')}
                                </div>
                              )}
                              {redemption.notes && (
                                <div className="text-sm text-gray-600 mt-1">הערה: {redemption.notes}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
