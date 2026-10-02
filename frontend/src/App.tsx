import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { LoginPage } from './pages/LoginPage';
import { LanguagePage } from './pages/LanguagePage';
import { CropsPage } from './pages/CropsPage';
import { ChatPage } from './pages/ChatPage';
import { MapPage } from './pages/MapPage';
import { FpoPage } from './pages/FpoPage';
import { BacktestPage } from './pages/BacktestPage';

/**
 * Route guard requiring the user to be authenticated and onboarded
 */
const RequireChatAccess: React.FC = () => {
  const { isLoggedIn, onboardingComplete, crops } = useAppStore();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!onboardingComplete || !crops || crops.length === 0) {
    return <Navigate to="/language" replace />;
  }

  return <Outlet />;
};

/**
 * Route guard requiring login before accessing onboarding steps
 */
const RequireLoginForOnboarding: React.FC = () => {
  const { isLoggedIn } = useAppStore();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

/**
 * Root Redirector based on user state
 */
const RootRedirect: React.FC = () => {
  const { isLoggedIn, onboardingComplete, crops } = useAppStore();

  if (isLoggedIn && onboardingComplete && crops && crops.length > 0) {
    return <Navigate to="/chat" replace />;
  }
  if (isLoggedIn) {
    return <Navigate to="/language" replace />;
  }
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Screen 1: Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Onboarding steps (Protected by login) */}
        <Route element={<RequireLoginForOnboarding />}>
          <Route path="/language" element={<LanguagePage />} />
          <Route path="/crops" element={<CropsPage />} />
        </Route>

        {/* Screen 4: Main Chat Assistant (Protected by login + onboarding) */}
        <Route element={<RequireChatAccess />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Route>

        {/* Auxiliary APMC tools */}
        <Route path="/map" element={<MapPage />} />
        <Route path="/fpo" element={<FpoPage />} />
        <Route path="/backtest" element={<BacktestPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
