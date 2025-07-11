// src/components/Student/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Avatar,
  Chip,
  Alert,
  Skeleton,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Grade as GradeIcon,
  BarChart as StatsIcon,
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  Assignment as AssignmentIcon
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
      // Load both grades and stats for quick overview
      const [gradesResponse, statsResponse] = await Promise.all([
        studentAPI.getGrades(),
        studentAPI.getGradeStats()
      ]);

      // Calculate quick statistics
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
      setError('فشل في تحميل الإحصائيات');
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
      return i18n.language === 'ar' ? 'صباح الخير' : 'Bonjour';
    } else if (hour < 18) {
      return i18n.language === 'ar' ? 'مساء الخير' : 'Bon après-midi';
    } else {
      return i18n.language === 'ar' ? 'مساء الخير' : 'Bonsoir';
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

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        color: 'white',
        textAlign: 'center'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h4" fontWeight="bold" sx={{ ml: 1 }}>
          {isLoading ? <Skeleton width={60} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : value}
        </Typography>
      </Box>
      <Typography variant="body1" fontWeight="600">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
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
              {user?.nom_arabe && (
                <Typography 
                  variant="h6" 
                  sx={{ 
                    opacity: 0.9, 
                    direction: 'rtl',
                    fontFamily: 'Arabic UI Text, Arial',
                    mb: 1
                  }}
                >
                  {user.nom_arabe}
                </Typography>
              )}
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 2 }}>
                {i18n.language === 'ar' 
                  ? 'مرحباً بك في نظام معلومات الطلاب. يمكنك هنا الاطلاع على جميع معلوماتك الأكاديمية ونقطك.'
                  : 'Bienvenue dans le système d\'information des étudiants. Vous pouvez consulter toutes vos informations académiques et notes ici.'
                }
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
              <Box sx={{ mt: 2 }}>
                <Chip
                  icon={<SchoolIcon />}
                  label={user?.etape || 'Étudiant'}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    backdropFilter: 'blur(10px)'
                  }}
                />
              </Box>
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
              title="معلوماتي الشخصية"
              description="عرض وإدارة معلوماتك الشخصية والأكاديمية"
              icon={<PersonIcon sx={{ fontSize: 30 }} />}
              color="#3498db"
              onClick={() => onNavigate('profile')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="نقطي"
              description="استعراض جميع نقطك مفصلة حسب السنة والفصل"
              icon={<GradeIcon sx={{ fontSize: 30 }} />}
              color="#e74c3c"
              onClick={() => onNavigate('grades')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="الإحصائيات"
              description="تحليل أدائك الأكاديمي والإحصائيات المفصلة"
              icon={<StatsIcon sx={{ fontSize: 30 }} />}
              color="#9b59b6"
              onClick={() => onNavigate('stats')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="تحديث البيانات"
              description="تحديث معلوماتك من قاعدة البيانات"
              icon={<TimeIcon sx={{ fontSize: 30 }} />}
              color="#f39c12"
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
                📋 ملخص المعلومات - Information Summary
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      رقم الطالب - Student Code
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {user?.cod_etu || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      التخصص - Specialization
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {user?.etape || '-'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      رقم بطاقة التعريف - CIN
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {user?.cin || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      آخر تحديث - Last Update
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