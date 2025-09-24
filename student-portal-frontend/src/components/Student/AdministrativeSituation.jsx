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
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import Loading from '../common/Loading';

const AdministrativeSituation = () => {
  const [situationData, setSituationData] = useState(null);
  const [statsData, setStatsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const { t } = useTranslation();

  const fetchAdministrativeSituation = async (year = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [situationResponse, statsResponse] = await Promise.all([
        studentAPI.getAdministrativeSituation({ year }),
        studentAPI.getAdministrativeStats()
      ]);
      
      setSituationData(situationResponse.administrative_situation);
      setStatsData(statsResponse.statistics);
      setAvailableYears(situationResponse.available_years);
      
      // Set default year to the most recent
      if (!year && situationResponse.available_years.length > 0) {
        setSelectedYear(situationResponse.available_years[0].toString());
      }
      
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل الوضعية الإدارية');
      console.error('Error fetching administrative situation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdministrativeSituation();
  }, []);

  const handleYearChange = (event) => {
    const year = event.target.value;
    setSelectedYear(year);
    fetchAdministrativeSituation(year);
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
        return 'نشط - Active';
      case 'D':
        return 'غير نشط - Inactive';
      default:
        return status || 'غير محدد - Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'E': return '#27ae60';
      case 'D': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-MA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return <Loading message="جاري تحميل الوضعية الإدارية... Loading administrative situation..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AdminIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          📋 الوضعية الإدارية - Administrative Situation
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => fetchAdministrativeSituation(selectedYear)}
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
          💡 <strong>الوضعية الإدارية:</strong> تعرض جميع تسجيلاتك الإدارية عبر السنوات الجامعية.
          تتضمن معلومات حول حالة التسجيل، التخصص، وعدد مرات التسجيل في كل مرحلة.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Administrative Situation:</strong> Shows all your administrative registrations across academic years.
          Includes information about registration status, specialization, and number of registrations at each stage.
        </Typography>
      </Alert>

      {/* Statistics Summary */}
      {statsData.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarIcon sx={{ mr: 1 }} />
              إحصائيات التسجيل - Registration Statistics
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {statsData.map((stat) => (
                <Grid item xs={12} sm={6} md={4} key={stat.year}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {stat.year} - {parseInt(stat.year) + 1}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          التسجيلات النشطة
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {stat.active_registrations}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          إجمالي التسجيلات
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {stat.total_registrations}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Administrative Situation Display */}
      {situationData && Object.keys(situationData).length > 0 ? (
        <Box>
          {Object.entries(situationData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, registrations]) => (
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
                  <Chip 
                    label={`${registrations.length} تسجيل`} 
                    size="small" 
                    sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                        <TableCell sx={{ fontWeight: 600 }}>التخصص</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>رمز التخصص</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>الحالة</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>تاريخ الإنشاء</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>عدد التسجيلات</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>منشئ التسجيل</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {registrations
                        .sort((a, b) => new Date(b.dat_cre_iae) - new Date(a.dat_cre_iae))
                        .map((registration, index) => (
                        <TableRow
                          key={`${registration.cod_etp}-${index}`}
                          sx={{
                            '&:hover': { bgcolor: '#f5f5f5' },
                            '&:nth-of-type(odd)': { bgcolor: '#fafafa' }
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {registration.lib_etp || registration.lic_etp || 'غير محدد'}
                            </Typography>
                            {registration.lib_dip && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                الدبلوم: {registration.lib_dip}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {registration.cod_etp}
                            {registration.cod_vrs_vet && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                الإصدار: {registration.cod_vrs_vet}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              {getStatusIcon(registration.eta_iae)}
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {getStatusLabel(registration.eta_iae)}
                              </Typography>
                            </Box>
                            {registration.tem_iae_prm === 'O' && (
                              <Chip 
                                label="تسجيل أساسي" 
                                size="small" 
                                color="primary" 
                                sx={{ mt: 0.5 }} 
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Typography variant="body2">
                              {formatDate(registration.dat_cre_iae)}
                            </Typography>
                            {registration.dat_mod_iae && registration.dat_mod_iae !== registration.dat_cre_iae && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                آخر تعديل: {formatDate(registration.dat_mod_iae)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Grid container spacing={1}>
                              <Grid item xs={4}>
                                <Typography variant="body2" color="primary">
                                  {registration.nbr_ins_cyc || 0}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  دورة
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="body2" color="success.main">
                                  {registration.nbr_ins_etp || 0}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  مرحلة
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="body2" color="warning.main">
                                  {registration.nbr_ins_dip || 0}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  دبلوم
                                </Typography>
                              </Grid>
                            </Grid>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              icon={<PersonIcon />}
                              label={registration.cod_uti || 'النظام'} 
                              size="small" 
                              variant="outlined" 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لا توجد وضعية إدارية متاحة
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
      وات الجامعية مع تفاصيل حالة كل تسجيل وعدد مرات التسجيل في كل مرحلة.<br/>
Note: The administrative situation shows all your administrative registrations across academic years
with details of each registration status and the number of registrations at each stage.
</Typography>
</Paper>
</Box>
);
};
export default AdministrativeSituation;