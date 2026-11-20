import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { ReportPage } from './pages/ReportPage';
import { JusticePage } from './pages/JusticePage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { MobilisePage } from './pages/MobilisePage';
import { PetitionDetailPage } from './pages/PetitionDetailPage';
import { TimelinePage } from './pages/TimelinePage';
import { DashboardPage } from './pages/DashboardPage';
import { CommunityPage } from './pages/CommunityPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { AdvocatePortalPage } from './pages/AdvocatePortalPage';
import { AdminPage } from './pages/AdminPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AboutPage } from './pages/AboutPage';
import { AssistantPage } from './pages/AssistantPage';
import { AuthPage } from './pages/AuthPage';
import { LiveFeedPage } from './pages/LiveFeedPage';
import { TrendingPage } from './pages/TrendingPage';
import { MessengerUpdatesPage } from './pages/MessengerUpdatesPage';

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <RouteEffects />
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/justice" element={<JusticePage />} />
            <Route path="/cases/:ref" element={<CaseDetailPage />} />
            <Route path="/mobilise" element={<MobilisePage />} />
            <Route path="/petitions/:id" element={<PetitionDetailPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/live-feed" element={<LiveFeedPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/messenger-updates" element={<MessengerUpdatesPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/advocate-portal" element={<AdvocatePortalPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </AppProvider>
    </BrowserRouter>
  );
}
