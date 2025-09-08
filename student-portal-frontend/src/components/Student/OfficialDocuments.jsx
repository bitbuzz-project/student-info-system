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

  CircularProgress,

  Dialog,

  DialogTitle,

  DialogContent,

  DialogActions,

} from '@mui/material';

import {

  Description as DescriptionIcon,

  Download as DownloadIcon,

  Print as PrintIcon,

  Refresh as RefreshIcon,

  Assignment as AssignmentIcon,

  PictureAsPdf as PdfIcon,

} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';

import Loading from '../common/Loading';

import { studentAPI } from '../../services/api';



const OfficialDocuments = () => {

  const [documentsData, setDocumentsData] = useState(null);

  const [selectedSemester, setSelectedSemester] = useState('');

  const [availableSemesters, setAvailableSemesters] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const [previewDialog, setPreviewDialog] = useState(false);

  const [previewSemester, setPreviewSemester] = useState(null);

  const { user } = useAuth();



  const processDocumentsData = (rawData) => {

    const processedData = {};

    const availableSemestersSet = new Set();

    for (const semesterCode in rawData) {

      if (rawData.hasOwnProperty(semesterCode)) {

        const semesterData = rawData[semesterCode];

        const modulesMap = new Map();

        semesterData.subjects.forEach(subject => {

          if (subject.cod_tre === null) return;

          const currentGrade = parseFloat(subject.not_elp);

          const existingModule = modulesMap.get(subject.cod_elp);

          if (!existingModule || currentGrade > parseFloat(existingModule.not_elp) || (currentGrade === parseFloat(existingModule.not_elp) && subject.final_session > existingModule.final_session)) {

            modulesMap.set(subject.cod_elp, { ...subject, is_passed: parseFloat(subject.not_elp) >= 10 });

          }

        });

        const filteredSubjects = Array.from(modulesMap.values()).sort((a, b) => a.cod_elp.localeCompare(b.cod_elp));

        processedData[semesterCode] = { subjects: filteredSubjects };

        availableSemestersSet.add(semesterCode);

      }

    }

    return { documents: processedData, available_semesters: Array.from(availableSemestersSet).sort() };

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

      setError(err.response?.data?.error || 'Failed to load transcripts');

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

    fetchOfficialDocuments(semester);

  };



  const generateClientPDF = async (semesterData, semesterCode) => {

    const jsPDF = (await import('jspdf')).default;

    await import('jspdf-autotable');



    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();



    try {

      const fontResponse = await fetch('/fonts/Amiri-Regular.ttf');

      if (!fontResponse.ok) {

        throw new Error(`Font file not found at /fonts/Amiri-Regular.ttf.`);

      }

      const fontBlob = await fontResponse.blob();

      const reader = new FileReader();

      const fontBase64 = await new Promise((resolve, reject) => {

        reader.onloadend = () => resolve(reader.result.split(',')[1]);

        reader.onerror = reject;

        reader.readAsDataURL(fontBlob);

      });

      doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);

      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'bold');

    } catch (fontError) {

      console.error("CRITICAL: Could not load the Amiri font for PDF generation.", fontError);

      setError('PDF Generation Failed: Could not load "Amiri-Regular.ttf". Please ensure it exists in the "public/fonts/" directory.');

      return null;

    }



    doc.setFont('Amiri', 'normal');



    const primaryColor = [44, 62, 80];

    const textColor = [33, 37, 41];



    doc.setFillColor(...primaryColor);

    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(16);

    doc.setFont('Amiri', 'bold');

    doc.text('FACULTÉ DES SCIENCES JURIDIQUES ET POLITIQUES', pageWidth / 2, 15, { align: 'center' });

    doc.setFont('Amiri', 'normal');

    doc.setFontSize(11);

    doc.text('UNIVERSITÉ HASSAN 1ER - SETTAT', pageWidth / 2, 22, { align: 'center' });

    doc.text('كلية العلوم القانونية والسياسية - سطات', pageWidth / 2, 30, { align: 'center' });



    doc.setTextColor(...textColor);

    doc.setFontSize(22);

    doc.setFont('Amiri', 'bold');

    doc.text('RELEVÉ DE NOTES OFFICIEL', pageWidth / 2, 50, { align: 'center' });

    doc.setFont('Amiri', 'normal');

    doc.setFontSize(16);

    doc.text('كشف النقط الرسمي', pageWidth / 2, 60, { align: 'center' });



    const semesterNames = {

      'S1': 'Semestre 1 - السداسي الأول', 'S2': 'Semestre 2 - السداسي الثاني',

      'S3': 'Semestre 3 - السداسي الثالث', 'S4': 'Semestre 4 - السداسي الرابع',

      'S5': 'Semestre 5 - السداسي الخامس', 'S6': 'Semestre 6 - السداسي السادس'

    };

    doc.setFontSize(14);

    doc.text(semesterNames[semesterCode] || semesterCode, pageWidth / 2, 70, { align: 'center' });

   

    // ✅ FIX: Robustly find the academic year from any subject in the list.

    const firstSubjectWithYear = semesterData.subjects.find(subject => subject.cod_anu);

    const academicYear = firstSubjectWithYear ? firstSubjectWithYear.cod_anu : 'N/A';

    doc.setFontSize(10);

    doc.text(`Année Universitaire ${academicYear} / السنة الجامعية`, pageWidth / 2, 78, { align: 'center' });



    doc.autoTable({

        body: [

            [`Nom complet / الاسم الكامل:`, `${user?.nom_complet || 'N/A'}`],

            [`Code étudiant / رقم الطالب:`, `${user?.cod_etu || 'N/A'}`],

            [`Spécialité / التخصص:`, `${user?.etape || 'N/A'}`],

            [`Date d'émission / تاريخ الإصدار:`, `${new Date().toLocaleDateString('fr-FR')}`]

        ],

        startY: 88, theme: 'plain',

        styles: { fontSize: 9, cellPadding: 1.5, font: 'Amiri' },

        columnStyles: { 0: { fontStyle: 'bold' } }

    });



    const tableData = semesterData.subjects.map(subject => [

      subject.cod_elp, subject.lib_elp, subject.not_elp !== null ? parseFloat(subject.not_elp).toFixed(2) : 'ABS',

      subject.cod_tre || '-', subject.final_session === 1 ? 'Normale' : 'Rattrapage',

      subject.is_passed ? 'Validé' : 'Non Validé'

    ]);

    doc.autoTable({

      startY: doc.lastAutoTable.finalY + 10,

      head: [['Code', 'Module / Matière', 'Note /20', 'Résultat', 'Session', 'Statut']],

      body: tableData, theme: 'grid',

      styles: { font: 'Amiri', fontSize: 8.5, cellPadding: 2.5, textColor: textColor, lineColor: [220, 220, 220], lineWidth: 0.2 },

      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },

      columnStyles: {

        0: { font: 'helvetica', fontStyle: 'bold' },

        1: { cellWidth: 70 },

      },

      didParseCell: function(data) {

          if (data.column.index === 5 && data.cell.section === 'body') {

              if (data.cell.text[0] === 'Validé') { data.cell.styles.textColor = [39, 174, 96]; }

              if (data.cell.text[0] === 'Non Validé') { data.cell.styles.textColor = [192, 57, 43]; }

          }

      }

    });



    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont('Amiri', 'normal');

    doc.setFontSize(8);

    doc.setTextColor(150);

    doc.text(`Ce relevé est officiel et certifié par le système académique.`, pageWidth / 2, pageHeight - 15, { align: 'center' });

    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

   

    return doc;

  };



  const handleDownloadPDF = async (semesterCode, semesterData) => {

    setIsGenerating(true); setError(null);

    try {

      const doc = await generateClientPDF(semesterData, semesterCode);

      if (doc) {

        doc.save(`Releve_Notes_${semesterCode}_${user.cod_etu}.pdf`);

      }

    } catch (err) {

      console.error("Error in handleDownloadPDF:", err);

      if(!error) setError('An unexpected error occurred during PDF generation.');

    }

    finally { setIsGenerating(false); }

  };



  const handlePrintTranscript = async (semesterCode, semesterData) => {

    setIsGenerating(true); setError(null);

    try {

      const doc = await generateClientPDF(semesterData, semesterCode);

      if (doc) {

        doc.output('dataurlnewwindow');

      }

    } catch (err) {

      console.error("Error in handlePrintTranscript:", err);

      if(!error) setError('Failed to prepare transcript for printing.');

    }

    finally { setIsGenerating(false); }

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

  const getSemesterDisplayName = (semesterCode) => {

    const semesterNames = {

      'S1': 'السداسي الأول - Semestre 1', 'S2': 'السداسي الثاني - Semestre 2',

      'S3': 'السداسي الثالث - Semestre 3', 'S4': 'السداسي الرابع - Semestre 4',

      'S5': 'السداسي الخامس - Semestre 5', 'S6': 'السداسي السادس - Semestre 6'

    };

    return semesterNames[semesterCode] || semesterCode;

  };



  const TranscriptPreview = ({ semesterCode, semesterData }) => {

    // ✅ FIX: Apply the same robust logic to the preview component.

    const firstSubjectWithYear = semesterData.subjects.find(subject => subject.cod_anu);

    const academicYear = firstSubjectWithYear ? firstSubjectWithYear.cod_anu : 'N/A';

    return (

      <Paper sx={{ p: 4, mb: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>

        <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '3px solid #3498db' }}>

          <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>🎓 كشف النقط الرسمي</Typography>

          <Typography variant="h5" color="text.secondary" gutterBottom>RELEVÉ DE NOTES OFFICIEL</Typography>

        </Box>

        <Box sx={{ textAlign: 'center', mb: 3 }}>

          <Typography variant="h6" fontWeight="600" color="primary">📚 {getSemesterDisplayName(semesterCode)}</Typography>

          <Typography variant="body1" color="text.secondary">Année Universitaire {academicYear}</Typography>

        </Box>

        <Box sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>

          <Typography variant="h6" fontWeight="600" gutterBottom color="primary">👤 Informations Étudiant</Typography>

          <Grid container spacing={2}>

            <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Nom complet / الاسم الكامل</Typography><Typography variant="body1" fontWeight="500">{user?.nom_complet || 'N/A'}</Typography></Grid>

            <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Code étudiant / رقم الطالب</Typography><Typography variant="body1" fontWeight="500">{user?.cod_etu || 'N/A'}</Typography></Grid>

            <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Spécialité / التخصص</Typography><Typography variant="body1" fontWeight="500">{user?.etape || 'N/A'}</Typography></Grid>

            <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Date d'émission / تاريخ الإصدار</Typography><Typography variant="body1" fontWeight="500">{new Date().toLocaleDateString('fr-FR')}</Typography></Grid>

          </Grid>

        </Box>

        <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid #e0e0e0' }}>

          <Table><TableHead><TableRow sx={{ bgcolor: '#3498db' }}><TableCell sx={{ fontWeight: 600, color: 'white' }}>Code</TableCell><TableCell sx={{ fontWeight: 600, color: 'white' }}>Module</TableCell><TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>Note</TableCell><TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>Résultat</TableCell><TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>Session</TableCell></TableRow></TableHead>

            <TableBody>

              {semesterData.subjects.map((subject, index) => (

                <TableRow key={index} sx={{ '&:nth-of-type(even)': { bgcolor: '#f8f9fa' } }}>

                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{subject.cod_elp}</TableCell>

                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{subject.lib_elp}</Typography></TableCell>

                  <TableCell sx={{ textAlign: 'center' }}><Chip label={subject.not_elp !== null ? parseFloat(subject.not_elp).toFixed(2) : 'ABS'} sx={{ bgcolor: getGradeColor(subject.not_elp), color: 'white', fontWeight: 'bold' }} /></TableCell>

                  <TableCell sx={{ textAlign: 'center' }}><Typography variant="body2" sx={{ fontWeight: 500 }}>{subject.cod_tre || '-'}</Typography></TableCell>

                  <TableCell sx={{ textAlign: 'center' }}><Chip label={subject.final_session === 1 ? 'Normale' : 'Rattrapage'} color={subject.final_session === 1 ? 'primary' : 'secondary'} size="small" /></TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        </TableContainer>

      </Paper>

    );

  }



  if (isLoading) return <Loading message="Loading official documents..." />;



  return (

    <Box sx={{ p: 3 }}>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}><DescriptionIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} /><Typography variant="h4" fontWeight="600" color="primary">📄 Relevés de Notes</Typography><Button startIcon={<RefreshIcon />} onClick={() => fetchOfficialDocuments(selectedSemester)} sx={{ ml: 'auto' }} variant="outlined">Refresh</Button></Box>

      {error && (<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>)}

      <Card sx={{ mb: 3, borderRadius: 3 }}><CardContent><FormControl fullWidth><InputLabel>Sélectionner le Semestre</InputLabel><Select value={selectedSemester} onChange={handleSemesterChange} label="Sélectionner le Semestre"><MenuItem value=""><em>Tous les Semestres</em></MenuItem>{availableSemesters.map((semester) => (<MenuItem key={semester} value={semester.replace('S', '')}>{getSemesterDisplayName(semester)}</MenuItem>))}</Select></FormControl></CardContent></Card>

     

      {documentsData && Object.keys(documentsData).length > 0 ? (

        Object.entries(documentsData)

          .sort(([a], [b]) => a.localeCompare(b))

          .map(([semesterCode, semesterData]) => (

            <Box key={semesterCode} sx={{ mb: 4 }}>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px:2 }}>

                <Typography variant="h5" fontWeight="600" color="text.secondary">{getSemesterDisplayName(semesterCode)}</Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>

                  <Button startIcon={<PdfIcon />} onClick={() => handlePreview(semesterCode, semesterData)} variant="outlined" color="info" size="small">Aperçu</Button>

                  <Button startIcon={<PrintIcon />} onClick={() => handlePrintTranscript(semesterCode, semesterData)} variant="contained" disabled={isGenerating} size="small">{isGenerating ? <CircularProgress size={20} /> : 'Imprimer'}</Button>

                  <Button startIcon={<DownloadIcon />} onClick={() => handleDownloadPDF(semesterCode, semesterData)} variant="contained" color="secondary" disabled={isGenerating} size="small">Télécharger PDF</Button>

                </Box>

              </Box>

              <TranscriptPreview semesterCode={semesterCode} semesterData={semesterData} />

            </Box>

        ))

      ) : (

        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>

          <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />

          <Typography variant="h6" color="text.secondary">Aucun document officiel disponible</Typography>

        </Paper>

      )}



      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="lg" fullWidth>

        <DialogTitle>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            <Typography variant="h6">Aperçu du Relevé de Notes</Typography>

            {previewSemester && (

              <Box>

                <Button startIcon={<PrintIcon />} onClick={() => handlePrintTranscript(previewSemester.code, previewSemester.data)} variant="outlined" sx={{ mr: 1 }} disabled={isGenerating}>Imprimer</Button>

                <Button startIcon={<DownloadIcon />} onClick={() => handleDownloadPDF(previewSemester.code, previewSemester.data)} variant="contained" disabled={isGenerating}>Télécharger PDF</Button>

              </Box>

            )}

          </Box>

        </DialogTitle>

        <DialogContent>{previewSemester && <TranscriptPreview semesterCode={previewSemester.code} semesterData={previewSemester.data} />}</DialogContent>

        <DialogActions><Button onClick={() => setPreviewDialog(false)}>Fermer</Button></DialogActions>

      </Dialog>

    </Box>

  );

};



export default OfficialDocuments;

