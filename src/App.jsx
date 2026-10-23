import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { GolfProvider } from '@/lib/GolfContext';
import AppShell from '@/components/AppShell';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import Rangefinder from '@/pages/Rangefinder';
import Home from '@/pages/Home';
import Bag from '@/pages/Bag';
import Caddie from '@/pages/Caddie';
import Scorecard from '@/pages/Scorecard';
import Swing from '@/pages/Swing';
import Rounds from '@/pages/Rounds';
import More from '@/pages/More';
import Drills from '@/pages/Drills';
import CourseLab from '@/pages/CourseLab';
import TourSuite from '@/pages/TourSuite';
import GreenReader from '@/pages/GreenReader';
import ShotHistory from '@/pages/ShotHistory';
import ShotStudio from '@/pages/ShotStudio';
import Biometrics from '@/pages/Biometrics';
import Pairing from '@/pages/Pairing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center font-body">
          <p className="text-xs font-semibold text-muted-foreground">Taking you to the sign-in screen…</p>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<GolfProvider><AppShell /></GolfProvider>}>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Rangefinder />} />
        <Route path="/bag" element={<Bag />} />
        <Route path="/caddie" element={<Caddie />} />
        <Route path="/scorecard" element={<Scorecard />} />
        <Route path="/swing" element={<Swing />} />
        <Route path="/rounds" element={<Rounds />} />
        <Route path="/more" element={<More />} />
        <Route path="/drills" element={<Drills />} />
        <Route path="/course-lab" element={<CourseLab />} />
        <Route path="/tour-suite" element={<TourSuite />} />
        <Route path="/green-reader" element={<GreenReader />} />
          <Route path="/shot-history" element={<ShotHistory />} />
          <Route path="/shot-studio" element={<ShotStudio />} />
          <Route path="/biometrics" element={<Biometrics />} />
          <Route path="/pairing" element={<Pairing />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AppErrorBoundary>
            <AuthenticatedApp />
          </AppErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App