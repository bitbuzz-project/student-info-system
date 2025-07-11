import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Alert,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  School as SchoolIcon,
  Star as StarIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import Loading from '../common/Loading';

const StudentStats = () => {
  const [statsData, setStatsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await studentAPI.getGradeStats();
      setStatsData(response.statistics);
      
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل الإحصائيات');
      console.error('Error fetching statistics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const calculateOverallStats = () => {
    if (!statsData || statsData.length === 0) return null;

    const totalSubjects = statsData.reduce((sum, stat) => sum + stat.total_subjects, 0);
    const totalPassed = statsData.reduce((sum, stat) => sum + stat.passed_subjects, 0);
    const totalFailed = statsData.reduce((sum, stat) => sum + stat.failed_subjects, 0);
    const totalAbsent = statsData.reduce((sum, stat) => sum + stat.absent_subjects, 0);

    const successRate = totalSubjects > 0 ? ((totalPassed / totalSubjects) * 100).toFixed(1) : 0;

    return {
      totalSubjects,
      totalPassed,
      totalFailed,
      totalAbsent,
      successRate
    };
  };

  const getSessionTypeLabel = (sessionType) => {
    return sessionType === 'automne' ? 'خريف - Automne' : 'ربيع - Printemps';
  };

  const getSessionTypeColor = (sessionType) => {
    return sessionType === 'automne' ? '#e67e22' : '#3498db';
  };

  const getGradeColor = (average) => {
    if (!average) return '#95a5a6';
    const numAverage = parseFloat(average);
    if (numAverage >= 16) return '#27ae60';
    if (numAverage >= 14) return '#3498db';
    if (numAverage >= 12) return '#f39c12';
    if (numAverage >= 10) return '#e67e22';
    return '#e74c3c';
  };

  const StatCard = ({ title, value, subtitle, icon, color, progress }) => (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h3" fontWeight="bold" sx={{ ml: 1 }}>
          {value}
        </Typography>
      </Box>
      <Typography variant="h6" fontWeight="600">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
          {subtitle}
        </Typography>
      )}
      {progress !== undefined && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'rgba(255,255,255,0.8)'
              }
            }}
          />
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            {progress.toFixed(1)}%
          </Typography>
        </Box>
      )}
    </Paper>
  );

  const StatsByYear = ({ yearStats }) => {
    const yearData = {};
    
    // Group stats by academic year
    yearStats.forEach(stat => {
      const year = stat.academic_year;
      if (!yearData[year]) {
        yearData[year] = {};
      }
      
      const sessionKey = `${stat.session}_${stat.session_type}`;
      yearData[year][sessionKey] = stat;
    });

    return (
      <Box>
        {Object.entries(yearData)
          .sort(([a], [b]) => b - a)
          .map(([year, sessions]) => (
          <Accordion key={year} sx={{ mb: 2, borderRadius: 2 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
                color: 'white',
                borderRadius: '8px 8px 0 0'
              }}
            >
              <Typography variant="h6" fontWeight="600">
                📚 السنة الجامعية {year} - Academic Year {year}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Grid container spacing={2} sx={{ p: 3 }}>
                {Object.entries(sessions).map(([sessionKey, stat]) => {
                  const successRate = stat.total_subjects > 0 
                    ? ((stat.passed_subjects / stat.total_subjects) * 100).toFixed(1)
                    : 0;
                  
                  return (
                    <Grid item xs={12} md={6} key={sessionKey}>
                      <Card sx={{ borderRadius: 2, border: `2px solid ${getSessionTypeColor(stat.session_type)}` }}>
                        <CardContent sx={{ p: 3 }}>
                          {/* Session Header */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" fontWeight="600">
                              S{stat.semester_number} - {getSessionTypeLabel(stat.session_type)}
                            </Typography>
                            <Chip
                              label={stat.session === '1' ? 'عادية' : 'استدراكية'}
                              color={stat.session === '1' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </Box>

                          {/* Statistics Grid */}
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                                <Typography variant="h5" fontWeight="bold" color="primary">
                                  {stat.total_subjects}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  إجمالي
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                  {stat.passed_subjects}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  نجح
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                  {stat.failed_subjects}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  رسب
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#f3e5f5', borderRadius: 1 }}>
                                <Typography variant="h5" fontWeight="bold" color="secondary.main">
                                  {stat.absent_subjects}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  غائب
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>

                          {/* Average and Success Rate */}
                          <Divider sx={{ my: 2 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                المعدل
                              </Typography>
                              <Chip
                                label={stat.average_grade ? parseFloat(stat.average_grade).toFixed(2) : 'N/A'}
                                sx={{ 
                                  bgcolor: getGradeColor(stat.average_grade),
                                  color: 'white',
                                  fontWeight: 'bold'
                                }}
                              />
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                معدل النجاح
                              </Typography>
                              <Chip
                                label={`${successRate}%`}
                                color={parseFloat(successRate) >= 70 ? 'success' : parseFloat(successRate) >= 50 ? 'warning' : 'error'}
                                variant="outlined"
                              />
                            </Box>
                          </Box>

                          {/* Progress Bar */}
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              نسبة النجاح
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={parseFloat(successRate)}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: parseFloat(successRate) >= 70 ? '#27ae60' : 
                                          parseFloat(successRate) >= 50 ? '#f39c12' : '#e74c3c'
                                }
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  };

  if (isLoading) {
    return <Loading message="جاري تحميل الإحصائيات... Loading statistics..." />;
  }

  const overallStats = calculateOverallStats();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssessmentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          📊 إحصائيات الأداء الأكاديمي
        </Typography>
      
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Overall Statistics */}
      {overallStats && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight="600" gutterBottom color="primary">
            📈 الإحصائيات العامة - Overall Statistics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="إجمالي المواد"
                value={overallStats.totalSubjects}
                subtitle="Total Subjects"
                icon={<SchoolIcon sx={{ fontSize: 30 }} />}
                color="#3498db"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="المواد المنجحة"
                value={overallStats.totalPassed}
                subtitle="Passed Subjects"
                icon={<TrendingUpIcon sx={{ fontSize: 30 }} />}
                color="#27ae60"
                progress={overallStats.totalSubjects > 0 ? (overallStats.totalPassed / overallStats.totalSubjects) * 100 : 0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="المواد الراسبة"
                value={overallStats.totalFailed}
                subtitle="Failed Subjects"
                icon={<TrendingDownIcon sx={{ fontSize: 30 }} />}
                color="#e74c3c"
                progress={overallStats.totalSubjects > 0 ? (overallStats.totalFailed / overallStats.totalSubjects) * 100 : 0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="المعدل العام"
                value={overallStats.overallAverage || 'N/A'}
                subtitle={`Success Rate: ${overallStats.successRate}%`}
                icon={<StarIcon sx={{ fontSize: 30 }} />}
                color="#9b59b6"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Detailed Statistics by Year */}
      {statsData && statsData.length > 0 ? (
        <Box>
          <Typography variant="h5" fontWeight="600" gutterBottom color="primary">
            📋 الإحصائيات التفصيلية - Detailed Statistics
          </Typography>
          <StatsByYear yearStats={statsData} />
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <BarChartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لا توجد إحصائيات متاحة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No statistics available. Please check your grades first.
          </Typography>
        </Paper>
      )}

      {/* Footer Info */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          💡 نصيحة: الإحصائيات محسوبة بناءً على النقط المتاحة في النظام.
          يتم تحديث الإحصائيات تلقائياً عند تحديث النقط.
        </Typography>
      </Paper>
    </Box>
  );
};

export default StudentStats;