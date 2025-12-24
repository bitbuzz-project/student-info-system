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
  Tabs,
  Tab
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
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

  // --- HELPER: MOVE YEAR MODULES TO CORRECT TAB ---
  const processSituationData = (data) => {
    if (!data) return null;
    const processed = JSON.parse(JSON.stringify(data));

    Object.keys(processed).forEach(year => {
      const yearData = processed[year];
      if (yearData.semester_elements && yearData.semester_elements['Unknown']) {
        const unknownModules = yearData.semester_elements['Unknown'];
        const remainingUnknowns = [];

        unknownModules.forEach(mod => {
          const modName = (mod.lib_elp || '').toLowerCase();
          const modCode = (mod.cod_elp || '').toUpperCase();
          const isYearly = mod.element_type === 'ANNEE' || modName.includes('année') || modName.includes('year');

          if (isYearly) {
            let level = 'Unknown';
            if (modName.includes('première') || modCode.includes('1A') || modCode.includes('0A1')) level = '1A';
            else if (modName.includes('deuxième') || modCode.includes('2A') || modCode.includes('0A2')) level = '2A';
            else if (modName.includes('troisième') || modCode.includes('3A') || modCode.includes('0A3')) level = '3A';
            
            if (!yearData.yearly_elements) yearData.yearly_elements = {};
            if (!yearData.yearly_elements[level]) yearData.yearly_elements[level] = [];
            yearData.yearly_elements[level].push(mod);
          } else {
            remainingUnknowns.push(mod);
          }
        });

        if (remainingUnknowns.length > 0) yearData.semester_elements['Unknown'] = remainingUnknowns;
        else delete yearData.semester_elements['Unknown'];
      }
    });
    return processed;
  };

  const fetchPedagogicalSituation = async (year = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const [situationResponse, statsResponse] = await Promise.all([
        studentAPI.getPedagogicalSituation({ year }),
        studentAPI.getPedagogicalStats()
      ]);

      // Handle Year Sorting and Default Selection
      let years = situationResponse.available_years || [];
      // Sort years descending (newest first)
      years = years.sort((a, b) => parseInt(b) - parseInt(a));
      setAvailableYears(years);

      // If no year was selected and we have years available, 
      // set the latest year and RE-FETCH for that specific year to filter
      if (!year && years.length > 0) {
        const latestYear = years[0].toString();
        setSelectedYear(latestYear);
        // Call recursively for the specific year
        fetchPedagogicalSituation(latestYear); 
        return; // Stop processing this generic request
      }

      const cleanData = processSituationData(situationResponse.pedagogical_situation);
      setSituationData(cleanData);
      setStatsData(statsResponse.statistics);
      
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل الوضعية البيداغوجية');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPedagogicalSituation(); }, []);

  const handleYearChange = (event) => {
    const year = event.target.value;
    setSelectedYear(year);
    fetchPedagogicalSituation(year);
  };

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // --- HELPERS (Colors) ---
  const getSemesterColor = (semester) => {
    if (semester === 'Unknown' || semester === 'Annuel') return '#8e44ad';
    const colors = { 'S1': '#3498db', 'S2': '#e67e22', 'S3': '#2ecc71', 'S4': '#9b59b6', 'S5': '#e74c3c', 'S6': '#34495e' };
    return colors[semester] || '#95a5a6';
  };
  const getAcademicLevelColor = (level) => {
    const colors = { '1A': '#3498db', '2A': '#e67e22', '3A': '#2ecc71', '4A': '#9b59b6', '5A': '#e74c3c' };
    return colors[level] || '#95a5a6';
  };
  const getAcademicLevelLabel = (level) => {
    const labels = { '1A': 'السنة الأولى', '2A': 'السنة الثانية', '3A': 'السنة الثالثة', '4A': 'السنة الرابعة', '5A': 'السنة الخامسة' };
    return labels[level] || level;
  };

  // --- RENDER FUNCTIONS ---

  const renderYearlyElements = (yearlyElements) => {
    if (!yearlyElements || Object.keys(yearlyElements).length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CalendarIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">لا توجد عناصر سنوية</Typography>
        </Box>
      );
    }
    return (
      <Box>
        {Object.entries(yearlyElements).sort(([a], [b]) => a.localeCompare(b)).map(([academicLevel, modules]) => (
          <Card key={academicLevel} sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ background: `linear-gradient(135deg, ${getAcademicLevelColor(academicLevel)} 0%, ${getAcademicLevelColor(academicLevel)}CC 100%)`, color: 'white', p: 2, borderRadius: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight="600">{academicLevel} - {getAcademicLevelLabel(academicLevel)}</Typography>
              </Box>
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 600 }}>رمز الوحدة</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>اسم الوحدة/المادة</TableCell>
                      {/* Removed Type and Status */}
                      <TableCell sx={{ fontWeight: 600, textAlign: 'center', width: '200px' }}>المجموعة / Group</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modules.sort((a, b) => (a.cod_elp || '').localeCompare(b.cod_elp || '')).map((module, index) => (
                      <TableRow key={`${module.cod_elp}-${index}`} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{module.cod_elp}</TableCell>
                        <TableCell sx={{ maxWidth: 350 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{module.lib_elp}</Typography>
                          {module.lib_elp_arb && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'Amiri, serif', fontSize: '0.85rem', mt: 0.5 }}>
                              {module.lib_elp_arb}
                            </Typography>
                          )}
                        </TableCell>
                        {/* Group Display */}
                        <TableCell sx={{ textAlign: 'center' }}>
                          {module.group_name ? (
                            <Chip 
                              label={module.group_name} 
                              sx={{ 
                                bgcolor: '#e0f2f1', 
                                color: '#00695c', 
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                height: '32px',
                                '& .MuiChip-label': { px: 2 }
                              }} 
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
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
          <Typography variant="h6" color="text.secondary">لا توجد فصول</Typography>
        </Box>
      );
    }
    return (
      <Box>
        {Object.entries(semesterElements).sort(([a], [b]) => {
            if (a === 'Unknown') return 1; if (b === 'Unknown') return -1;
            return (parseInt(a.replace('S', '')) || 0) - (parseInt(b.replace('S', '')) || 0);
          }).map(([semester, modules]) => {
            
            let displaySemester = semester;
            let displayLabel = `${semester} - السداسي ${semester.replace('S', '')}`;
            
            if (semester === 'Unknown') {
              const hasYearlyModules = modules.some(m => m.element_type === 'ANNEE' || (m.lib_elp || '').toLowerCase().includes('année'));
              if (hasYearlyModules) { displaySemester = 'Annuel'; displayLabel = 'النتائج السنوية - Annual Results'; }
              else { displayLabel = 'غير محدد - Unassigned Modules'; }
            }

            const semesterColor = getSemesterColor(displaySemester === 'Annuel' ? 'Annuel' : semester);
            
            return (
              <Card key={semester} sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ background: `linear-gradient(135deg, ${semesterColor} 0%, ${semesterColor}CC 100%)`, color: 'white', p: 2, borderRadius: 2, mb: 2 }}>
                    <Typography variant="h6" fontWeight="600">{displayLabel}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{modules.length} وحدة/مادة</Typography>
                  </Box>
                  <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                          <TableCell sx={{ fontWeight: 600 }}>رمز الوحدة</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>اسم الوحدة/المادة</TableCell>
                          {/* Removed Type and Status */}
                          <TableCell sx={{ fontWeight: 600, textAlign: 'center', width: '200px' }}>المجموعة / Group</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modules.sort((a, b) => (a.cod_elp || '').localeCompare(b.cod_elp || '')).map((module, index) => (
                          <TableRow key={`${module.cod_elp}-${index}`} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{module.cod_elp}</TableCell>
                            <TableCell sx={{ maxWidth: 350 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{module.lib_elp}</Typography>
                              {module.lib_elp_arb && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'Amiri, serif', fontSize: '0.85rem', mt: 0.5 }}>
                                  {module.lib_elp_arb}
                                </Typography>
                              )}
                            </TableCell>
                            {/* Group Display */}
                            <TableCell sx={{ textAlign: 'center' }}>
                              {module.group_name ? (
                                <Chip 
                                  label={module.group_name} 
                                  sx={{ 
                                    bgcolor: '#e0f2f1', 
                                    color: '#00695c', 
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    height: '32px',
                                    '& .MuiChip-label': { px: 2 }
                                  }} 
                                />
                              ) : (
                                <Typography variant="caption" color="text.secondary">-</Typography>
                              )}
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

  if (isLoading) return <Loading message="جاري تحميل الوضعية البيداغوجية..." />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssignmentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">📚 الوضعية البيداغوجية</Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => fetchPedagogicalSituation(selectedYear)} sx={{ ml: 'auto' }} variant="outlined">تحديث</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>السنة الجامعية</InputLabel>
            <Select value={selectedYear} onChange={handleYearChange} label="السنة الجامعية">
              <MenuItem value="">جميع السنوات</MenuItem>
              {availableYears.map((year) => <MenuItem key={year} value={year}>{year} - {parseInt(year) + 1}</MenuItem>)}
            </Select>  
          </FormControl>
        </CardContent>
      </Card>
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}><Typography variant="body2">💡 <strong>الوضعية البيداغوجية:</strong> تعرض جميع الوحدات والمواد المسجل بها الطالب حسب كل سنة جامعية.</Typography></Alert>
      {situationData && Object.keys(situationData).length > 0 ? (
        <Box>
          {Object.entries(situationData).sort(([a], [b]) => parseInt(b) - parseInt(a)).map(([year, yearData]) => (
            <Accordion key={year} sx={{ mb: 2, borderRadius: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', color: 'white', borderRadius: '8px 8px 0 0' }}>
                <Typography variant="h6" fontWeight="600">📅 السنة الجامعية {year} - {parseInt(year) + 1}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <Box sx={{ width: '100%' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
                    <Tab label={`السنوات (${Object.keys(yearData.yearly_elements || {}).length})`} icon={<CalendarIcon />} />
                    <Tab label={`الوحدات (${Object.keys(yearData.semester_elements || {}).length})`} icon={<TimelineIcon />} />
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
          <Typography variant="h6" color="text.secondary" gutterBottom>لا توجد وضعية بيداغوجية متاحة</Typography>
          <Typography variant="body2" color="text.secondary">{selectedYear ? `لا توجد بيانات للسنة ${selectedYear}.` : 'لا توجد بيانات متاحة.'}</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PedagogicalSituation;