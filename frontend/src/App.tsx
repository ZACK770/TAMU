import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import RegisterPage from './pages/RegisterPage';
import ExamPage from './pages/ExamPage';
import AdminPage from './pages/AdminPage';
import PersonalAreaPage from './pages/PersonalAreaPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/personal" element={<PersonalAreaPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
