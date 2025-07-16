// src/components/Student/Dashboard.jsx
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
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  BarChart as StatsIcon,
  Dashboard as DashboardIcon,
  Menu as MenuIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon  // Ajoutez cette ligne
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import OfficialDocuments from './OfficialDocuments';

// Import page components
import DashboardHome from './DashboardHome';
import StudentProfile from './StudentProfile';
import StudentGrades from './StudentGrades';
import StudentStats from './StudentStats';
import PedagogicalSituation from './PedagogicalSituation';

const DRAWER_WIDTH = 280;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [languageMenu, setLanguageMenu] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  const handleLogout = () => {
    logout();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (isMobile) {
      setDrawerOpen(false);
    }
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

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: <DashboardIcon />,
      color: '#3498db'
    },
    {
      id: 'profile',
      label: ' بياناتي الشخصية ',
      icon: <PersonIcon />,
      color: '#2ecc71'
    },
      {
    id: 'pedagogical',
    label: 'الوضعية البيداغوجية',
    icon: <AssignmentIcon />, // Make sure to import AssignmentIcon from @mui/icons-material
    color: '#f39c12'
  },

   // Add this new item
  {
    id: 'documents',
    label: 'كشوفات النقط',
    icon: <DescriptionIcon />, // You'll need to import this
    color: '#9b59b6'
  },
    {
      id: 'grades',
      label: 'النقط والنتائج',
      icon: <GradeIcon />,
      color: '#e74c3c'
    },
    {
      id: 'stats',
      label: 'الإحصائيات - Statistics',
      icon: <StatsIcon />,
      color: '#9b59b6'
    }
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardHome onNavigate={handlePageChange} />;
      case 'profile':
        return <StudentProfile />;
      case 'pedagogical':
      return <PedagogicalSituation />;
       case 'documents':
      return <OfficialDocuments />; // We'll create this component next
      case 'grades':
        return <StudentGrades />;
      case 'stats':
        return <StudentStats />;
      default:
        return <DashboardHome onNavigate={handlePageChange} />;
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#f8f9fa' }}>
      {/* Drawer Header */}
      <Box 
        sx={{ 
          p: 3, 
          background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
          color: 'white',
          textAlign: 'center'
        }}
      >
     
 
      </Box>

      {/* User Info */}
      {user && (
        <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'white', mx: 2, mt: 2, borderRadius: 3 }}>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              mx: 'auto',
              mb: 2,
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            {user.nom_complet?.charAt(0) || user.cod_etu?.charAt(0) || 'S'}
          </Avatar>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            {user.nom_complet || user.cod_etu}
          </Typography>
          {user.nom_arabe && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                direction: 'rtl',
                fontFamily: 'Arabic UI Text, Arial',
                mb: 1
              }}
            >
              {user.nom_arabe}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {user.etape}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {user.cod_etu}
          </Typography>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ mt: 2 }}>
        <List sx={{ px: 2 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handlePageChange(item.id)}
                selected={currentPage === item.id}
                sx={{
                  borderRadius: 3,
                  '&.Mui-selected': {
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}CC 100%)`,
                    color: 'white',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${item.color}CC 0%, ${item.color} 100%)`,
                    }
                  },
                  '&:hover': {
                    background: `${item.color}15`,
                  }
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: currentPage === item.id ? 'white' : item.color,
                    minWidth: 40 
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: currentPage === item.id ? 600 : 500,
                    fontSize: '0.9rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Button
          fullWidth
          variant="outlined"
          color="error"
       
          onClick={handleLogout}
          sx={{ borderRadius: 3 }}
        >
          {t('logout')}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top AppBar */}
       <AppBar
    position="fixed"
    sx={{
      zIndex: theme.zIndex.drawer + 1,
      background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)'
    }}
  >
    <Toolbar>
      {/* Group for Leading Elements (Menu Icon, School Icon, Student System Title) */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton
          color="inherit"
          edge="start" // edge="start" handles margin based on direction
          onClick={toggleDrawer}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* School Icon (visible on desktop) */}
        <SchoolIcon sx={{ mr: 2, display: { xs: 'none', md: 'block' } }} />
        {/* Student System Title */}
        <Typography variant="h6" component="div">
          {t('studentSystem')}
        </Typography>
      </Box>

      {/* Flexible Spacer - This pushes the above group to the start and the following group to the end */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Group for Trailing Elements (Language Toggle, Mobile User Info) */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
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

        {/* Mobile User Info (visible on mobile) */}
        {user && (
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', ml: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
              {user.nom_complet?.charAt(0) || 'S'}
            </Avatar>
          </Box>
        )}
      </Box>
    </Toolbar>
  </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            position: 'fixed',
            left: 0, // Force left positioning
            right: 'auto' // Override RTL right positioning
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content - Fixed positioning approach */}
      <Box
        component="main"
        sx={{
          position: 'fixed',
          top: '64px',
          left: { xs: 0, md: `${DRAWER_WIDTH}px` },
          right: 0,
          bottom: 0,
          bgcolor: '#f5f5f5',
          overflow: 'auto',
          // Override any RTL styles
          '&[dir="rtl"]': {
            left: { xs: 0, md: `${DRAWER_WIDTH}px` },
            right: 0
          }
        }}
      >
        <Container maxWidth="xl" sx={{ py: 3, width: '100%', height: '100%' }}>
          <Box sx={{ direction: i18n.language === 'ar' ? 'ltr' : 'rtl' }}>
            {renderPageContent()}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;