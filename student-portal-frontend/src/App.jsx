// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Student Components
import LoginForm from './components/Auth/LoginForm';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Dashboard from './components/Student/Dashboard';
import Loading from './components/common/Loading';
import StudentRequests from './components/Student/StudentRequests'; // 1. Import the new component

// Admin Components
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminProtectedRoute from './components/Admin/AdminProtectedRoute';

function App() {
  const { isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <Loading message="جاري فحص حالة المصادقة... Checking authentication..." />;
  }

  return (
    <Routes>
      {/* Student Routes */}
      <Route path="/login" element={<LoginForm />} />
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
        
    
      {/* Admin Routes */}
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
        path="/admin/*" 
        element={<Navigate to="/admin/dashboard" replace />} 
      />
      
      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      <Route path="requests" element={<StudentRequests />} />
    </Routes>
  );
}

export default App;