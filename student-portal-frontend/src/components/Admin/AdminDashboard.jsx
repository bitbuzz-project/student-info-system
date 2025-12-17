import React, { useState } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
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
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Button
} from '@mui/material';
import {
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,  // ADD THIS LINE
  Sync as SyncIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  School as SchoolIcon, // <--- ADD THIS ICON
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  CreditCard as CreditCardIcon, // Icon for card requests

  Home as HomeIcon
} from '@mui/icons-material';
import { useAdmin } from '../../contexts/AdminContext';
import { useNavigate } from 'react-router-dom';
import ModuleManagement from './ModuleManagement';
import StudentCardRequests from './StudentCardRequests';
import EmployeeManagement from './EmployeeManagement';

// Import admin page components (we'll create these next)
import AdminOverview from './AdminOverview';
import StudentManagement from './StudentManagement';
import SyncManagement from './SyncManagement';
import SystemHealth from './SystemHealth';
import StudentRegistrations from './StudentRegistrations';
import LaureatManagement from './LaureatManagement'; // <--- ADD THIS IMPORT
const DRAWER_WIDTH = 280;

const AdminDashboard = () => {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentPage, setCurrentPage] = useState('overview');
  const [mobileMenu, setMobileMenu] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenu(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenu(null);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const navigationItems = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      icon: <DashboardIcon />,
      color: '#3498db'
    },
      {
    id: 'registrations',  // NEW ITEM
    label: 'Student Registrations',
    icon: <PersonAddIcon />,
    color: '#27ae60'
  },
    {
      id: 'students',
      label: 'Student Management',
      icon: <PeopleIcon />,
      color: '#2ecc71'
    },
      {
    id: 'modules',  // ← ADD THIS
    label: 'Module Management',
    icon: <SettingsIcon />,
    color: '#f39c12'
  },
  {
      id: 'laureats',
      label: 'Gestion des Lauréats',
      icon: <SchoolIcon />,
      color: '#8e44ad'
    },
    {
      id: 'hr', // ID for HR
      label: 'Ressources Humaines',
      icon: <PeopleIcon />, // You can reuse PeopleIcon or import BadgeIcon
      color: '#ff9800' // Orange color
    },
    {
      id: 'sync',
      label: 'Data Synchronization',
      icon: <SyncIcon />,
      color: '#e74c3c'
    },
      {
    id: 'card-requests',
    label: 'Student Card Requests',
    icon: <CreditCardIcon />,
    color: '#1abc9c'
  },
    {
      id: 'system',
      label: 'System Health',
      icon: <AssessmentIcon />,
      color: '#9b59b6'
    }
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case 'overview':
        return <AdminOverview onNavigate={handlePageChange} />;
           case 'registrations':  // NEW CASE
      return <StudentRegistrations />;
      case 'students':
        return <StudentManagement />;
            case 'modules':  // ← ADD THIS CASE
      return <ModuleManagement />;
      case 'hr':
    return <EmployeeManagement />;
      case 'sync':
        return <SyncManagement />;
      case 'system':
        return <SystemHealth />;
        case 'laureats':                 // <--- ADD THIS CASE
        return <LaureatManagement />;
      case 'card-requests':
        return <StudentCardRequests />;
      default:
        return <AdminOverview onNavigate={handlePageChange} />;
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#f8f9fa' }}>
      {/* Drawer Header */}
      <Box 
        sx={{ 
          p: 3, 
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          color: 'white',
          textAlign: 'center'
        }}
      >
        <AdminIcon sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h6" fontWeight="600">
          Admin Portal
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          System Management
        </Typography>
      </Box>

      {/* Admin Info */}
      {admin && (
        <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'white', mx: 2, mt: 2, borderRadius: 3 }}>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              mx: 'auto',
              mb: 2,
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            {admin.username?.charAt(0).toUpperCase() || 'A'}
          </Avatar>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            {admin.username}
          </Typography>
          <Chip 
            label="Administrator" 
            color="error" 
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Logged in: {new Date(admin.loginTime).toLocaleTimeString()}
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
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 1, borderRadius: 3 }}
        >
          Student Portal
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ borderRadius: 3 }}
        >
          Logout
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
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <AdminIcon sx={{ mr: 2, display: { xs: 'none', md: 'block' } }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Student Information System - Admin
          </Typography>

          {/* Desktop admin info */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            {admin && (
              <>
                <Typography variant="body2">
                  Welcome, {admin.username}
                </Typography>
                <IconButton
                  color="inherit"
                  onClick={handleMobileMenuOpen}
                >
                  <MoreVertIcon />
                </IconButton>
              </>
            )}
          </Box>

          {/* Mobile menu */}
          <Menu
            anchorEl={mobileMenu}
            open={Boolean(mobileMenu)}
            onClose={handleMobileMenuClose}
          >
            <MenuItem onClick={() => { navigate('/'); handleMobileMenuClose(); }}>
              <ListItemIcon><HomeIcon fontSize="small" /></ListItemIcon>
              Student Portal
            </MenuItem>
            <MenuItem onClick={() => { handleLogout(); handleMobileMenuClose(); }}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
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
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#f5f5f5',
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}
      >
        <Box sx={{ p: 3, width: '100%', maxWidth: '1400px', mx: 'auto' }}>
          {renderPageContent()}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;