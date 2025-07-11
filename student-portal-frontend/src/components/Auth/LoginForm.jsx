// src/components/Auth/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Divider,
  Stack
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm = () => {
  const [cin, setCin] = useState('');
  const [password, setPassword] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!cin.trim() || !password.trim()) {
      return;
    }

    const result = await login(cin.trim(), password.trim());
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'fr' : 'ar';
    i18n.changeLanguage(newLang);
    // document.dir is handled by main.jsx's ThemeProvider direction property and CacheProvider stylisPlugins
    // No need to set it manually here unless you want immediate DOM update before React re-render
  };

  const fillDemoCredentials = () => {
    setCin('BK640175');
    setPassword('20230001');
    setShowDemo(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        // Removed `direction` from here, as it's set globally in main.jsx ThemeProvider
        // Setting it here can cause conflicts with MUI's RTL handling via emotion cache
      }}
    >
      {/* You previously removed Container. Let's ensure proper centering without it. */}
      {/* The Paper component itself needs to be horizontally centered within the flex Box. */}
      <Paper
        elevation={24}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          width: '100%',
          maxWidth: '500px', // Example fixed width for the form container
          margin: 'auto', // <--- ADD THIS LINE for horizontal centering
          // Ensure specific overrides for RTL direction on text alignment if needed,
          // but MUI usually handles this with the `direction: 'rtl'` on the theme.
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
            color: 'white',
            padding: 4,
            textAlign: 'center'
          }}
        >
          <SchoolIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" gutterBottom fontWeight="300">
            {t('welcome')}
          </Typography>
          <Typography variant="h6" opacity={0.9}>
            {t('studentSystem')}
          </Typography>
        </Box>

        <CardContent sx={{ padding: 4 }}>
          {/* Language Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Button
              onClick={toggleLanguage}
              variant="outlined"
              size="small"
              sx={{ borderRadius: 3 }}
            >
              {i18n.language === 'ar' ? 'Français' : 'العربية'}
            </Button>
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
                label={t('cinLabel')}
                placeholder={t('enterCin')}
                value={cin}
                onChange={(e) => setCin(e.target.value)}
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
                label={t('passwordLabel')}
                placeholder={t('enterPassword')}
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
                disabled={isLoading || !cin.trim() || !password.trim()}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2980b9 0%, #3498db 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(52, 152, 219, 0.4)'
                  }
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t('loginButton')
                )}
              </Button>
            </Stack>
          </form>

          {/* Demo Section */}
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                للاختبار - For Testing
              </Typography>
            </Divider>
            
            {!showDemo ? (
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setShowDemo(true)}
                sx={{ borderRadius: 2 }}
              >
                عرض بيانات تجريبية - Show Demo Credentials
              </Button>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  بيانات تجريبية - Demo Credentials:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                  CIN: BK640175<br />
                  Password: 20230001
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={fillDemoCredentials}
                  size="small"
                  sx={{ borderRadius: 2 }}
                >
                  استخدام البيانات التجريبية - Use Demo Data
                </Button>
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {i18n.language === 'ar' 
                ? 'استخدم رقم بطاقة التعريف الوطنية ورقم الطالب لتسجيل الدخول'
                : 'Utilisez votre CIN et code étudiant pour vous connecter'
              }
            </Typography>
          </Box>
        </CardContent>
      </Paper>
    </Box>
  );
};

export default LoginForm;