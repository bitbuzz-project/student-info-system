// src/App.jsx - Updated version
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Components
import LoginForm from './components/Auth/LoginForm';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Dashboard from './components/Student/Dashboard';
import Loading from './components/common/Loading';
import StudentRequests from './components/Student/StudentRequests';
import DocumentVerification from './components/DocumentVerification';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminProtectedRoute from './components/Admin/AdminProtectedRoute';
import StudentCardRequests from './components/Admin/StudentCardRequests';
import LaureatManagement from './components/Admin/LaureatManagement'; // <--- ADD THIS IMPORT
function App() {
  const { isLoading } = useAuth();
  const location = useLocation();
  
  // Don't show loading for public routes
  const isPublicRoute = location.pathname.startsWith('/verify-document');
  
  if (isLoading && !isPublicRoute) {
    return <Loading message="جاري فحص حالة المصادقة... Checking authentication..." />;
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES - Handle both with and without token */}
      <Route path="/verify-document/:token" element={<DocumentVerification />} />
      <Route path="/verify-document" element={<DocumentVerification />} />
      
      {/* STUDENT ROUTES */}
      <Route path="/login" element={<LoginForm />} />
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/requests" 
        element={
          <ProtectedRoute>
            <StudentRequests />
          </ProtectedRoute>
        } 
      />
      
      {/* ADMIN ROUTES */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route 
        path="/admin/dashboard/*" 
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        } 
      />
      <Route path="/admin/laureats" element={
  <AdminProtectedRoute>
    <LaureatManagement />
  </AdminProtectedRoute>
} />
      <Route 
        path="/admin/student-card-requests" 
        element={
          <AdminProtectedRoute>
            <StudentCardRequests />
          </AdminProtectedRoute>
        } 
      />
      <Route 
        path="/admin/*" 
        element={<Navigate to="/admin/dashboard" replace />} 
      />

      {/* DEFAULT REDIRECTS */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* CATCH ALL ROUTE - Must be last */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;