import { Component, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { OnboardingWizard } from "./components/OnboardingWizard.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { AppPage } from "./pages/AppPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { ForgePage } from "./pages/ForgePage.jsx";
import { ForgeLessonPage } from "./pages/ForgeLessonPage.jsx";
import { ForgeSubjectPage } from "./pages/ForgeSubjectPage.jsx";
import { AboutPage } from "./pages/AboutPage.jsx";
import { LandingPage, PublicLandingPage } from "./pages/LandingPage.jsx";
import { LeaderboardPage } from "./pages/LeaderboardPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { TimetablePage } from "./pages/TimetablePage.jsx";
import { DailyChallengePage } from "./pages/DailyChallengePage.jsx";
import { ContactPage, PrivacyPage, TermsPage } from "./pages/LegalPage.jsx";
import { canAccessAdmin } from "./utils/permissions.js";

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-text-primary p-6">
      <div className="flex flex-col items-center gap-4">
        <div
          className="loading-spinner-lg animate-spin-slow rounded-full border-primary/20 border-t-primary"
          style={{ willChange: "transform" }}
          role="status"
          aria-label="Loading"
        />
        <p className="loading-overlay-subtitle font-bold tracking-widest uppercase text-text-muted">Loading</p>
      </div>
    </main>
  );
}

function ServiceUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-text-primary p-6">
      <div className="card max-w-md p-6 sm:p-8 text-center">
        <h1 className="text-xl font-extrabold tracking-tight">Service unavailable</h1>
        <p className="mt-2 text-sm text-text-secondary">
          We&apos;re having trouble connecting. Please try again later.
        </p>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-text-primary p-6">
      <div className="card max-w-md p-6 sm:p-8 text-center">
        <h1 className="text-xl font-extrabold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-text-secondary">
          This page doesn&apos;t exist or was moved.
        </p>
        <Link to="/" className="btn-primary mt-5 inline-flex min-h-[44px] items-center">
          Go home
        </Link>
      </div>
    </main>
  );
}

class TopErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <main className="grid min-h-screen place-items-center bg-background text-text-primary p-6">
          <div className="card max-w-md p-6 sm:p-8 text-center">
            <h1 className="text-xl font-extrabold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Please try again. If it keeps happening, come back later.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary mt-5 inline-flex min-h-[44px] items-center"
            >
              Try again
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  if (online) return null;
  return (
    <p role="alert" className="sticky top-0 z-50 border-b border-warning/20 bg-warning/10 px-4 py-2 text-center text-[13px] font-bold text-warning">
      You&apos;re offline. Some features may be unavailable.
    </p>
  );
}

function ProtectedRoute({ children }) {
  const { isFirebaseConfigured, loading, user, profile, serviceUnavailable } = useAuth();
  if (loading) return <LoadingScreen />;
  if (serviceUnavailable) return <ServiceUnavailable />;
  if (!isFirebaseConfigured && !user) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <LoadingScreen />;
  if (!profile.onboardingCompleted || profile.name === "Lock-on Learner") return <OnboardingWizard />;
  return <AppShell>{children}</AppShell>;
}

function AdminRoute({ children }) {
  const { isFirebaseConfigured, loading, user, profile, serviceUnavailable } = useAuth();
  if (loading) return <LoadingScreen />;
  if (serviceUnavailable) return <ServiceUnavailable />;
  if (!isFirebaseConfigured && !user) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessAdmin(profile, user.email)) return <Navigate to="/app" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <TopErrorBoundary>
      <OfflineBanner />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<PublicLandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forge"
        element={
          <ProtectedRoute>
            <ForgePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forge/subject/:subjectId"
        element={
          <ProtectedRoute>
            <ForgeSubjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forge/lesson/:subjectId/:lessonId"
        element={
          <ProtectedRoute>
            <ForgeLessonPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <TimetablePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-challenge"
        element={
          <ProtectedRoute>
            <DailyChallengePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </TopErrorBoundary>
  );
}
