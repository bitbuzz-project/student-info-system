import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import Loading from '../common/Loading';

const PedagogicalSituation = () => {
  const [situationData, setSituationData] = useState(null);
  const [statsData, setStatsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const { t } = useTranslation();

  const fetchPedagogicalSituation = async (year = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [situationResponse, statsResponse] = await Promise.all([
        studentAPI.getPedagogicalSituation({ year }),
        studentAPI.getPedagogicalStats()
      ]);
      
      setSituationData(situationResponse.pedagogical_situation);
      setStatsData(statsResponse.statistics);
      setAvailableYears(situationResponse.available_years);
      
      // Set default year to the most recent
      if (!year && situationResponse.available_years.length > 0) {
        setSelectedYear(situationResponse.available_years[0].toString());
      }
      
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل الوضعية البيداغوجية');
      console.error('Error fetching pedagogical situation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPedagogicalSituation();
  }, []);

  const handleYearChange = (event) => {
    const year = event.target.value;
    setSelectedYear(year);
    fetchPedagogicalSituation(year);
  };

  const getSemesterColor = (semester) => {
    const colors = {
      'S1': '#3498db', 'S2': '#e67e22', 'S3': '#2ecc71',
      'S4': '#9b59b6', 'S5': '#e74c3c', 'S6': '#34495e'
    };
    return colors[semester] || '#95a5a6';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'E':
        return <CheckCircleIcon sx={{ color: '#27ae60', fontSize: 20 }} />;
      case 'D':
        return <CancelIcon sx={{ color: '#e74c3c', fontSize: 20 }} />;
      default:
        return <InfoIcon sx={{ color: '#95a5a6', fontSize: 20 }} />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'E':
        return 'Inscrit - مسجل';
      case 'D':
        return 'Désinscrit - غير مسجل';
      default:
        return status || 'Non défini';
    }
  };

  const StatCard = ({ title, value, color, subtitle }) => (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        color: 'white'
      }}
    >
      <Typography variant="h3" fontWeight="bold">
        {value}
      </Typography>
      <Typography variant="h6" fontWeight="600">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );

  if (isLoading) {
    return <Loading message="جاري تحميل الوضعية البيداغوجية... Loading pedagogical situation..." />;
  }

  const currentYearStats = statsData.find(stat => stat.year === parseInt(selectedYear));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssignmentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          📚 الوضعية البيداغوجية - Pedagogical Situation
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => fetchPedagogicalSituation(selectedYear)}
          sx={{ ml: 'auto' }}
          variant="outlined"
        >
          تحديث
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Year Filter */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>السنة الجامعية - Academic Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={handleYearChange}
                  label="السنة الجامعية - Academic Year"
                >
                  <MenuItem value="">جميع السنوات - All Years</MenuItem>
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year} - {parseInt(year) + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Stats for selected year */}
            {currentYearStats && (
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <StatCard
                      title="إجمالي الوحدات"
                      value={currentYearStats.total_modules}
                      color="#3498db"
                      subtitle="Total Modules"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard
                      title="وحدات مسجلة"
                      value={currentYearStats.enrolled_modules}
                      color="#27ae60"
                      subtitle="Enrolled"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard
                      title="الوحدات"
                      value={currentYearStats.modules}
                      color="#e67e22"
                      subtitle="Modules"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard
                      title="المواد"
                      value={currentYearStats.subjects}
                      color="#9b59b6"
                      subtitle="Subjects"
                    />
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          💡 <strong>الوضعية البيداغوجية:</strong> تعرض جميع الوحدات والمواد المسجل بها الطالب حسب السنة الجامعية.
          الحالة "مسجل" تعني أن الطالب مسجل رسمياً في هذه الوحدة.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Pedagogical Situation:</strong> Shows all modules and subjects the student is registered for by academic year.
          "Enrolled" status means the student is officially registered for this module.
        </Typography>
      </Alert>

      {/* Pedagogical Situation Display */}
      {situationData && Object.keys(situationData).length > 0 ? (
        <Box>
          {Object.entries(situationData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, yearData]) => (
            <Accordion key={year} sx={{ mb: 2, borderRadius: 2 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
                  color: 'white',
                  borderRadius: '8px 8px 0 0'
                }}
              >
                <Typography variant="h6" fontWeight="600">
                  📅 السنة الجامعية {year} - {parseInt(year) + 1}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {Object.entries(yearData)
                  .sort(([a], [b]) => {
                    const semA = parseInt(a.replace('S', '')) || 0;
                    const semB = parseInt(b.replace('S', '')) || 0;
                    return semA - semB;
                  })
                  .map(([semester, modules]) => {
                    const semesterColor = getSemesterColor(semester);
                    
                    return (
                      <Card key={semester} sx={{ m: 2, borderRadius: 2 }}>
                        <CardContent>
                          {/* Semester Header */}
                          <Box
                            sx={{
                              background: `linear-gradient(135deg, ${semesterColor} 0%, ${semesterColor}CC 100%)`,
                              color: 'white',
                              p: 2,
                              borderRadius: 2,
                              mb: 2
                            }}
                          >
                            <Typography variant="h6" fontWeight="600">
                              {semester !== 'Unknown' ? 
                                `${semester} - السداسي ${semester.replace('S', '')}` : 
                                'غير محدد - Unknown Semester'
                              }
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {modules.length} وحدة/مادة - {modules.length} modules/subjects
                            </Typography>
                          </Box>

                          {/* Modules Table */}
                          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                            <Table>
                              <TableHead>
                                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                  <TableCell sx={{ fontWeight: 600 }}>رمز الوحدة</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>اسم الوحدة/المادة</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>النوع</TableCell>
                                  <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>الحالة</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {modules
                                  .sort((a, b) => (a.cod_elp || '').localeCompare(b.cod_elp || ''))
                                  .map((module, index) => (
                                  <TableRow
                                    key={`${module.cod_elp}-${index}`}
                                    sx={{
                                      '&:hover': { bgcolor: '#f5f5f5' },
                                      '&:nth-of-type(odd)': { bgcolor: '#fafafa' }
                                    }}
                                  >
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                      {module.cod_elp}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 300 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {module.lib_elp}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={
                                          module.element_type === 'MODULE' ? 'وحدة - Module' :
                                          module.element_type === 'MATIERE' ? 'مادة - Subject' :
                                          module.element_type === 'SEMESTRE' ? 'سداسي - Semester' :
                                          'غير محدد - Unknown'
                                        }
                                        color={
                                          module.element_type === 'MODULE' ? 'primary' :
                                          module.element_type === 'MATIERE' ? 'secondary' :
                                          module.element_type === 'SEMESTRE' ? 'success' :
                                          'default'
                                        }
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        {getStatusIcon(module.eta_iae)}
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                          {getStatusLabel(module.eta_iae)}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>

                          {/* Semester Summary */}
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              ملخص السداسي - Semester Summary:
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={6} sm={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h6" fontWeight="bold" color="primary">
                                    {modules.length}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    إجمالي - Total
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h6" fontWeight="bold" color="success.main">
                                    {modules.filter(m => m.eta_iae === 'E').length}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    مسجل - Enrolled
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h6" fontWeight="bold" color="warning.main">
                                    {modules.filter(m => m.element_type === 'MODULE').length}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    وحدات - Modules
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h6" fontWeight="bold" color="secondary.main">
                                    {modules.filter(m => m.element_type === 'MATIERE').length}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    مواد - Subjects
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لا توجد وضعية بيداغوجية متاحة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedYear ? 
              `لا توجد بيانات للسنة ${selectedYear}. جرب اختيار سنة أخرى.` :
              'لا توجد بيانات متاحة. تأكد من تحديث البيانات.'
            }
          </Typography>
        </Paper>
      )}

      {/* Overall Statistics */}
      {statsData.length > 0 && (
        <Card sx={{ mt: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom color="primary">
              📊 إحصائيات عامة - Overall Statistics
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>السنة</strong></TableCell>
                    <TableCell align="center"><strong>إجمالي الوحدات</strong></TableCell>
                    <TableCell align="center"><strong>وحدات مسجلة</strong></TableCell>
                    <TableCell align="center"><strong>وحدات</strong></TableCell>
                    <TableCell align="center"><strong>مواد</strong></TableCell>
                    <TableCell align="center"><strong>فصول</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statsData.map((stat) => (
                    <TableRow key={stat.year}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {stat.year} - {parseInt(stat.year) + 1}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={stat.total_modules} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={stat.enrolled_modules} color="success" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={stat.modules} color="warning" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={stat.subjects} color="secondary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={stat.semesters} color="info" size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Footer Info */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          💡 ملاحظة: الوضعية البيداغوجية تُظهر الوحدات والمواد المتعاقد عليها حسب السنة الجامعية.
          الحالة "مسجل" تعني التسجيل الإداري الفعال في الوحدة.<br/>
          Note: The pedagogical situation shows modules and subjects contracted by academic year.
          "Enrolled" status means active administrative registration in the module.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PedagogicalSituation;