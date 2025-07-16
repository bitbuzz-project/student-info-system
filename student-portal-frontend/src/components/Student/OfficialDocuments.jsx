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
  Button,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../common/Loading';

const OfficialDocuments = () => {
  const [documentsData, setDocumentsData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();

  const fetchOfficialDocuments = async (semester = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await studentAPI.getOfficialDocuments({ semester });
      setDocumentsData(response.documents);
      setAvailableSemesters(response.available_semesters);
      
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل الوثائق الرسمية');
      console.error('Error fetching official documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficialDocuments();
  }, []);

  const handleSemesterChange = (event) => {
    const semester = event.target.value;
    setSelectedSemester(semester);
    if (semester) {
      fetchOfficialDocuments(semester);
    } else {
      fetchOfficialDocuments();
    }
  };

  const generateTranscript = async (semesterCode) => {
    setIsGenerating(true);
    try {
      // Here you would typically call an API to generate PDF
      // For now, we'll just show the transcript view
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Open print dialog
      window.print();
      
    } catch (err) {
      setError('فشل في إنشاء كشف النقط');
    } finally {
      setIsGenerating(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return '#95a5a6';
    const numGrade = parseFloat(grade);
    if (numGrade >= 16) return '#27ae60';
    if (numGrade >= 14) return '#3498db';
    if (numGrade >= 12) return '#f39c12';
    if (numGrade >= 10) return '#e67e22';
    return '#e74c3c';
  };

  const getResultIcon = (isPassed) => {
    return isPassed ? 
      <CheckCircleIcon sx={{ color: '#27ae60', fontSize: 20 }} /> :
      <CancelIcon sx={{ color: '#e74c3c', fontSize: 20 }} />;
  };

  const getSemesterDisplayName = (semesterCode) => {
    const semesterNames = {
      'S1': 'السداسي الأول - Semester 1',
      'S2': 'السداسي الثاني - Semester 2',
      'S3': 'السداسي الثالث - Semester 3',
      'S4': 'السداسي الرابع - Semester 4',
      'S5': 'السداسي الخامس - Semester 5',
      'S6': 'السداسي السادس - Semester 6'
    };
    return semesterNames[semesterCode] || semesterCode;
  };

  const TranscriptView = ({ semesterCode, semesterData }) => (
    <Paper 
      sx={{ 
        p: 4, 
        mb: 3, 
        borderRadius: 3,
        '@media print': {
          boxShadow: 'none',
          border: '1px solid #ccc'
        }
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
          🎓 كشف النقط الرسمي
        </Typography>
        <Typography variant="h5" color="text.secondary">
          Official Academic Transcript
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" fontWeight="600">
          {getSemesterDisplayName(semesterCode)}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          السنة الجامعية 2024-2025
        </Typography>
      </Box>

      {/* Student Information */}
      <Box sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          👤 معلومات الطالب - Student Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">الاسم الكامل</Typography>
            <Typography variant="body1" fontWeight="500">
              {user?.nom_complet || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">رقم الطالب</Typography>
            <Typography variant="body1" fontWeight="500">
              {user?.cod_etu || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">التخصص</Typography>
            <Typography variant="body1" fontWeight="500">
              {user?.etape || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">تاريخ الإنشاء</Typography>
            <Typography variant="body1" fontWeight="500">
              {new Date().toLocaleDateString('ar-MA')}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Grades Table */}
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600 }}>رمز المادة</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>اسم المادة</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>النقطة</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>النتيجة</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
        {/* Update the TableRow in TranscriptView */}
{semesterData.subjects.map((subject, index) => (
    
  <TableRow key={index}>
    
    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
      {subject.cod_elp}
    </TableCell>
    <TableCell sx={{ maxWidth: 300 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {subject.lib_elp}
      </Typography>
    </TableCell>
    <TableCell sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Chip
          label={subject.not_elp !== null ? parseFloat(subject.not_elp).toFixed(2) : 'ABS'}
          sx={{
            bgcolor: getGradeColor(subject.not_elp),
            color: 'white',
            fontWeight: 'bold',
            mb: 0.5
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Session {subject.final_session}
        </Typography>
      </Box>
    </TableCell>
    <TableCell sx={{ textAlign: 'center' }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {subject.cod_tre || '-'}
      </Typography>
    </TableCell>
    <TableCell sx={{ textAlign: 'center' }}>
      {getResultIcon(subject.is_passed)}
    </TableCell>
  </TableRow>
))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Statistics */}
      <Box sx={{ p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          📊 الإحصائيات - Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {semesterData.statistics.total_subjects}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي المواد
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {semesterData.statistics.passed_subjects}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                المواد المنجحة
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {semesterData.statistics.failed_subjects}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                المواد الراسبة
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">
                {semesterData.statistics.average_grade}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                المعدل العام
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center', '@media print': { mt: 6 } }}>
        <Typography variant="body2" color="text.secondary">
          هذا الكشف رسمي ومُصدق من النظام الأكاديمي
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This transcript is official and certified by the academic system
        </Typography>
      </Box>
    </Paper>
  );

  if (isLoading) {
    return <Loading message="جاري تحميل الوثائق الرسمية... Loading official documents..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DescriptionIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          📄 {t('officialDocuments')}
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => fetchOfficialDocuments(selectedSemester)}
          sx={{ ml: 'auto' }}
          variant="outlined"
        >
          {t('refresh')}
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Semester Filter */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            🎯 {t('generateTranscript')}
          </Typography>
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>{t('selectSemester')}</InputLabel>
            <Select
              value={selectedSemester}
              onChange={handleSemesterChange}
              label={t('selectSemester')}
            >
              <MenuItem value="">جميع السداسيات - All Semesters</MenuItem>
              {availableSemesters.map((semester) => (
                <MenuItem key={semester} value={semester.replace('S', '')}>
                  {getSemesterDisplayName(semester)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          💡 <strong>الوثائق الرسمية:</strong> هذه الصفحة تعرض النقط النهائية المعتمدة رسمياً من جدول RESULTAT_ELP.
          يمكنك إنشاء كشف نقط رسمي لأي سداسي وطباعته أو تحميله.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Official Documents:</strong> This page shows the final official grades from RESULTAT_ELP table.
          You can generate an official transcript for any semester and print or download it.
        </Typography>
      </Alert>

      {/* Documents Display */}
      {documentsData && Object.keys(documentsData).length > 0 ? (
        <Box>
          {Object.entries(documentsData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([semesterCode, semesterData]) => (
            <Box key={semesterCode} sx={{ mb: 4 }}>
              {/* Semester Header with Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" fontWeight="600" color="primary">
                  📚 {getSemesterDisplayName(semesterCode)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    startIcon={<PrintIcon />}
                    onClick={() => generateTranscript(semesterCode)}
                    variant="contained"
                    color="primary"
                    disabled={isGenerating}
                  >
                    {isGenerating ? <CircularProgress size={20} /> : 'طباعة'}
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => generateTranscript(semesterCode)}
                    variant="outlined"
                    color="secondary"
                    disabled={isGenerating}
                  >
                    تحميل PDF
                  </Button>
                </Box>
              </Box>

              {/* Transcript View */}
              <TranscriptView semesterCode={semesterCode} semesterData={semesterData} />
            </Box>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لا توجد وثائق رسمية متاحة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No official documents available for the current academic year.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default OfficialDocuments;