// src/components/Student/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Avatar,
  Skeleton,
  Divider,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Grade as GradeIcon,
  Assignment as AssignmentIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';

const DashboardHome = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [quickStats, setQuickStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQuickStats();
  }, []);

  const loadQuickStats = async () => {
    try {
      setIsLoading(true);
      const [gradesResponse, statsResponse] = await Promise.all([
        studentAPI.getGrades(),
        studentAPI.getGradeStats()
      ]);

      const totalGrades = Object.values(gradesResponse.grades || {})
        .flatMap(year => Object.values(year))
        .flatMap(session => Object.values(session))
        .flatMap(sessionType => Object.values(sessionType))
        .flatMap(academicYear => Object.values(academicYear))
        .flatMap(semester => semester).length;

      const recentStats = statsResponse.statistics?.[0] || {};
      const hasArabicNames = gradesResponse.has_arabic_names;

      setQuickStats({
        totalSubjects: totalGrades,
        currentYear: recentStats.academic_year || '2024',
        passedSubjects: recentStats.passed_subjects || 0,
        hasArabicNames,
        totalYears: Object.keys(gradesResponse.grades || {}).length
      });
    } catch (err) {
      setError(t('error')); 
      console.error('Error loading quick stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return t('goodMorning');
    } else if (hour < 18) {
      return t('goodAfternoon');
    } else {
      return t('goodEvening');
    }
  };

  const QuickActionCard = ({ title, description, icon, color, onClick, disabled = false }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': disabled ? {} : {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
        },
        opacity: disabled ? 0.6 : 1
      }}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent sx={{ p: 3, textAlign: 'center' }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            color: 'white'
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Welcome Section */}
      <Paper 
        elevation={3}
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container alignItems="center" spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h3" fontWeight="300" gutterBottom>
                {getCurrentTimeGreeting()}! 👋
              </Typography>
              <Typography variant="h5" fontWeight="600" gutterBottom>
                {user?.nom_complet || user?.cod_etu}
              </Typography>
            
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 2 }}>
                {t('welcomeMessageBody')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  border: '3px solid rgba(255,255,255,0.3)'
                }}
              >
                {user?.nom_complet?.charAt(0) || user?.cod_etu?.charAt(0) || 'S'}
              </Avatar>
            </Grid>
          </Grid>
        </Box>
        
        {/* Decorative Elements */}
         <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            zIndex: 1
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            zIndex: 1
          }}
        />
      </Paper>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title={t('myProfile')}
              description={t('viewPersonalInfo')}
              icon={<PersonIcon sx={{ fontSize: 30 }} />}
              color="#3498db"
              onClick={() => onNavigate('profile')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title={t('pedagogicalSituation')}
              description={t('viewModules')}
              icon={<AssignmentIcon sx={{ fontSize: 30 }} />}
              color="#f39c12"
              onClick={() => onNavigate('pedagogical')}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title={t('administrativeSituation')}
              description={t('viewAdminReg')}
              icon={<AssignmentIcon sx={{ fontSize: 30 }} />}
              color="#2340e2"
              onClick={() => onNavigate('administrative')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title={t('myGrades')}
              description={t('viewAllGrades')}
              icon={<GradeIcon sx={{ fontSize: 30 }} />}
              color="#e74c3c"
              onClick={() => onNavigate('grades')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title={t('timeSchedule')}
              description={t('viewSchedule')}
              icon={<TimeIcon sx={{ fontSize: 30 }} />}
              color="#12f3ce"
              onClick={loadQuickStats}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Student Information Summary */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" gutterBottom color="primary">
                📋 {t('infoSummary')}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                     {t('N Apogee')}
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {user?.cod_etu || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('specialization')}
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {user?.etape || '-'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('cinLabel')}
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {user?.cin || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('lastUpdate')}
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {formatDate(user?.derniere_mise_a_jour)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default DashboardHome;