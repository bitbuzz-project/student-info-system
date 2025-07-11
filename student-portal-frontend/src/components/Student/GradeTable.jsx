import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Grid,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const GradeTable = ({ gradesData, hasArabicNames = false }) => {
  const { t } = useTranslation();

  if (!gradesData || Object.keys(gradesData).length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          {t('selectFilters')}
        </Typography>
      </Box>
    );
  }

  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'default';
    const numGrade = parseFloat(grade);
    if (numGrade >= 16) return 'success';
    if (numGrade >= 14) return 'info';
    if (numGrade >= 12) return 'primary';
    if (numGrade >= 10) return 'warning';
    return 'error';
  };

  const getGradeIcon = (grade) => {
    if (grade === null || grade === undefined) return '❌';
    const numGrade = parseFloat(grade);
    if (numGrade >= 16) return '🌟';
    if (numGrade >= 14) return '⭐';
    if (numGrade >= 12) return '✨';
    if (numGrade >= 10) return '✅';
    return '❌';
  };

  const getResultLabel = (result, grade) => {
    if (result === 'V') return '✅ مقبول - Validé';
    if (result === 'NV') return '❌ مرفوض - Non Validé';
    if (result === 'AJ') return '⏳ مؤجل - Ajourné';
    if (grade === null || grade === undefined) return '❌ غائب - Absent';
    return result || '-';
  };

  const getSemesterColor = (semester) => {
    const colors = {
      'S1': '#3498db', 'S2': '#e67e22', 'S3': '#2ecc71',
      'S4': '#9b59b6', 'S5': '#e74c3c', 'S6': '#34495e'
    };
    return colors[semester] || '#95a5a6';
  };

  const calculateSemesterStats = (grades) => {
    const validGrades = grades.filter(g => g.not_elp !== null && g.not_elp !== undefined);
    const total = validGrades.length;
    const passed = validGrades.filter(g => parseFloat(g.not_elp) >= 10).length;
    const average = total > 0 ? 
      (validGrades.reduce((sum, g) => sum + parseFloat(g.not_elp), 0) / total).toFixed(2) : 
      null;
    
    return { total, passed, failed: total - passed, average };
  };

  const renderGradesForStructure = (structure) => {
    return Object.entries(structure).map(([studyYear, yearData]) => (
      <Accordion key={studyYear} sx={{ mb: 2, borderRadius: 2 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            color: 'white',
            borderRadius: '8px 8px 0 0',
            '&:hover': {
              background: 'linear-gradient(135deg, #2980b9 0%, #3498db 100%)'
            }
          }}
        >
          <Typography variant="h6" fontWeight="600">
            📚 السنة الجامعية {studyYear} - {parseInt(studyYear) + 1}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {Object.entries(yearData).map(([sessionNum, sessionData]) =>
            Object.entries(sessionData).map(([sessionType, sessionTypeData]) =>
              Object.entries(sessionTypeData).map(([academicYear, academicYearData]) =>
                Object.entries(academicYearData).map(([semester, semesterGrades]) => {
                  const stats = calculateSemesterStats(semesterGrades);
                  const semesterColor = getSemesterColor(semester);
                  
                  return (
                    <Card key={`${sessionNum}-${sessionType}-${academicYear}-${semester}`} sx={{ m: 2, borderRadius: 2 }}>
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
                          <Grid container alignItems="center">
                            <Grid item xs={12} sm={6}>
                              <Typography variant="h6" fontWeight="600">
                                {semester} - الفصل {semester.replace('S', '')}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {sessionType === 'automne' ? '🍂 دورة الخريف' : '🌸 دورة الربيع'} | 
                                {sessionNum === '1' ? ' عادية' : ' استدراكية'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <Chip
                                  icon={<SchoolIcon />}
                                  label={`${stats.total} مواد`}
                                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                />
                                <Chip
                                  icon={<TrendingUpIcon />}
                                  label={`${stats.passed} نجح`}
                                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                />
                                {stats.average && (
                                  <Chip
                                    icon={<StarIcon />}
                                    label={`معدل: ${stats.average}`}
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                  />
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>

                        {/* Grades Table */}
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                          <Table>
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                <TableCell sx={{ fontWeight: 600 }}>رمز المادة</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>اسم المادة</TableCell>
                                {hasArabicNames && (
                                  <TableCell sx={{ fontWeight: 600 }}>الاسم بالعربية</TableCell>
                                )}
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>النقطة</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>النتيجة</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>النوع</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {semesterGrades
                                .sort((a, b) => (a.cod_elp || '').localeCompare(b.cod_elp || ''))
                                .map((grade, index) => (
                                <TableRow
                                  key={`${grade.cod_elp}-${index}`}
                                  sx={{
                                    '&:hover': { bgcolor: '#f5f5f5' },
                                    '&:nth-of-type(odd)': { bgcolor: '#fafafa' }
                                  }}
                                >
                                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                    {grade.cod_elp}
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 300 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {grade.lib_elp}
                                    </Typography>
                                  </TableCell>
                                  {hasArabicNames && (
                                    <TableCell sx={{ maxWidth: 300, direction: 'rtl' }}>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          fontWeight: 500,
                                          fontFamily: 'Arabic UI Text, Arial'
                                        }}
                                      >
                                        {grade.lib_elp_arb || grade.lib_elp}
                                      </Typography>
                                    </TableCell>
                                  )}
                                  <TableCell sx={{ textAlign: 'center' }}>
                                    <Chip
                                      icon={<span>{getGradeIcon(grade.not_elp)}</span>}
                                      label={grade.not_elp !== null ? 
                                        parseFloat(grade.not_elp).toFixed(2) : 'ABS'
                                      }
                                      color={getGradeColor(grade.not_elp)}
                                      sx={{ 
                                        fontWeight: 600,
                                        minWidth: 80
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {getResultLabel(grade.cod_tre, grade.not_elp)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ textAlign: 'center' }}>
                                    <Chip
                                      label={grade.is_module ? 'وحدة' : 'مادة'}
                                      size="small"
                                      color={grade.is_module ? 'secondary' : 'primary'}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        {/* Semester Summary */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                          <Grid container spacing={2} textAlign="center">
                            <Grid item xs={3}>
                              <Typography variant="h6" color="primary.main" fontWeight="bold">
                                {stats.total}
                              </Typography>
                              <Typography variant="caption">إجمالي</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="h6" color="success.main" fontWeight="bold">
                                {stats.passed}
                              </Typography>
                              <Typography variant="caption">نجح</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="h6" color="error.main" fontWeight="bold">
                                {stats.failed}
                              </Typography>
                              <Typography variant="caption">رسب</Typography>
                            </Grid>
                            <Grid item xs={3}>
                              <Typography variant="h6" color="info.main" fontWeight="bold">
                                {stats.average || 'N/A'}
                              </Typography>
                              <Typography variant="caption">معدل</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })
              )
            )
          )}
        </AccordionDetails>
      </Accordion>
    ));
  };

  return (
    <Box sx={{ p: 3 }}>
      {renderGradesForStructure(gradesData)}
    </Box>
  );
};

export default GradeTable;