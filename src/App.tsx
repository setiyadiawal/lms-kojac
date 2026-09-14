import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute, RoleRoute } from './components/RouteGuards';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PendingPage } from './pages/PendingPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ExamPage, FeedbackPage, LearningPage, PracticePage, ProgressPage } from './pages/ModulePages';
import { AdminPage } from './pages/AdminPage';
import { HiraganaPage } from './pages/HiraganaPage';
import { KatakanaPage } from './pages/KatakanaPage';
import { VocabularyPage } from './pages/VocabularyPage';
import { KanjiPage } from './pages/KanjiPage';
import { GrammarPage } from './pages/GrammarPage';
import { ReadingPage } from './pages/ReadingPage';
import { ListeningPage } from './pages/ListeningPage';

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/pending" element={<PendingPage />} />
    <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="belajar" element={<LearningPage />} />
      <Route path="belajar/hiragana" element={<HiraganaPage />} />
      <Route path="belajar/katakana" element={<KatakanaPage />} />
      <Route path="belajar/kosakata" element={<VocabularyPage />} />
      <Route path="belajar/kosakata/:chapterNumber" element={<VocabularyPage />} />
      <Route path="belajar/kanji" element={<KanjiPage />} />
      <Route path="belajar/kanji/:level" element={<KanjiPage />} />
      <Route path="belajar/tata-bahasa" element={<GrammarPage />} />
      <Route path="belajar/reading" element={<ReadingPage />} />
      <Route path="belajar/listening" element={<ListeningPage />} />
      <Route path="latihan" element={<PracticePage />} />
      <Route path="jlpt" element={<ExamPage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="kritik-saran" element={<FeedbackPage />} />
      <Route path="admin" element={<RoleRoute minimum="administrator"><AdminPage /></RoleRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
