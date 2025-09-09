import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import Loading from '../common/Loading';

const StudentStats = () => {
  const [statsData, setStatsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const fetchAndProcessStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [situationResponse, documentsResponse] = await Promise.all([
        studentAPI.getPedagogicalSituation({ year: '' }),
        studentAPI.getOfficialDocuments({ semester: '' })
      ]);

      const pedagogicalSituation = situationResponse.pedagogical_situation;
      const rawDocuments = documentsResponse.documents;

      const finalGradesMap = new Map();
      for (const semesterCode in rawDocuments) {
        if (rawDocuments.hasOwnProperty(semesterCode)) {
          const semesterData = rawDocuments[semesterCode];
          semesterData.subjects.forEach(subject => {
            if (subject.cod_tre === null) return;
            const cod_elp = subject.cod_elp;
            const currentGrade = parseFloat(subject.not_elp);
            const existingSubject = finalGradesMap.get(cod_elp);

            if (!existingSubject || currentGrade > parseFloat(existingSubject.not_elp) || (currentGrade === parseFloat(existingSubject.not_elp) && subject.final_session > existingSubject.final_session)) {
              finalGradesMap.set(cod_elp, subject);
            }
          });
        }
      }

      let allRegisteredModules = [];
      Object.values(pedagogicalSituation).forEach(yearData => {
        Object.values(yearData.semester_elements).forEach(modules => {
          const actualModules = modules.filter(mod => !mod.cod_elp.toLowerCase().startsWith('semes'));
          allRegisteredModules.push(...actualModules);
        });
      });

      const mergedModules = allRegisteredModules.map(mod => ({
        ...mod,
        gradeInfo: finalGradesMap.get(mod.cod_elp) || null,
      }));

      const stats = {};
      mergedModules.forEach(mod => {
        const year = mod.cod_anu;
        if (!year) return;
        
        const semester = `S${mod.cod_sem || parseInt(mod.cod_elp?.match(/S(\d)/)?.[1] || 0)}`;
        if (semester === 'S0') return;

        if (!stats[year]) stats[year] = {};
        if (!stats[year][semester]) {
          stats[year][semester] = {
            normale: { total: 0, passed: 0, failed: 0, absent: 0, not_graded: 0 },
            rattrapage: { total: 0, passed: 0, failed: 0, absent: 0, not_graded: 0 },
          };
        }

        const session = mod.gradeInfo?.final_session === 2 ? 'rattrapage' : 'normale';
        const target = stats[year][semester][session];

        target.total++;

        if (mod.gradeInfo) {
          if (parseFloat(mod.gradeInfo.not_elp) >= 10 || mod.gradeInfo.cod_tre === 'ACR') {
            target.passed++;
          } else if (mod.gradeInfo.not_elp === null || mod.gradeInfo.cod_tre === 'ABS') {
            target.absent++;
          } else {
            target.failed++;
          }
        } else {
          target.not_graded++;
        }
      });
      
      const overall = { total: mergedModules.length, passed: 0, failed: 0, absent: 0, not_graded: 0 };
      mergedModules.forEach(mod => {
        if (mod.gradeInfo) {
          if (parseFloat(mod.gradeInfo.not_elp) >= 10 || mod.gradeInfo.cod_tre === 'ACR') overall.passed++;
          else if (mod.gradeInfo.not_elp === null || mod.gradeInfo.cod_tre === 'ABS') overall.absent++;
          else overall.failed++;
        } else {
          overall.not_graded++;
        }
      });

      setStatsData({ yearly: stats, overall });

    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل الإحصائيات');
      console.error('Error fetching and processing stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndProcessStats();
  }, []);
  
  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3, textAlign: 'center', background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        {icon}
        <Typography variant="h3" fontWeight="bold" sx={{ ml: 1 }}>{value}</Typography>
      </Box>
      <Typography variant="h6" fontWeight="600">{title}</Typography>
      {subtitle && <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{subtitle}</Typography>}
    </Paper>
  );

  if (isLoading) return <Loading message="جاري تحليل الوضعية الأكاديمية... Analyzing academic situation..." />;
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssessmentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">📊 إحصائيات الأداء الأكاديمي</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {statsData?.overall && statsData.overall.total > 0 ? (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight="600" gutterBottom color="primary">📈 النظرة العامة - Career Overview</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}><StatCard title="إجمالي المواد" value={statsData.overall.total} subtitle="Total Modules" icon={<SchoolIcon sx={{ fontSize: 30 }} />} color="#3498db" /></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="المواد المنجحة" value={statsData.overall.passed} subtitle="Passed Modules" icon={<TrendingUpIcon sx={{ fontSize: 30 }} />} color="#27ae60" /></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="المواد غير المنجحة" value={statsData.overall.failed} subtitle="Failed Modules" icon={<TrendingDownIcon sx={{ fontSize: 30 }} />} color="#e74c3c" /></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="في انتظار النتيجة" value={statsData.overall.not_graded + statsData.overall.absent} subtitle="Pending / Absent" icon={<ScheduleIcon sx={{ fontSize: 30 }} />} color="#f39c12" /></Grid>
            </Grid>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="600" gutterBottom color="primary">📋 الإحصائيات التفصيلية - Detailed Statistics</Typography>
            {Object.entries(statsData.yearly).sort(([a], [b]) => b - a).map(([year, yearStats]) => (
              <Accordion key={year} sx={{ mb: 2, borderRadius: 2 }} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)', color: 'white', borderRadius: '8px 8px 0 0' }}>
                  <Typography variant="h6" fontWeight="600">📚 السنة الجامعية {year} - {parseInt(year) + 1}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 1, md: 3 }, bgcolor: '#fbfcfc' }}>
                  {Object.entries(yearStats).sort(([a], [b]) => a.localeCompare(b)).map(([semester, semesterStats]) => (
                    <Box key={semester} sx={{ mb: 3 }}>
                      <Typography variant="h6" color="primary.main" sx={{ mb: 2, pl: 1 }}>
                        <strong>{semester}</strong> - السداسي {semester.replace('S', '')}
                      </Typography>
                      <Grid container spacing={3}>
                        {(semesterStats.normale.total > 0) && (
                          <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 2, border: '2px solid #3498db', height: '100%' }}>
                              <CardContent>
                                <Chip label="الدورة العادية" color="primary" sx={{ mb: 2 }} />
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                                  <Grid item xs={6}><Typography variant='h5'>{semesterStats.normale.total}</Typography><Typography variant='caption'>المسجلة</Typography></Grid>
                                  <Grid item xs={6}><Typography variant='h5' color="success.main">{semesterStats.normale.passed}</Typography><Typography variant='caption'>المنجحة</Typography></Grid>
                                  <Grid item xs={6}><Typography variant='h5' color="error.main">{semesterStats.normale.failed}</Typography><Typography variant='caption'>غير المنجحة</Typography></Grid>
                                  <Grid item xs={6}><Typography variant='h5' color="warning.main">{semesterStats.normale.not_graded + semesterStats.normale.absent}</Typography><Typography variant='caption'>في الانتظار/غياب</Typography></Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          </Grid>
                        )}
                        {(semesterStats.rattrapage.total > 0) && (
                          <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 2, border: '2px solid #9b59b6', height: '100%' }}>
                              <CardContent>
                                <Chip label="الدورة الاستدراكية" color="secondary" sx={{ mb: 2 }} />
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                                  <Grid item xs={6}><Typography variant='h5'>{semesterStats.rattrapage.total}</Typography><Typography variant='caption'>المسجلة</Typography></Grid>
                                  <Grid item xs={6}><Typography variant='h5' color="success.main">{semesterStats.rattrapage.passed}</Typography><Typography variant='caption'>المنجحة</Typography></Grid>
                                  <Grid item xs={6}><Typography variant='h5' color="error.main">{semesterStats.rattrapage.failed}</Typography><Typography variant='caption'>غير المنجحة</Typography></Grid>
                                  <Grid item xs={6}><Typography variant='h5' color="warning.main">{semesterStats.rattrapage.not_graded + semesterStats.rattrapage.absent}</Typography><Typography variant='caption'>في الانتظार/غياب</Typography></Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </>
      ) : (
        !isLoading && <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <BarChartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>لا توجد إحصائيات متاحة</Typography>
          <Typography variant="body2" color="text.secondary">No statistics available based on your pedagogical situation.</Typography>
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          💡 نصيحة: هذه الإحصائيات مبنية على جميع المواد المسجلة في وضعيتكم البيداغوجية والنتائج النهائية المتوفرة.
        </Typography>
      </Paper>
    </Box>
  );
};

export default StudentStats;