import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute, RoleRoute } from './components/RouteGuards';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PendingPage } from './pages/PendingPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ExamPage, FeedbackPage, LearningPage, PracticePage, ProgressPage } from './pages/ModulePages';
import { AdminPage } from './pages/AdminPage';
import { MyClassesPage } from './pages/MyClassesPage';
import { ClassRecordingsPage } from './pages/ClassRecordingsPage';
import { UploadClassRecordingPage } from './pages/UploadClassRecordingPage';
import { NotificationCenterPage } from './pages/NotificationCenterPage';
import { StudentAssignmentsPage } from './pages/StudentAssignmentsPage';
import { TeacherAssignmentsPage } from './pages/TeacherAssignmentsPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { TeachingClassesPage } from './pages/TeachingClassesPage';
import { TeachingReportsPage } from './pages/TeachingReportsPage';
import { ManagementClassRecapPage } from './pages/ManagementClassRecapPage';
import { ManagementStudentsPage } from './pages/ManagementStudentsPage';
import { ManagementFeedbackPage } from './pages/ManagementFeedbackPage';
import { ManagementTeachersPage } from './pages/ManagementTeachersPage';
import { ManagementTeachingReportsPage } from './pages/ManagementTeachingReportsPage';
import { ManagementDashboardPage } from './pages/ManagementDashboardPage';

const HiraganaPage = lazy(() => import('./pages/HiraganaPage').then((module) => ({ default: module.HiraganaPage })));
const KatakanaPage = lazy(() => import('./pages/KatakanaPage').then((module) => ({ default: module.KatakanaPage })));
const VocabularyPage = lazy(() => import('./pages/VocabularyPage').then((module) => ({ default: module.VocabularyPage })));
const KanjiPage = lazy(() => import('./pages/KanjiPage').then((module) => ({ default: module.KanjiPage })));
const GrammarPage = lazy(() => import('./pages/GrammarPage').then((module) => ({ default: module.GrammarPage })));
const ReadingPage = lazy(() => import('./pages/ReadingPage').then((module) => ({ default: module.ReadingPage })));
const ListeningPage = lazy(() => import('./pages/ListeningPage').then((module) => ({ default: module.ListeningPage })));

function LazyModule({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="full-center">Memuat modul KOJAC…</div>}>
      {children}
    </Suspense>
  );
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/pending" element={<PendingPage />} />
    <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="notifikasi" element={<NotificationCenterPage />} />
      <Route path="kelas-saya" element={<MyClassesPage />} />
      <Route path="tugas-saya" element={<StudentAssignmentsPage />} />
      <Route path="rekaman-kelas" element={<ClassRecordingsPage />} />
      <Route path="pengajar/upload-video" element={<UploadClassRecordingPage />} />
      <Route path="pengajar/dashboard" element={<TeacherDashboardPage />} />
      <Route path="pengajar/tugas" element={<TeacherAssignmentsPage />} />
      <Route path="kelas-mengajar" element={<TeachingClassesPage />} />
      <Route path="kelas-mengajar/:classId/laporan" element={<TeachingReportsPage />} />
      <Route path="rekap-kelas" element={<ManagementClassRecapPage />} />
      <Route path="manajemen/dashboard" element={<RoleRoute minimum="administrator"><ManagementDashboardPage /></RoleRoute>} />
      <Route path="manajemen/siswa" element={<RoleRoute minimum="administrator"><ManagementStudentsPage /></RoleRoute>} />
      <Route path="manajemen/pengajar" element={<RoleRoute minimum="administrator"><ManagementTeachersPage /></RoleRoute>} />
      <Route path="manajemen/kritik-saran" element={<RoleRoute minimum="administrator"><ManagementFeedbackPage /></RoleRoute>} />
      <Route path="manajemen/laporan-pembelajaran" element={<RoleRoute minimum="administrator"><ManagementTeachingReportsPage /></RoleRoute>} />
      <Route path="belajar" element={<LearningPage />} />
      <Route path="belajar/hiragana" element={<LazyModule><HiraganaPage /></LazyModule>} />
      <Route path="belajar/katakana" element={<LazyModule><KatakanaPage /></LazyModule>} />
      <Route path="belajar/kosakata" element={<LazyModule><VocabularyPage /></LazyModule>} />
      <Route path="belajar/kosakata/:chapterNumber" element={<LazyModule><VocabularyPage /></LazyModule>} />
      <Route path="belajar/kanji" element={<LazyModule><KanjiPage /></LazyModule>} />
      <Route path="belajar/kanji/:level" element={<LazyModule><KanjiPage /></LazyModule>} />
      <Route path="belajar/tata-bahasa" element={<LazyModule><GrammarPage /></LazyModule>} />
      <Route path="belajar/reading" element={<LazyModule><ReadingPage /></LazyModule>} />
      <Route path="belajar/listening" element={<LazyModule><ListeningPage /></LazyModule>} />
      <Route path="latihan" element={<PracticePage />} />
      <Route path="jlpt" element={<ExamPage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="kritik-saran" element={<FeedbackPage />} />
      <Route path="admin" element={<RoleRoute minimum="administrator"><AdminPage /></RoleRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

