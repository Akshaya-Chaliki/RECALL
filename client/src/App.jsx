import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import QuizPage from "./pages/QuizPage";
import SkillDetailPage from "./pages/SkillDetailPage";
import TopicAnalyticsPage from "./pages/TopicAnalyticsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/skills/:skillId/topics" element={<ProtectedRoute><SkillDetailPage /></ProtectedRoute>} />
          <Route path="/dashboard/:topicId" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/quiz/:topicId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/topics/:topicId/analytics" element={<ProtectedRoute><TopicAnalyticsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
