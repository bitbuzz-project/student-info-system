// src/components/Student/GradeTable.jsx
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
  Grid, // Keep Grid for the new legend layout
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next'; // Keep useTranslation for other parts of the component

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

  const getSemesterColor = (semester) => {
    const colors = {
      'S1': '#3498db', 'S2': '#e67e22', 'S3': '#2ecc71',
      'S4': '#9b59b6', 'S5': '#e74c3c', 'S6': '#34495e'
    };
    return colors[semester] || '#95a5a6';
  };



  // Removed the getResultStatusLabel function as it's no longer needed.

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
                                {semester} - السداسي {semester.replace('S', '')}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {sessionType === 'automne' ? '  الدورة الخريفية' : '  الدورة الربيعية'} | 
                                {sessionNum === '1' ? ' عادية' : ' استدراكية'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                             
                            </Grid>
                          </Grid>
                        </Box>

                        {/* Grades Table */}
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                          <Table>
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Code </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}> Module</TableCell>
                                {hasArabicNames && (
                                  <TableCell sx={{ fontWeight: 600, direction: 'rtl' }}>الاسم بالعربية</TableCell>
                                )}
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Note</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Resultat</TableCell>
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
                                          fontFamily: 'Arabic UI Text, Arial',
                                          direction: 'rtl',
                                          textAlign: 'right'
                                        }}
                                      >
                                        {grade.lib_elp_arb || grade.lib_elp}
                                      </Typography>
                                    </TableCell>
                                  )}
                                  <TableCell sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {grade.not_elp !== null ? 
                                        parseFloat(grade.not_elp).toFixed(2) : '-'
                                      }
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {grade.cod_tre || '-'} {/* Displaying the raw code */}
                                    </Typography>
                                  </TableCell>
                                  
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        {/* Result Legend (replaces old Semester Summary) */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                           Explication des codes de résultat:
                          </Typography>
                          <Grid container spacing={1} sx={{ fontSize: '0.9em' }}>
                            <Grid item xs={6}>
                              <Typography variant="body2" fontWeight="bold">V:</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Validé </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" fontWeight="bold">NV:</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Non validé </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" fontWeight="bold">VAR:</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Validé après rattrapage </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" fontWeight="bold">ACR:</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Acquis par compensation</Typography>
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