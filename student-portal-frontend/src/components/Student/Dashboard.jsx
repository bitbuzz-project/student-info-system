import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import StudentNavigation from './StudentNavigation';
import StudentProfile from './StudentProfile';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentTab, setCurrentTab] = useState('profile');
  const [languageMenu, setLanguageMenu] = useState(null);

  const handleLogout = () => {
    logout();
  };

  const handleTabChange = (newTab) => {
    setCurrentTab(newTab);
  };

  const handleLanguageMenuOpen = (event) => {
    setLanguageMenu(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageMenu(null);
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
    handleLanguageMenuClose();
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'profile':
        return <StudentProfile />;
      case 'grades':
        return (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              📊 Grades Section
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Coming in Step 5! This will show your detailed grades with filtering.
            </Typography>
          </Box>
        );
      case 'stats':
        return (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              📈 Statistics Section
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Coming in Step 6! This will show your grade statistics and charts.
            </Typography>
          </Box>
        );
      default:
        return <StudentProfile />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' }}>
        <Toolbar>
          <SchoolIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('studentSystem')}
          </Typography>
          
          {/* Language Toggle */}
          <IconButton
            color="inherit"
            onClick={handleLanguageMenuOpen}
            sx={{ mr: 1 }}
          >
            <LanguageIcon />
          </IconButton>
          <Menu
            anchorEl={languageMenu}
            open={Boolean(languageMenu)}
            onClose={handleLanguageMenuClose}
          >
            <MenuItem onClick={() => changeLanguage('ar')}>
              العربية
            </MenuItem>
            <MenuItem onClick={() => changeLanguage('fr')}>
              Français
            </MenuItem>
          </Menu>
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                {user.nom_complet?.charAt(0) || user.cod_etu?.charAt(0) || 'S'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2">
                  {user.nom_complet || user.cod_etu}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {user.etape}
                </Typography>
              </Box>
              <Button
                color="inherit"
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                sx={{ ml: 1 }}
              >
                {t('logout')}
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <StudentNavigation currentTab={currentTab} onTabChange={handleTabChange} />
        
        <Box sx={{ 
          background: 'white', 
          borderRadius: 3, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {renderTabContent()}
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;