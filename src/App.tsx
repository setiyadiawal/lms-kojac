import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute, RoleRoute } from './components/RouteGuards';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PendingPage } from './pages/PendingPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { FeedbackPage, LearningPage } from './pages/ModulePages';
import { PracticePage } from './pages/PracticePage';
import { CrossChapterPractice } from './features/practice/CrossChapterPractice';
import { CrossChapterVocabularyQuizPage } from './features/practice/CrossChapterVocabularyQuizPage';
import { CrossChapterKanjiQuizPage } from './features/practice/CrossChapterKanjiQuizPage';
import { CrossChapterGrammarQuizPage } from './features/practice/CrossChapterGrammarQuizPage';
import { ProgressPage } from './pages/ProgressPage';
import { JlptSimulationPage } from './pages/JlptSimulationPage';
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
import { ManagementInvoicesPage } from './pages/ManagementInvoicesPage';
import { MyInvoicesPage } from './pages/MyInvoicesPage';
import { InvoicePrintPage } from './pages/InvoicePrintPage';
import { ManagementDashboardPage } from './pages/ManagementDashboardPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { ManagementHonorPage } from './pages/ManagementHonorPage';
import { ManagementHonorPaymentsPage } from './pages/ManagementHonorPaymentsPage';
import { ManagementDocumentNumbersPage } from './pages/ManagementDocumentNumbersPage';
import { ManagementTeacherMonthlyReportPage } from './pages/ManagementTeacherMonthlyReportPage';
import { TeacherMonthlyReportsPage } from './pages/TeacherMonthlyReportsPage';
import { TeacherMonthlyReportPrintPage } from './pages/TeacherMonthlyReportPrintPage';
import { TeacherHonorPage } from './pages/TeacherHonorPage';
import { HonorSlipPage } from './pages/HonorSlipPage';
import { HonorReceiptPage } from './pages/HonorReceiptPage';

const HiraganaPage = lazy(() => import('./pages/HiraganaPage').then((module) => ({ default: module.HiraganaPage })));
const KatakanaPage = lazy(() => import('./pages/KatakanaPage').then((module) => ({ default: module.KatakanaPage })));
const VocabularyPage = lazy(() => import('./pages/VocabularyPage').then((module) => ({ default: module.VocabularyPage })));
const KanjiPage = lazy(() => import('./pages/KanjiPage').then((module) => ({ default: module.KanjiPage })));
const GrammarPage = lazy(() => import('./pages/GrammarPage').then((module) => ({ default: module.GrammarPage })));
const ReadingPage = lazy(() => import('./pages/ReadingPage').then((module) => ({ default: module.ReadingPage })));
const ListeningPage = lazy(() => import('./pages/ListeningPage').then((module) => ({ default: module.ListeningPage })));
const LiveClassroomPage = lazy(() => import('./features/live-classroom/LiveClassroomPage').then((module) => ({ default: module.LiveClassroomPage })));

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
      <Route path="tagihan-saya" element={<MyInvoicesPage />} />
      <Route path="invoice/:invoiceId" element={<InvoiceDetailPage />} />
      <Route path="tagihan-saya" element={<MyInvoicesPage />} />
      <Route path="rekaman-kelas" element={<ClassRecordingsPage />} />
      <Route path="pengajar/upload-video" element={<UploadClassRecordingPage />} />
      <Route path="pengajar/dashboard" element={<TeacherDashboardPage />} />
      <Route path="pengajar/honor" element={<TeacherHonorPage />} />
      <Route path="pengajar/laporan-bulanan" element={<TeacherMonthlyReportsPage />} />
      <Route path="pengajar/tugas" element={<TeacherAssignmentsPage />} />
      <Route path="kelas-mengajar" element={<TeachingClassesPage />} />
      <Route path="kelas-mengajar/:classId/laporan" element={<TeachingReportsPage />} />
      <Route path="kelas-live/:classId" element={<LazyModule><LiveClassroomPage /></LazyModule>} />
      <Route path="rekap-kelas" element={<ManagementClassRecapPage />} />
      <Route path="manajemen/dashboard" element={<RoleRoute minimum="administrator"><ManagementDashboardPage /></RoleRoute>} />
      <Route path="manajemen/siswa" element={<RoleRoute minimum="administrator"><ManagementStudentsPage /></RoleRoute>} />
      <Route path="manajemen/pengajar" element={<RoleRoute minimum="administrator"><ManagementTeachersPage /></RoleRoute>} />
      <Route path="manajemen/kritik-saran" element={<RoleRoute minimum="administrator"><ManagementFeedbackPage /></RoleRoute>} />
      <Route path="manajemen/laporan-pembelajaran" element={<RoleRoute minimum="administrator"><ManagementTeachingReportsPage /></RoleRoute>} />
      <Route path="manajemen/invoice" element={<RoleRoute minimum="administrator"><ManagementInvoicesPage /></RoleRoute>} />
      <Route path="manajemen/honor" element={<RoleRoute minimum="administrator"><ManagementHonorPage /></RoleRoute>} />
      <Route path="manajemen/pembayaran-honor" element={<RoleRoute minimum="administrator"><ManagementHonorPaymentsPage /></RoleRoute>} />
      <Route path="manajemen/nomor-dokumen" element={<RoleRoute minimum="administrator"><ManagementDocumentNumbersPage /></RoleRoute>} />
      <Route path="manajemen/laporan-pengajar-bulanan" element={<RoleRoute minimum="administrator"><ManagementTeacherMonthlyReportPage /></RoleRoute>} />
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
      <Route path="latihan/flashcard" element={<CrossChapterPractice />} />
      <Route path="latihan/vocabulary" element={<CrossChapterVocabularyQuizPage />} />
      <Route path="latihan/kanji" element={<CrossChapterKanjiQuizPage />} />
      <Route path="latihan/grammar" element={<CrossChapterGrammarQuizPage />} />
      <Route path="latihan/sesi" element={<CrossChapterPractice />} />
      <Route path="jlpt" element={<JlptSimulationPage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="invoice/:invoiceId" element={<InvoicePrintPage />} />
      <Route path="honor/slip/:payrollId" element={<HonorSlipPage />} />
      <Route path="honor/kwitansi/:payrollId" element={<HonorReceiptPage />} />
      <Route path="laporan-pengajar-bulanan/:reportId" element={<TeacherMonthlyReportPrintPage />} />
      <Route path="kritik-saran" element={<FeedbackPage />} />
      <Route path="admin" element={<RoleRoute minimum="administrator"><AdminPage /></RoleRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

