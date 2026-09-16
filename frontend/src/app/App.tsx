import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AboutPage } from '../pages/AboutPage';
import { DashboardPage } from '../pages/DashboardPage';
import { GamePage } from '../pages/GamePage';
import { GamesPage } from '../pages/GamesPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ProgressPage } from '../pages/ProgressPage';
import { RegisterPage } from '../pages/RegisterPage';
import { releaseStage } from '../config/release';

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="games" element={releaseStage >= 2 ? <GamesPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="games/:gameCode/:level" element={releaseStage >= 2 ? <GamePage /> : <Navigate to="/dashboard" replace />} />
          <Route path="progress" element={releaseStage >= 6 ? <ProgressPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="profile" element={releaseStage >= 6 ? <ProfilePage /> : <Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
