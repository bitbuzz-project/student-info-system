// Fixed OfficialDocuments.jsx
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon,
  PictureAsPdf as PdfIcon,
  CloudDownload as CloudDownloadIcon,
  Computer as ComputerIcon
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
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewSemester, setPreviewSemester] = useState(null);
  const [pdfMethod, setPdfMethod] = useState('server');
  const { t } = useTranslation();
  const { user } = useAuth();

  const processDocumentsData = (rawData) => {
    const processedData = {};
    const availableSemestersSet = new Set();

    for (const semesterCode in rawData) {
      if (rawData.hasOwnProperty(semesterCode)) {
        const semesterData = rawData[semesterCode];
        const modulesMap = new Map(); // Map to store the highest grade for each module

        semesterData.subjects.forEach(subject => {
          // Filter out grades where cod_tre is null
          if (subject.cod_tre === null) {
            return; 
          }

          const currentGrade = parseFloat(subject.not_elp);
          const existingModule = modulesMap.get(subject.cod_elp);

          // If no existing module or current grade is higher, update the map
          // And also ensure it takes the latest session if grades are equal (e.g., Session 2 over Session 1)
          if (!existingModule || 
              currentGrade > parseFloat(existingModule.not_elp) || 
              (currentGrade === parseFloat(existingModule.not_elp) && subject.final_session > existingModule.final_session)) {
            modulesMap.set(subject.cod_elp, subject);
          }
        });

        // Convert map values back to an array and sort by cod_elp
        const filteredSubjects = Array.from(modulesMap.values()).sort((a, b) => a.cod_elp.localeCompare(b.cod_elp));

        // Recalculate statistics for the filtered subjects (though they will be removed from display, still useful for PDF data if needed elsewhere)
        const total_subjects = filteredSubjects.length;
        let passed_subjects = 0;
        let failed_subjects = 0;
        let absent_subjects = 0;
        let sum_grades = 0;
        let count_valid_grades = 0;

        filteredSubjects.forEach(subject => {
          if (subject.not_elp !== null) {
            const gradeValue = parseFloat(subject.not_elp);
            if (gradeValue >= 10) {
              passed_subjects++;
            } else {
              failed_subjects++;
            }
            sum_grades += gradeValue;
            count_valid_grades++;
          } else {
            absent_subjects++;
          }
        });

        const average_grade = count_valid_grades > 0 ? (sum_grades / count_valid_grades).toFixed(2) : null;

        processedData[semesterCode] = {
          subjects: filteredSubjects,
          statistics: {
            total_subjects,
            passed_subjects,
            failed_subjects,
            absent_subjects,
            average_grade
          }
        };
        availableSemestersSet.add(semesterCode);
      }
    }
    return {
      documents: processedData,
      available_semesters: Array.from(availableSemestersSet).sort()
    };
  };

  const fetchOfficialDocuments = async (semester = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await studentAPI.getOfficialDocuments({ semester });
      const { documents, available_semesters } = processDocumentsData(response.documents);

      setDocumentsData(documents);
      setAvailableSemesters(available_semesters);
      
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل كشوفات النقط');
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

  // Client-side PDF generation using jsPDF
  const generateClientPDF = async (semesterData, semesterCode) => {
    // Dynamically import jsPDF
    const jsPDF = (await import('jspdf')).default;
    
    // Import autotable plugin
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Colors
    const primaryColor = [52, 152, 219];
    const secondaryColor = [44, 62, 80];
    const textColor = [33, 37, 41];
    const lightGray = [248, 249, 250];
    
    // Header with university branding
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // University name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FACULTÉ DES SCIENCES JURIDIQUES ET POLITIQUES', pageWidth/2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('UNIVERSITÉ HASSAN 1ER - SETTAT', pageWidth/2, 25, { align: 'center' });
    doc.text('كلية العلوم القانونية والسياسية - سطات', pageWidth/2, 35, { align: 'center' });
    
    // Document title
    doc.setTextColor(...textColor);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RELEVÉ DE NOTES OFFICIEL', pageWidth/2, 55, { align: 'center' });
    doc.setFontSize(14);
    doc.text('كشف النقط الرسمي', pageWidth/2, 65, { align: 'center' });
    
    // Semester info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const semesterNames = {
      'S1': 'السداسي الأول - Semestre 1',
      'S2': 'السداسي الثاني - Semestre 2',
      'S3': 'السداسي الثالث - Semestre 3',
      'S4': 'السداسي الرابع - Semestre 4',
      'S5': 'السداسي الخامس - Semestre 5',
      'S6': 'السداسي السادس - Semestre 6'
    };
    doc.text(semesterNames[semesterCode] || semesterCode, pageWidth/2, 75, { align: 'center' });
    
    // Academic year
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('السنة الجامعية 2024-2025 / Année Universitaire 2024-2025', pageWidth/2, 85, { align: 'center' });
    
    // Student information box
    doc.setFillColor(...lightGray);
    doc.rect(15, 95, pageWidth - 30, 30, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, 95, pageWidth - 30, 30, 'S');
    
    // Student info
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('معلومات الطالب / Informations Étudiant', 20, 105);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`الاسم الكامل / Nom complet: ${user?.nom_complet || 'N/A'}`, 20, 115);
    doc.text(`رقم الطالب / Code étudiant: ${user?.cod_etu || 'N/A'}`, 20, 122);
    
    const rightColumnX = pageWidth - 85;
    doc.text(`التخصص / Spécialité: ${user?.etape || 'N/A'}`, rightColumnX, 115);
    doc.text(`تاريخ الإصدار / Date: ${new Date().toLocaleDateString('fr-FR')}`, rightColumnX, 122);
    
    // Grades table
    const tableStartY = 135;
    const tableData = semesterData.subjects.map(subject => [
      subject.cod_elp,
      subject.lib_elp.length > 25 ? subject.lib_elp.substring(0, 25) + '...' : subject.lib_elp,
      subject.not_elp !== null ? parseFloat(subject.not_elp).toFixed(2) : 'ABS',
      subject.cod_tre || '-',
      subject.final_session === 1 ? 'Normale' : 'Rattrapage',
      subject.is_passed ? 'Admis' : 'Ajourné'
    ]);
    
    doc.autoTable({
      startY: tableStartY,
      head: [['Code', 'Module / Matière', 'Note', 'Résultat', 'Session', 'Statut']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        textColor: textColor,
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 55 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' }
      }
    });
    
    // Statistics section is removed from here

    // Footer
    // Adjust footerY to account for removed statistics section
    const finalY = doc.lastAutoTable.finalY + 15; // Position after table
    const footerY = pageHeight - 25; // Keep fixed at bottom if space allows
    // If table and student info pushes content too far, use finalY + margin
    const dynamicFooterY = Math.max(finalY, pageHeight - 25); 

    doc.setDrawColor(200, 200, 200);
    doc.line(15, dynamicFooterY, pageWidth - 15, dynamicFooterY);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('هذا الكشف رسمي ومُصدق من النظام الأكاديمي', 20, dynamicFooterY + 8);
    doc.text('Ce relevé est officiel et certifié par le système académique', 20, dynamicFooterY + 15);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 
             pageWidth - 15, dynamicFooterY + 8, { align: 'right' });
    
    // University stamp placeholder
    doc.setDrawColor(100, 100, 100);
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth - 35, dynamicFooterY - 15, 12, 'S');
    doc.setFontSize(6);
    doc.text('CACHET', pageWidth - 35, dynamicFooterY - 18, { align: 'center' });
    doc.text('UNIVERSITÉ', pageWidth - 35, dynamicFooterY - 12, { align: 'center' });
    
    return doc;
  };

  // Handle PDF download with selected method
  const handleDownloadPDF = async (semesterCode, semesterData) => {
    try {
      setIsGenerating(true);
      
      if (pdfMethod === 'server') {
        // Server-side PDF generation
        // Note: The server-side needs to implement the "highest grade per module" logic
        // and removal of statistics if that's desired for server-generated PDFs.
        await studentAPI.downloadTranscriptPDF(semesterCode.replace('S', ''), user.cod_etu);
      } else {
        // Client-side PDF generation with processed data
        const doc = await generateClientPDF(semesterData, semesterCode);
        const filename = `Releve_Notes_${semesterCode}_${user.cod_etu}_${new Date().getFullYear()}.pdf`;
        doc.save(filename);
      }
      
    } catch (err) {
      setError('فشل في إنشاء ملف PDF');
      console.error('PDF generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle PDF printing with selected method
  const handlePrintTranscript = async (semesterCode, semesterData) => {
    try {
      setIsGenerating(true);
      
      if (pdfMethod === 'server') {
        // Server-side PDF generation
        // Same note as above regarding server-side logic for highest grade and statistics.
        await studentAPI.printTranscriptPDF(semesterCode.replace('S', ''));
      } else {
        // Client-side PDF generation with processed data
        const doc = await generateClientPDF(semesterData, semesterCode);
        const pdfOutput = doc.output('bloburl');
        const printWindow = window.open(pdfOutput);
        
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }
      
    } catch (err) {
      setError('فشل في طباعة الكشف');
      console.error('Print error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = (semesterCode, semesterData) => {
    setPreviewSemester({ code: semesterCode, data: semesterData });
    setPreviewDialog(true);
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
      'S1': 'السداسي الأول - Semestre 1',
      'S2': 'السداسي الثاني - Semestre 2',
      'S3': 'السداسي الثالث - Semestre 3',
      'S4': 'السداسي الرابع - Semestre 4',
      'S5': 'السداسي الخامس - Semestre 5',
      'S6': 'السداسي السادس - Semestre 6'
    };
    return semesterNames[semesterCode] || semesterCode;
  };

  const TranscriptPreview = ({ semesterCode, semesterData }) => {
    // semesterData here is already processed to contain only the highest grade for each module with cod_tre not null
    const displaySubjects = semesterData.subjects;

    return (
      <Paper 
        sx={{ 
          p: 4, 
          mb: 3, 
          borderRadius: 3,
          minHeight: '600px',
          position: 'relative'
        }}
      >
        {/* Official Header */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 4,
          pb: 2,
          borderBottom: '3px solid #3498db'
        }}>
          <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
            🎓 كشف النقط الرسمي
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            RELEVÉ DE NOTES OFFICIEL
          </Typography>
          <Typography variant="body1" color="text.secondary">
            كلية العلوم القانونية والسياسية - جامعة الحسن الأول - سطات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Faculté des Sciences Juridiques et Politiques - Université Hassan 1er - Settat
          </Typography>
        </Box>

        {/* Semester and Year Info */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="600" color="primary">
            📚 {getSemesterDisplayName(semesterCode)}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            السنة الجامعية 2024-2025 / Année Universitaire 2024-2025
          </Typography>
        </Box>

        {/* Student Information */}
        <Box sx={{ 
          mb: 4, 
          p: 3, 
          bgcolor: '#f8f9fa', 
          borderRadius: 2,
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6" fontWeight="600" gutterBottom color="primary">
            👤 معلومات الطالب - Informations Étudiant
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">الاسم الكامل / Nom complet</Typography>
              <Typography variant="body1" fontWeight="500">
                {user?.nom_complet || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">رقم الطالب / Code étudiant</Typography>
              <Typography variant="body1" fontWeight="500">
                {user?.cod_etu || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">التخصص / Spécialité</Typography>
              <Typography variant="body1" fontWeight="500">
                {user?.etape || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">تاريخ الإصدار / Date d'émission</Typography>
              <Typography variant="body1" fontWeight="500">
                {new Date().toLocaleDateString('fr-FR')}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Grades Table */}
        <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#3498db' }}>
                <TableCell sx={{ fontWeight: 600, color: 'white' }}>رمز المادة<br/>Code</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white' }}>اسم المادة<br/>Module</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>النقطة<br/>Note</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>النتيجة<br/>Résultat</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>الدورة<br/>Session</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displaySubjects.map((subject, index) => (
                <TableRow key={index} sx={{ '&:nth-of-type(even)': { bgcolor: '#f8f9fa' } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {subject.cod_elp}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {subject.lib_elp}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Chip
                      label={subject.not_elp !== null ? parseFloat(subject.not_elp).toFixed(2) : 'ABS'}
                      sx={{
                        bgcolor: getGradeColor(subject.not_elp),
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: 60
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {subject.cod_tre || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Chip
                      label={subject.final_session === 1 ? 'عادية' : 'استدراكية'}
                      color={subject.final_session === 1 ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
             
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Statistics section removed from here */}

        {/* Official Footer */}
        <Box sx={{ 
          mt: 4, 
          pt: 3, 
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center',
          position: 'relative'
        }}>
          <Typography variant="body2" color="text.secondary">
            هذا الكشف رسمي ومُصدق من النظام الأكاديمي للجامعة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ce relevé est officiel et certifié par le système académique de l'université
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
          </Typography>
          
          {/* University Seal Placeholder */}
          <Box sx={{ 
            position: 'absolute',
            right: 20,
            top: 10,
            width: 80,
            height: 80,
            border: '2px solid #3498db',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(52, 152, 219, 0.1)'
          }}>
            <Typography variant="caption" color="primary" textAlign="center">
              CACHET<br/>UNIVERSITÉ<br/>HASSAN 1ER
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  if (isLoading) {
    return <Loading message="جاري تحميل كشوفات النقط... Loading official documents..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DescriptionIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          📄كشوفات النقط
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => fetchOfficialDocuments(selectedSemester)}
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

      {/* Controls */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            {/* Semester Filter */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>اختر السداسي</InputLabel>
                <Select
                  value={selectedSemester}
                  onChange={handleSemesterChange}
                  label="اختر السداسي"
                >
                  <MenuItem value="">جميع السداسيات - All Semesters</MenuItem>
                  {availableSemesters.map((semester) => (
                    <MenuItem key={semester} value={semester.replace('S', '')}>
                      {getSemesterDisplayName(semester)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* PDF Generation Method */}
          

            {/* Method Info */}
            
          </Grid>
        </CardContent>
      </Card>

      {/* Instructions */}
   
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
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<PdfIcon />}
                    onClick={() => handlePreview(semesterCode, semesterData)}
                    variant="outlined"
                    color="info"
                    size="small"
                  >
                    معاينة
                  </Button>
                  <Button
                    startIcon={<PrintIcon />}
                    onClick={() => handlePrintTranscript(semesterCode, semesterData)}
                    variant="contained"
                    color="primary"
                    disabled={isGenerating}
                    size="small"
                  >
                    {isGenerating ? <CircularProgress size={20} /> : 'طباعة'}
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadPDF(semesterCode, semesterData)}
                    variant="contained"
                    color="secondary"
                    disabled={isGenerating}
                    size="small"
                  >
                    تحميل PDF
                  </Button>
                </Box>
              </Box>

              {/* Transcript Preview */}
              <TranscriptPreview semesterCode={semesterCode} semesterData={semesterData} />
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

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              معاينة كشف النقط - Preview Transcript
            </Typography>
            <Box>
              {previewSemester && (
                <>
                  <Button
                    startIcon={<PrintIcon />}
                    onClick={() => handlePrintTranscript(previewSemester.code, previewSemester.data)}
                    variant="outlined"
                    sx={{ mr: 1 }}
                    disabled={isGenerating}
                  >
                    طباعة
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadPDF(previewSemester.code, previewSemester.data)}
                    variant="contained"
                    disabled={isGenerating}
                  >
                    تحميل PDF
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {previewSemester && (
            <TranscriptPreview 
              semesterCode={previewSemester.code} 
              semesterData={previewSemester.data} 
            />
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficialDocuments;