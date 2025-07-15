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
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon
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
  const [tabValue, setTabValue] = useState(0);
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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getSemesterColor = (semester) => {
    const colors = {
      'S1': '#3498db', 'S2': '#e67e22', 'S3': '#2ecc71',
      'S4': '#9b59b6', 'S5': '#e74c3c', 'S6': '#34495e'
    };
    return colors[semester] || '#95a5a6';
  };

  const getAcademicLevelColor = (level) => {
    const colors = {
      '1A': '#3498db', '2A': '#e67e22', '3A': '#2ecc71',
      '4A': '#9b59b6', '5A': '#e74c3c', 'Unknown': '#95a5a6'
    };
    return colors[level] || '#95a5a6';
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

  const getAcademicLevelLabel = (level) => {
    const labels = {
      '1A': 'السنة الأولى - First Year',
      '2A': 'السنة الثانية - Second Year',
      '3A': 'السنة الثالثة - Third Year',
      '4A': 'السنة الرابعة - Fourth Year',
      '5A': 'السنة الخامسة - Fifth Year',
      'Unknown': 'غير محدد - Unknown'
    };
    return labels[level] || level;
  };

  const renderYearlyElements = (yearlyElements) => {
    if (!yearlyElements || Object.keys(yearlyElements).length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CalendarIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            لا توجد عناصر سنوية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No yearly elements found
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        {Object.entries(yearlyElements)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([academicLevel, modules]) => (
            <Card key={academicLevel} sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${getAcademicLevelColor(academicLevel)} 0%, ${getAcademicLevelColor(academicLevel)}CC 100%)`,
                    color: 'white',
                    p: 2,
                    borderRadius: 2,
                    mb: 2
                  }}
                >
                  <Typography variant="h6" fontWeight="600">
                    {academicLevel} - {getAcademicLevelLabel(academicLevel)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {modules.length} وحدة/مادة - {modules.length} modules/subjects
                  </Typography>
                </Box>
                
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
                              label="عنصر سنوي - Yearly Element"
                              color="secondary"
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
              </CardContent>
            </Card>
          ))}
      </Box>
    );
  };

  const renderSemesterElements = (semesterElements) => {
    if (!semesterElements || Object.keys(semesterElements).length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <TimelineIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            لا توجد عناصر فصلية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No semester elements found
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        {Object.entries(semesterElements)
          .sort(([a], [b]) => {
            const semA = parseInt(a.replace('S', '')) || 0;
            const semB = parseInt(b.replace('S', '')) || 0;
            return semA - semB;
          })
          .map(([semester, modules]) => {
            const semesterColor = getSemesterColor(semester);
            
            return (
              <Card key={semester} sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
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
                </CardContent>
              </Card>
            );
          })}
      </Box>
    );
  };

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
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
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
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          💡 <strong>الوضعية البيداغوجية:</strong> تعرض جميع الوحدات والمواد المسجل بها الطالب.
          العناصر السنوية تمثل برامج كاملة (مثل السنة الأولى، الثانية، إلخ)، بينما العناصر الفصلية تمثل مواد محددة في سداسي معين.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Pedagogical Situation:</strong> Shows all modules and subjects the student is registered for.
          Yearly elements represent complete programs (like First Year, Second Year, etc.), while semester elements represent specific subjects in a particular semester.
        </Typography>
      </Alert>

      {/* Pedagogical Situation Display */}
      {situationData && Object.keys(situationData).length > 0 ? (
        <Box>
          {Object.entries(situationData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, yearData]) => (
            <Accordion key={year} sx={{ mb: 2, borderRadius: 2 }} defaultExpanded>
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
              <AccordionDetails sx={{ p: 3 }}>
                <Box sx={{ width: '100%' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
                    <Tab 
                      label={`العناصر السنوية (${Object.keys(yearData.yearly_elements || {}).length})`} 
                      icon={<CalendarIcon />}
                    />
                    <Tab 
                      label={`العناصر الفصلية (${Object.keys(yearData.semester_elements || {}).length})`} 
                      icon={<TimelineIcon />}
                    />
                  </Tabs>
                  
                  {tabValue === 0 && renderYearlyElements(yearData.yearly_elements)}
                  {tabValue === 1 && renderSemesterElements(yearData.semester_elements)}
                </Box>
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

      {/* Footer Info */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          💡 ملاحظة: الوضعية البيداغوجية محدثة لتمييز بين العناصر السنوية والفصلية.
          العناصر السنوية تمثل برامج كاملة، بينما العناصر الفصلية تمثل مواد محددة في سداسي معين.<br/>
          Note: The pedagogical situation has been updated to distinguish between yearly and semester elements.
          Yearly elements represent complete programs, while semester elements represent specific subjects in a particular semester.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PedagogicalSituation;