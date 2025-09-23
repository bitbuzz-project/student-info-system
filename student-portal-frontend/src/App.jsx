// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Student Components
import LoginForm from './components/Auth/LoginForm';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Dashboard from './components/Student/Dashboard';
import Loading from './components/common/Loading';
import StudentRequests from './components/Student/StudentRequests';
import DocumentVerification from './components/DocumentVerification';

// Admin Components
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminProtectedRoute from './components/Admin/AdminProtectedRoute';
import StudentCardRequests from './components/Admin/StudentCardRequests';

function App() {
  const { isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <Loading message="جاري فحص حالة المصادقة... Checking authentication..." />;
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES - NO AUTHENTICATION REQUIRED */}
      <Route path="/verify-document/:token" element={<DocumentVerification />} />
      
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