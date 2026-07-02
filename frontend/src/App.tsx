import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import JourneyPage from './pages/JourneyPage';
import AuthPage from './pages/AuthPage';
import RegisterPage from './pages/RegisterPage';
import ExamPage from './pages/ExamPage';
import AdminPage from './pages/AdminPage';
import PersonalAreaPage from './pages/PersonalAreaPage';
import StudentsListPage from './pages/StudentsListPage';
import StudentProfilePage from './pages/StudentProfilePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/journey" element={<JourneyPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/students" element={<StudentsListPage />} />
        <Route path="/admin/students/:id" element={<StudentProfilePage />} />
        <Route path="/personal" element={<PersonalAreaPage />} />
        <Route path="/personal-area" element={<PersonalAreaPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
