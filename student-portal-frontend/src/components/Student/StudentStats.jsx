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
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
    CircularProgress  // ✅ Add this
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import Loading from '../common/Loading';

const StudentStats = () => {
  const [statsData, setStatsData] = useState(null);
  const [validatedModulesData, setValidatedModulesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch both existing stats and new validated modules stats
      const [situationResponse, documentsResponse, validatedModulesResponse] = await Promise.all([
        studentAPI.getPedagogicalSituation({ year: '' }),
        studentAPI.getOfficialDocuments({ semester: '' }),
        studentAPI.getValidatedModules()
      ]);

      const pedagogicalSituation = situationResponse.pedagogical_situation;
      const rawDocuments = documentsResponse.documents;

      // Process existing stats
      const finalGradesMap = new Map();
      for (const semesterCode in rawDocuments) {
        if (rawDocuments.hasOwnProperty(semesterCode)) {
          const semesterData = rawDocuments[semesterCode];
          semesterData.subjects.forEach(subject => {
            if (subject.cod_tre === null) return;
            const cod_elp = subject.cod_elp;
            const currentGrade = parseFloat(subject.not_elp);
            const existingSubject = finalGradesMap.get(cod_elp);

            if (!existingSubject || currentGrade > parseFloat(existingSubject.not_elp) || 
                (currentGrade === parseFloat(existingSubject.not_elp) && subject.final_session > existingSubject.final_session)) {
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
      setValidatedModulesData(validatedModulesResponse);

      console.log('Validated modules data loaded:', validatedModulesResponse);

    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل الإحصائيات');
      console.error('Error fetching and processing stats:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Paper elevation={3} sx={{ 
      p: 3, 
      borderRadius: 3, 
      textAlign: 'center', 
      background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`, 
      color: 'white',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        {icon}
        <Typography variant="h3" fontWeight="bold" sx={{ ml: 1 }}>{value}</Typography>
      </Box>
      <Typography variant="h6" fontWeight="600">{title}</Typography>
      {subtitle && <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{subtitle}</Typography>}
    </Paper>
  );

const ValidatedModulesSection = () => {
  if (!validatedModulesData) {
    console.log('No validatedModulesData');
    return null;
  }

  console.log('validatedModulesData:', validatedModulesData);

  const { by_semester, overall } = validatedModulesData;

  console.log('by_semester:', by_semester);
  console.log('overall:', overall);

  // Show loading if data is still being processed
  if (!by_semester && !overall) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, mb: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          جاري تحميل البيانات...
        </Typography>
      </Paper>
    );
  }

  // If we have overall stats but no semester data, show overall stats only
  if ((!by_semester || by_semester.length === 0) && overall && overall.total_modules > 0) {
    return (
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AssessmentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="600" color="primary">
              📊 عدد الوحدات المصادق عليها حسب السداسي
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Nombre de modules validés par semestre
            </Typography>
          </Box>
        </Box>

        {/* Overall Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="إجمالي الوحدات"
              value={overall.total_modules || 0}
              subtitle="Total Modules"
              icon={<SchoolIcon sx={{ fontSize: 30 }} />}
              color="#3498db"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="الوحدات المصادق عليها"
              value={overall.validated_modules || 0}
              subtitle="Modules Validés"
              icon={<CheckCircleIcon sx={{ fontSize: 30 }} />}
              color="#27ae60"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="وحدات غير مصادق عليها"
              value={overall.not_validated_modules || 0}
              subtitle="Non Validés"
              icon={<CancelIcon sx={{ fontSize: 30 }} />}
              color="#e74c3c"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="نسبة النجاح"
              value={`${overall.validation_rate || 0}%`}
              subtitle="Taux de Validation"
              icon={<TrendingUpIcon sx={{ fontSize: 30 }} />}
              color="#9b59b6"
            />
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            💡 البيانات التفصيلية حسب السداسي غير متوفرة حاليا. يرجى الاتصال بالإدارة للمزيد من المعلومات.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // If truly no data at all
  if ((!by_semester || by_semester.length === 0) && (!overall || overall.total_modules === 0)) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, mb: 4 }}>
        <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          لا توجد بيانات متاحة
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aucune donnée disponible pour les modules validés par semestre
        </Typography>
      </Paper>
    );
  }

  // If we have semester data, show the full display
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssessmentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="600" color="primary">
            📊 عدد الوحدات المصادق عليها حسب السداسي
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Nombre de modules validés par semestre
          </Typography>
        </Box>
      </Box>

      {/* Overall Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الوحدات"
            value={overall?.total_modules || 0}
            subtitle="Total Modules"
            icon={<SchoolIcon sx={{ fontSize: 30 }} />}
            color="#3498db"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الوحدات المصادق عليها"
            value={overall?.validated_modules || 0}
            subtitle="Modules Validés"
            icon={<CheckCircleIcon sx={{ fontSize: 30 }} />}
            color="#27ae60"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="وحدات غير مصادق عليها"
            value={overall?.not_validated_modules || 0}
            subtitle="Non Validés"
            icon={<CancelIcon sx={{ fontSize: 30 }} />}
            color="#e74c3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="نسبة النجاح"
            value={`${overall?.validation_rate || 0}%`}
            subtitle="Taux de Validation"
            icon={<TrendingUpIcon sx={{ fontSize: 30 }} />}
            color="#9b59b6"
          />
        </Grid>
      </Grid>

      {/* Semester Cards */}
      <Grid container spacing={3}>
        {by_semester && by_semester.length > 0 && by_semester
          .sort((a, b) => a.semester_number - b.semester_number)
          .map((semester) => {
            const validationRate = semester.total_modules > 0
              ? (semester.validated_modules / semester.total_modules) * 100
              : 0;

            return (
              <Grid item xs={12} md={6} lg={4} key={semester.semester_number}>
                {/* ... rest of the semester card code stays the same ... */}
                <Card sx={{ 
                  height: '100%', 
                  borderLeft: `4px solid ${getSemesterColor(semester.semester_number)}`,
                  boxShadow: 3,
                  transition: 'all 0.3s',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <CardContent>
                    {/* Semester Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h5" color="primary" fontWeight="bold">
                          السداسي {semester.semester_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Semestre {semester.semester_number}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${semester.validated_modules}/${semester.total_modules}`}
                        color={validationRate >= 80 ? 'success' : validationRate >= 50 ? 'warning' : 'error'}
                        sx={{ fontWeight: 'bold', fontSize: '1rem', px: 2, py: 2.5 }}
                      />
                    </Box>

                    {/* Statistics Grid */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={4}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e3f2fd', borderRadius: 2 }}>
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            {semester.total_modules}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            المجموع
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e8f5e9', borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ color: '#27ae60' }} fontWeight="bold">
                            {semester.validated_modules}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            مصادق
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ color: '#e74c3c' }} fontWeight="bold">
                            {semester.not_validated_modules}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            غير مصادق
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {/* Progress Bar */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="500">
                          نسبة النجاح
                        </Typography>
                        <Typography variant="body2" fontWeight="600" color="primary">
                          {validationRate.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={validationRate}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: validationRate >= 80 ? '#27ae60' : validationRate >= 50 ? '#f39c12' : '#e74c3c',
                            borderRadius: 5
                          }
                        }}
                      />
                    </Box>

                    {/* Module Details */}
                    {semester.modules_detail && semester.modules_detail.length > 0 && (
                      <Accordion sx={{ mt: 2, boxShadow: 'none', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                          <Typography variant="subtitle2" fontWeight="600">
                            تفاصيل الوحدات ({semester.modules_detail.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pt: 0 }}>
                          <TableContainer sx={{ maxHeight: 300 }}>
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                    الوحدة
                                  </TableCell>
                                  <TableCell align="center" sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                    النقطة
                                  </TableCell>
                                  <TableCell align="center" sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                    الحالة
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {semester.modules_detail
                                  .sort((a, b) => (b.is_validated ? 1 : 0) - (a.is_validated ? 1 : 0))
                                  .map((module, idx) => (
                                  <TableRow 
                                    key={idx}
                                    sx={{ 
                                      bgcolor: module.is_validated ? '#f1f8f4' : '#fff5f5',
                                      '&:hover': { bgcolor: module.is_validated ? '#e8f5e9' : '#ffebee' }
                                    }}
                                  >
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                        {module.lib_elp || module.cod_elp}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {module.cod_elp}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      {module.final_grade !== null && module.final_grade !== undefined ? (
                                        <Chip 
                                          label={parseFloat(module.final_grade).toFixed(2)}
                                          size="small"
                                          sx={{
                                            bgcolor: parseFloat(module.final_grade) >= 10 ? '#27ae60' : '#e74c3c',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            minWidth: '50px'
                                          }}
                                        />
                                      ) : (
                                        <Typography variant="caption" color="text.secondary">
                                          -
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell align="center">
                                      {module.is_validated ? (
                                        <CheckCircleIcon sx={{ color: '#27ae60', fontSize: 20 }} />
                                      ) : (
                                        <CancelIcon sx={{ color: '#e74c3c', fontSize: 20 }} />
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {semester.last_sync && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, textAlign: 'center' }}>
                        آخر تحديث: {new Date(semester.last_sync).toLocaleString('ar-MA')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
      </Grid>
    </Box>
  );
};

  const getSemesterColor = (semesterNumber) => {
    const colors = {
      1: '#3498db',
      2: '#e67e22',
      3: '#2ecc71',
      4: '#9b59b6',
      5: '#e74c3c',
      6: '#34495e'
    };
    return colors[semesterNumber] || '#95a5a6';
  };

  if (isLoading) {
    return <Loading message="جاري تحليل الوضعية الأكاديمية... Analyzing academic situation..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* Validated Modules Section */}
      <ValidatedModulesSection />

      <Divider sx={{ my: 4 }} />

      {/* Existing Stats Section */}
      {statsData?.overall && statsData.overall.total > 0 ? (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight="600" gutterBottom color="primary">
              📈 النظرة العامة - Career Overview
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="إجمالي المواد" value={statsData.overall.total} subtitle="Total Modules" icon={<SchoolIcon sx={{ fontSize: 30 }} />} color="#3498db" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="المواد المنجحة" value={statsData.overall.passed} subtitle="Passed Modules" icon={<TrendingUpIcon sx={{ fontSize: 30 }} />} color="#27ae60" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="المواد غير المنجحة" value={statsData.overall.failed} subtitle="Failed Modules" icon={<TrendingDownIcon sx={{ fontSize: 30 }} />} color="#e74c3c" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="في انتظار النتيجة" value={statsData.overall.not_graded + statsData.overall.absent} subtitle="Pending / Absent" icon={<ScheduleIcon sx={{ fontSize: 30 }} />} color="#f39c12" />
              </Grid>
            </Grid>
          </Box>

          {/* Detailed yearly stats - keeping your existing code */}
          <Box>
            <Typography variant="h5" fontWeight="600" gutterBottom color="primary">
              📋 الإحصائيات التفصيلية - Detailed Statistics
            </Typography>
            {Object.entries(statsData.yearly).sort(([a], [b]) => b - a).map(([year, yearStats]) => (
              <Accordion key={year} sx={{ mb: 2, borderRadius: 2 }} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)', color: 'white', borderRadius: '8px 8px 0 0' }}>
                  <Typography variant="h6" fontWeight="600">
                    📚 السنة الجامعية {year} - {parseInt(year) + 1}
                  </Typography>
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
                                  <Grid item xs={6}><Typography variant='h5' color="warning.main">{semesterStats.rattrapage.not_graded + semesterStats.rattrapage.absent}</Typography><Typography variant='caption'>في الانتظار/غياب</Typography></Grid>
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
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لا توجد إحصائيات متاحة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No statistics available based on your pedagogical situation.
          </Typography>
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          💡 نصيحة: هذه الإحصائيات مبنية على جميع المواد المسجلة في وضعيتكم البيداغوجية والنتائج النهائية المتوفرة.
          <br />
          البيانات محدثة تلقائياً من قاعدة بيانات أبوجي.
        </Typography>
      </Paper>
    </Box>
  );
};

export default StudentStats;