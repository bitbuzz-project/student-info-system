import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Divider
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAdmin } from '../../contexts/AdminContext';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    const result = await login(username.trim(), password.trim());
    if (result.success) {
      navigate('/admin/dashboard');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          width: '100%',
          maxWidth: '450px',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: 'white',
            padding: 4,
            textAlign: 'center'
          }}
        >
          <AdminIcon sx={{ fontSize: 56, mb: 2 }} />
          <Typography variant="h4" fontWeight="600" gutterBottom>
            Admin Portal
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Administrative Access Only
          </Typography>
        </Box>

        <CardContent sx={{ padding: 4 }}>
          {/* Security Notice */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3, 
              p: 2, 
              bgcolor: '#fff3cd',
              borderRadius: 2,
              border: '1px solid #ffeaa7'
            }}
          >
            <SecurityIcon sx={{ mr: 2, color: '#f39c12' }} />
            <Typography variant="body2" color="#856404">
              Authorized personnel only. All activities are logged.
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Admin Username"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              <TextField
                fullWidth
                type="password"
                label="Admin Password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 1, color: 'primary.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading || !username.trim() || !password.trim()}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(231, 76, 60, 0.4)'
                  }
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Access Admin Panel'
                )}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }} />

          {/* Back to Student Portal */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="text"
              onClick={() => navigate('/')}
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: 'primary.main'
                }
              }}
            >
              ← Back to Student Portal
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              For technical support, contact the IT department
            </Typography>
          </Box>
        </CardContent>
      </Paper>
    </Box>
  );
};

export default AdminLogin;