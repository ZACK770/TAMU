import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, User as UserIcon, Ban, CheckCircle } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { studentsService, Student } from '../services/students';

const StudentsListPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const loadStudents = async (page = 1) => {
    try {
      setLoading(true);
      const response = await studentsService.getAllStudents({ page, limit: pageSize });
      setStudents(response.students);
      setTotal(response.total);
      setCurrentPage(response.page);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת רשימת תלמידים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [pageSize]);

  const handleRowClick = (student: Student) => {
    navigate(`/admin/students/${student.id}`);
  };

  const handleBlock = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (!confirm(`האם לחסום את ${student.fullName || student.phone}?`)) return;
    
    try {
      await studentsService.blockStudent(student.id);
      loadStudents(currentPage);
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בחסימת תלמיד');
    }
  };

  const handleUnblock = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    try {
      await studentsService.unblockStudent(student.id);
      loadStudents(currentPage);
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בביטול חסימה');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען נתונים...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen px-4 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">ניהול תלמידים</h1>
            <p className="text-gray-600 mt-2">סה"כ {total} תלמידים במערכת</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="btn-secondary"
          >
            חזור לניהול
          </button>
        </div>

        <div className="card">
          <DataTable
            data={students}
            columns={[
              {
                key: 'fullName',
                label: 'שם מלא',
                sortable: true,
                render: (value) => value || '-'
              },
              {
                key: 'phone',
                label: 'טלפון',
                sortable: true
              },
              {
                key: 'availablePoints',
                label: 'נקודות זמינות',
                sortable: true,
                render: (value) => <span className="font-bold text-slate-900">{value}</span>
              },
              {
                key: 'totalPoints',
                label: 'סה"כ נקודות',
                sortable: true
              },
              {
                key: '_count',
                label: 'מבחנים',
                sortable: true,
                render: (value) => value?.examSessions || 0
              },
              {
                key: '_count',
                label: 'מימושים',
                sortable: true,
                render: (value) => value?.redemptions || 0
              },
              {
                key: 'createdAt',
                label: 'תאריך הרשמה',
                sortable: true,
                render: (value) => new Date(value).toLocaleDateString('he-IL')
              },
              {
                key: 'isActive',
                label: 'סטטוס',
                sortable: true,
                render: (value, row) => (
                  <div className="flex items-center gap-2">
                    {value ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
                        פעיל
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700">
                        חסום
                      </span>
                    )}
                    {value ? (
                      <button
                        onClick={(e) => handleBlock(e, row)}
                        className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                        title="חסום"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleUnblock(e, row)}
                        className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded transition-colors"
                        title="בטל חסימה"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              }
            ]}
            pageSize={pageSize}
            sortable={true}
            onRowClick={handleRowClick}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentsListPage;
