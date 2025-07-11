
// src/components/Student/StudentProfile.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Chip,
  Avatar,
  Paper,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  DateRange as DateIcon,
  LocationOn as LocationIcon,
  ContactPage as ContactIcon,
  Badge as BadgeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import Loading from '../common/Loading';

const StudentProfile = () => {
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, i18n } = useTranslation();

  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await studentAPI.getProfile();
      setStudentData(response.student);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load student data');
      console.error('Error fetching student data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

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

  if (isLoading) {
    return <Loading message={t('loading')} />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6" gutterBottom>
          {t('error')}
        </Typography>
        <Typography color="text.secondary">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!studentData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">
          {t('noData', 'No data available')}
        </Typography>
      </Box>
    );
  }

  const InfoRow = ({ icon, label, value, isArabic = false }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ mr: 2, color: 'primary.main' }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography 
          variant="body1" 
          fontWeight={500}
          sx={{ 
            direction: isArabic ? 'rtl' : 'ltr',
            fontFamily: isArabic ? 'Arabic UI Text, Arial' : 'inherit'
          }}
        >
          {value || '-'}
        </Typography>
      </Box>
    </Box>
  );

  const StatsCard = ({ title, value, color = 'primary' }) => (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        textAlign: 'center',
        borderRadius: 2,
        background: `linear-gradient(135deg, ${
          color === 'primary' ? '#3498db 0%, #2980b9 100%' :
          color === 'success' ? '#2ecc71 0%, #27ae60 100%' :
          color === 'warning' ? '#f39c12 0%, #e67e22 100%' :
          '#9b59b6 0%, #8e44ad 100%'
        })`,
        color: 'white',
        '&:hover': {
          transform: 'translateY(-2px)',
          transition: 'transform 0.3s ease'
        }
      }}
    >
      <Typography variant="h4" fontWeight="bold">
        {value}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {title}
      </Typography>
    </Paper>
  );

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
          👤 المعلومات الشخصية - Personal Information
        </Typography>
        <Typography variant="body1" color="text.secondary">
          عرض جميع المعلومات الشخصية والأكاديمية الخاصة بك
        </Typography>
      </Box>

      {/* Header with Avatar */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mr: 3,
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                fontSize: '2rem',
                fontWeight: 'bold'
              }}
            >
              {studentData.nom_complet?.charAt(0) || 'S'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom fontWeight="600" color="primary">
                {studentData.nom_complet}
              </Typography>
              {studentData.nom_arabe && (
                <Typography 
                  variant="h6" 
                  color="text.secondary" 
                  sx={{ 
                    direction: 'rtl',
                    fontFamily: 'Arabic UI Text, Arial'
                  }}
                >
                  {studentData.nom_arabe}
                </Typography>
              )}
              <Chip
                icon={<BadgeIcon />}
                label={`${t('studentCode')}: ${studentData.cod_etu}`}
                color="primary"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </Box>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchStudentData} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Statistics */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6} sm={3}>
              <StatsCard 
                title="التسجيلات في الدورة"
                value={studentData.nombre_inscriptions_cycle || '0'}
                color="primary"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatsCard 
                title="التسجيلات في المرحلة"
                value={studentData.nombre_inscriptions_etape || '0'}
                color="success"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatsCard 
                title="التسجيلات في الدبلوم"
                value={studentData.nombre_inscriptions_diplome || '0'}
                color="warning"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatsCard 
                title="السنة الجامعية"
                value={studentData.annee_universitaire || '2024'}
                color="secondary"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="600">
                  {t('personalInfo')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Stack spacing={2}>
                <InfoRow
                  icon={<ContactIcon />}
                  label={t('cin')}
                  value={studentData.cin}
                />
                <InfoRow
                  icon={<DateIcon />}
                  label={t('dateOfBirth')}
                  value={formatDate(studentData.date_naissance)}
                />
                <InfoRow
                  icon={<LocationIcon />}
                  label={t('placeOfBirth')}
                  value={studentData.lieu_naissance}
                />
                {studentData.lieu_naissance_arabe && (
                  <InfoRow
                    icon={<LocationIcon />}
                    label="مكان الميلاد (بالعربية)"
                    value={studentData.lieu_naissance_arabe}
                    isArabic={true}
                  />
                )}
                <InfoRow
                  icon={<PersonIcon />}
                  label={t('gender')}
                  value={studentData.sexe === 'M' ? 'ذكر / Masculin' : studentData.sexe === 'F' ? 'أنثى / Féminin' : studentData.sexe}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Academic Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SchoolIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="600">
                  {t('academicInfo')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Stack spacing={2}>
                <InfoRow
                  icon={<SchoolIcon />}
                  label={t('specialization')}
                  value={studentData.etape}
                />
                <InfoRow
                  icon={<BadgeIcon />}
                  label="رخصة التخصص / License"
                  value={studentData.licence_etape}
                />
                <InfoRow
                  icon={<SchoolIcon />}
                  label={t('diploma')}
                  value={studentData.diplome}
                />
                <InfoRow
                  icon={<DateIcon />}
                  label="آخر تحديث / Last Update"
                  value={formatDate(studentData.derniere_mise_a_jour)}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Info Card */}
      <Card sx={{ mt: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="600" color="primary">
            معلومات إضافية / Additional Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  تسجيلات الدورة
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {studentData.nombre_inscriptions_cycle || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  تسجيلات المرحلة
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {studentData.nombre_inscriptions_etape || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  تسجيلات الدبلوم
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {studentData.nombre_inscriptions_diplome || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  السنة الجامعية
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="secondary.main">
                  {studentData.annee_universitaire || '2024'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StudentProfile;