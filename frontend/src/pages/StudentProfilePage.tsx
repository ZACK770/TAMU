import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Award, Gift, Ban, CheckCircle, Plus, Minus, Trash2 } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Sidebar, adminSidebarItems } from '../components/Sidebar';
import { studentsService, StudentDetail } from '../services/students';

type TabType = 'details' | 'exams' | 'redemptions' | 'points' | 'settings';

const StudentProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    adminNotes: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // Points adjustment form state
  const [pointsForm, setPointsForm] = useState({
    type: 'manual_add' as 'manual_add' | 'manual_subtract',
    amount: 0,
    reason: '',
    description: ''
  });

  const loadStudent = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await studentsService.getStudentById(id);
      setStudent(data);
      setEditForm({
        fullName: data.fullName || '',
        phone: data.phone,
        adminNotes: data.adminNotes || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת פרטי תלמיד');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
  }, [id]);

  const handleSaveDetails = async () => {
    if (!student) return;
    try {
      await studentsService.updateStudent(student.id, editForm);
      setIsEditing(false);
      loadStudent();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בעדכון פרטים');
    }
  };

  const handleBlock = async () => {
    if (!student || !confirm(`האם לחסום את ${student.fullName || student.phone}?`)) return;
    try {
      await studentsService.blockStudent(student.id);
      loadStudent();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בחסימת תלמיד');
    }
  };

  const handleUnblock = async () => {
    if (!student) return;
    try {
      await studentsService.unblockStudent(student.id);
      loadStudent();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בביטול חסימה');
    }
  };

  const handleDelete = async () => {
    if (!student || !confirm(`האם למחוק את ${student.fullName || student.phone}? פעולה זו אינה הפיכה!`)) return;
    if (!confirm('אישור סופי: למחוק את התלמיד?')) return;
    try {
      await studentsService.deleteStudent(student.id);
      navigate('/admin/students');
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה במחיקת תלמיד');
    }
  };

  const handleAdjustPoints = async () => {
    if (!student || !pointsForm.reason || !pointsForm.amount) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }
    try {
      await studentsService.adjustStudentPoints(student.id, pointsForm);
      setPointsForm({ type: 'manual_add', amount: 0, reason: '', description: '' });
      loadStudent();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בעדכון נקודות');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען נתונים...</div>;
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'תלמיד לא נמצא'}</p>
          <button onClick={() => navigate('/admin/students')} className="btn-secondary">
            חזור לרשימה
          </button>
        </div>
      </div>
    );
  }

  const completedExams = student.examSessions.filter(s => s.isCompleted);
  const averageScore = completedExams.length > 0
    ? completedExams.reduce((sum, s) => sum + (s.score || 0), 0) / completedExams.length
    : 0;

  return (
    <div className="min-h-screen flex" dir="rtl">
      <Sidebar
        items={adminSidebarItems}
        activeItem="students"
        onItemClick={(itemId) => navigate(`/admin?tab=${itemId}`)}
        position="right"
      />
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/admin?tab=students')}
                  className="btn-secondary p-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-4xl font-bold text-slate-900">{student.fullName || 'תלמיד'}</h1>
                  <p className="text-gray-600 mt-1">{student.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {student.isActive ? (
                  <button
                    onClick={handleBlock}
                    className="btn-secondary flex items-center gap-2 text-red-600"
                  >
                    <Ban className="w-4 h-4" />
                    חסום
                  </button>
                ) : (
                  <button
                    onClick={handleUnblock}
                    className="btn-secondary flex items-center gap-2 text-green-600"
                  >
                    <CheckCircle className="w-4 h-4" />
                    בטל חסימה
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="btn-secondary flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  מחק
                </button>
              </div>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-slate-800" />
              <h3 className="font-semibold">נקודות זמינות</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{student.availablePoints}</p>
          </div>
          <div className="card bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-6 h-6 text-slate-800" />
              <h3 className="font-semibold">סה"כ נקודות</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{student.totalPoints}</p>
          </div>
          <div className="card bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-6 h-6 text-slate-800" />
              <h3 className="font-semibold">ציון ממוצע</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{averageScore.toFixed(1)}%</p>
          </div>
          <div className="card bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-6 h-6 text-slate-800" />
              <h3 className="font-semibold">מימושים</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{student.redemptions.length}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex gap-2 border-b border-gray-200 pb-4 mb-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'details' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              פרטים אישיים
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'exams' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              היסטוריית מבחנים
            </button>
            <button
              onClick={() => setActiveTab('redemptions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'redemptions' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              היסטוריית מימושים
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'points' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ניהול נקודות
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              הגדרות מתקדמות
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">פרטים אישיים</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary"
                  >
                    ערוך
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          fullName: student.fullName || '',
                          phone: student.phone,
                          adminNotes: student.adminNotes || ''
                        });
                      }}
                      className="btn-secondary"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      className="btn-primary"
                    >
                      שמור
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="input-field"
                    />
                  ) : (
                    <p className="text-lg">{student.fullName || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">טלפון</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="input-field"
                    />
                  ) : (
                    <p className="text-lg">{student.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך הרשמה</label>
                  <p className="text-lg">{new Date(student.createdAt).toLocaleDateString('he-IL')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                  <p className="text-lg">
                    {student.isActive ? (
                      <span className="text-green-600">פעיל</span>
                    ) : (
                      <span className="text-red-600">חסום</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">הערות מנהל</label>
                {isEditing ? (
                  <textarea
                    value={editForm.adminNotes}
                    onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                    className="input-field"
                    rows={4}
                  />
                ) : (
                  <p className="text-lg whitespace-pre-wrap">{student.adminNotes || '-'}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">היסטוריית מבחנים</h2>
              {student.examSessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין מבחנים</p>
              ) : (
                <DataTable
                  data={student.examSessions}
                  columns={[
                    {
                      key: 'exam',
                      label: 'מבחן',
                      sortable: true,
                      render: (value) => value?.title || '-'
                    },
                    {
                      key: 'score',
                      label: 'ציון',
                      sortable: true,
                      render: (value) => value !== null ? `${value}%` : '-'
                    },
                    {
                      key: 'earnedPoints',
                      label: 'נקודות',
                      sortable: true,
                      render: (value) => <span className="font-bold text-green-600">+{value}</span>
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
                  pageSize={50}
                  sortable={true}
                />
              )}
            </div>
          )}

          {activeTab === 'redemptions' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">היסטוריית מימושים</h2>
              {student.redemptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין מימושים</p>
              ) : (
                <DataTable
                  data={student.redemptions}
                  columns={[
                    {
                      key: 'benefit',
                      label: 'הטבה',
                      sortable: true,
                      render: (value) => value?.title || '-'
                    },
                    {
                      key: 'pointsUsed',
                      label: 'נקודות',
                      sortable: true,
                      render: (value) => <span className="font-bold text-slate-900">-{value}</span>
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
                      render: (value) => {
                        const statusMap: Record<string, { text: string; className: string }> = {
                          pending: { text: 'בהמתנה', className: 'bg-yellow-100 text-yellow-700' },
                          approved: { text: 'אושר', className: 'bg-green-100 text-green-700' },
                          rejected: { text: 'נדחה', className: 'bg-red-100 text-red-700' },
                          completed: { text: 'הושלם', className: 'bg-blue-100 text-blue-700' },
                        };
                        const status = statusMap[value] || { text: value, className: 'bg-gray-100 text-gray-700' };
                        return (
                          <span className={`text-xs px-3 py-1 rounded-full ${status.className}`}>
                            {status.text}
                          </span>
                        );
                      }
                    },
                    {
                      key: 'notes',
                      label: 'הערות',
                      sortable: true,
                      render: (value) => value || '-'
                    }
                  ]}
                  pageSize={50}
                  sortable={true}
                />
              )}
            </div>
          )}

          {activeTab === 'points' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">ניהול נקודות</h2>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold mb-4">הוספה/הפחתת נקודות ידנית</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">סוג פעולה</label>
                    <select
                      value={pointsForm.type}
                      onChange={(e) => setPointsForm({ ...pointsForm, type: e.target.value as 'manual_add' | 'manual_subtract' })}
                      className="input-field"
                    >
                      <option value="manual_add">הוספת נקודות</option>
                      <option value="manual_subtract">הפחתת נקודות</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">כמות</label>
                    <input
                      type="number"
                      value={pointsForm.amount}
                      onChange={(e) => setPointsForm({ ...pointsForm, amount: parseInt(e.target.value) || 0 })}
                      className="input-field"
                      min="1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">סיבה *</label>
                    <input
                      type="text"
                      value={pointsForm.reason}
                      onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })}
                      className="input-field"
                      placeholder="למה מבצעים את השינוי?"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">תיאור (אופציונלי)</label>
                    <textarea
                      value={pointsForm.description}
                      onChange={(e) => setPointsForm({ ...pointsForm, description: e.target.value })}
                      className="input-field"
                      rows={2}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAdjustPoints}
                  className="btn-primary mt-4 flex items-center gap-2"
                >
                  {pointsForm.type === 'manual_add' ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  בצע שינוי
                </button>
              </div>

              <div>
                <h3 className="font-semibold mb-4">היסטוריית שינויי נקודות</h3>
                {student.pointHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">אין היסטוריית נקודות</p>
                ) : (
                  <DataTable
                    data={student.pointHistory}
                    columns={[
                      {
                        key: 'type',
                        label: 'סוג',
                        sortable: true,
                        render: (value) => {
                          const typeMap: Record<string, string> = {
                            earned: 'הרוויח',
                            redeemed: 'מומש',
                            manual_add: 'הוספה ידנית',
                            manual_subtract: 'הפחתה ידנית',
                            refund: 'החזרה',
                          };
                          return typeMap[value] || value;
                        }
                      },
                      {
                        key: 'amount',
                        label: 'כמות',
                        sortable: true,
                        render: (value) => (
                          <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
                            {value > 0 ? '+' : ''}{value}
                          </span>
                        )
                      },
                      {
                        key: 'reason',
                        label: 'סיבה',
                        sortable: true,
                        render: (value) => value || '-'
                      },
                      {
                        key: 'description',
                        label: 'תיאור',
                        sortable: true,
                        render: (value) => value || '-'
                      },
                      {
                        key: 'createdAt',
                        label: 'תאריך',
                        sortable: true,
                        render: (value) => new Date(value).toLocaleString('he-IL')
                      }
                    ]}
                    pageSize={50}
                    sortable={true}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">הגדרות מתקדמות</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="font-semibold text-red-900 mb-4">אזור מסוכן</h3>
                <p className="text-sm text-red-700 mb-4">
                  פעולות באזור זה עלולות להשפיע באופן משמעותי על התלמיד.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={handleBlock}
                    disabled={!student.isActive}
                    className="btn-secondary w-full text-red-600 disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4 inline mr-2" />
                    חסום תלמיד
                  </button>
                  <button
                    onClick={handleUnblock}
                    disabled={student.isActive}
                    className="btn-secondary w-full text-green-600 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    בטל חסימה
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-secondary w-full text-red-600"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    מחק תלמיד
                  </button>
                </div>
              </div>

              {student.blockedAt && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <h3 className="font-semibold text-yellow-900 mb-2">פרטי חסימה</h3>
                  <p className="text-sm text-yellow-700">
                    נחסם בתאריך: {new Date(student.blockedAt).toLocaleString('he-IL')}
                  </p>
                  {student.blockedBy && (
                    <p className="text-sm text-yellow-700">
                      ע"י: {student.blockedBy}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
