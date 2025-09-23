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
import { DocumentSecurity } from '../../services/documentSecurity';

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

  // Helper function to extract academic year from semester data
  const getAcademicYearFromSemesterData = (semesterData) => {
    const yearCounts = {};
    semesterData.subjects.forEach(subject => {
      if (subject.cod_anu) {
        yearCounts[subject.cod_anu] = (yearCounts[subject.cod_anu] || 0) + 1;
      }
    });
    
    const years = Object.keys(yearCounts);
    if (years.length === 0) return 'N/A';
    
    const sortedYears = years.sort((a, b) => {
      const countDiff = yearCounts[b] - yearCounts[a];
      if (countDiff !== 0) return countDiff;
      return parseInt(b) - parseInt(a);
    });
    
    return sortedYears[0];
  };

  // Helper function to extract specialization from semester data
  const getSpecializationFromSemesterData = (semesterData, semesterCode) => {
    const dbSpecializations = semesterData.subjects
      .map(subject => subject.specialization)
      .filter(spec => spec && spec.trim() !== '')
      .filter((spec, index, arr) => arr.indexOf(spec) === index);
    
    if (dbSpecializations.length > 0) {
      const specializationCounts = {};
      dbSpecializations.forEach(spec => {
        specializationCounts[spec] = (specializationCounts[spec] || 0) + 1;
      });
      
      const sortedSpecs = Object.keys(specializationCounts).sort((a, b) => 
        specializationCounts[b] - specializationCounts[a]
      );
      
      return sortedSpecs[0];
    }
    
    // Fallback: analyze module names for specialization clues
    for (const subject of semesterData.subjects) {
      if (subject.lib_elp) {
        const moduleName = subject.lib_elp.toLowerCase();
        
        if (moduleName.includes('droit privé') || moduleName.includes('private law') || 
            moduleName.includes('civil') || moduleName.includes('commercial')) {
          return 'Droit Privé';
        }
        if (moduleName.includes('droit public') || moduleName.includes('public law') || 
            moduleName.includes('administratif') || moduleName.includes('constitutional')) {
          return 'Droit Public';
        }
        if (moduleName.includes('sciences politiques') || moduleName.includes('political science') || 
            moduleName.includes('politique') || moduleName.includes('relations internationales')) {
          return 'Sciences Politiques';
        }
        if (moduleName.includes('droit des affaires') || moduleName.includes('business law') || 
            moduleName.includes('économique') || moduleName.includes('entreprise')) {
          return 'Droit des Affaires';
        }
        if (moduleName.includes('droit international') || moduleName.includes('international law')) {
          return 'Droit International';
        }
        if (moduleName.includes('droit pénal') || moduleName.includes('criminal law') || 
            moduleName.includes('criminologie')) {
          return 'Droit Pénal';
        }
        if (moduleName.includes('droit social') || moduleName.includes('travail') || 
            moduleName.includes('social law') || moduleName.includes('employment')) {
          return 'Droit Social';
        }
      }
    }
    
    const semesterNum = parseInt(semesterCode.replace('S', ''));
    if (semesterNum <= 2) {
      return 'Droit et Sciences Politiques - Tronc Commun';
    } else if (semesterNum <= 4) {
      return 'Formation Fondamentale en Droit';
    } else {
      return 'Formation Spécialisée';
    }
  };

  const processDocumentsData = (rawData) => {
    const processedData = {};
    const availableSemestersSet = new Set();
    
    for (const semesterCode in rawData) {
      if (rawData.hasOwnProperty(semesterCode)) {
        const semesterData = rawData[semesterCode];
        const modulesMap = new Map();
        
        semesterData.subjects.forEach(subject => {
          const currentGrade = parseFloat(subject.not_elp);
          const existingModule = modulesMap.get(subject.cod_elp);
          
          if (!existingModule || 
              currentGrade > parseFloat(existingModule.not_elp) || 
              (currentGrade === parseFloat(existingModule.not_elp) && 
               subject.final_session > existingModule.final_session)) {
            
            modulesMap.set(subject.cod_elp, { 
              ...subject, 
              is_passed: parseFloat(subject.not_elp) >= 10,
              display_semester: subject.semester_number ? `S${subject.semester_number}` : 
                              subject.lib_elp.includes('année') || subject.lib_elp.includes('Année') ? 
                              subject.lib_elp : semesterCode
            });
          }
        });
        
        const filteredSubjects = Array.from(modulesMap.values())
          .sort((a, b) => a.cod_elp.localeCompare(b.cod_elp));
        
        const processedSemesterData = {
          subjects: filteredSubjects,
          academicYear: getAcademicYearFromSemesterData({ subjects: filteredSubjects }),
          specialization: getSpecializationFromSemesterData({ subjects: filteredSubjects }, semesterCode)
        };
        
        processedData[semesterCode] = processedSemesterData;
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
    try {
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
        console.error("Font loading failed, using default font:", fontError);
      }

      doc.setFont('Amiri', 'normal');

      const primaryColor = [44, 62, 80];
      const textColor = [33, 37, 41];

      // Header
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

      // Title
      doc.setTextColor(...textColor);
      doc.setFontSize(22);
      doc.setFont('Amiri', 'bold');
      doc.text('RELEVÉ DE NOTES OFFICIEL', pageWidth / 2, 50, { align: 'center' });
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(16);
      doc.text('كشف النقط الرسمي', pageWidth / 2, 60, { align: 'center' });

      // Semester info
      const semesterNames = {
        'S1': 'Semestre 1 - السداسي الأول', 'S2': 'Semestre 2 - السداسي الثاني',
        'S3': 'Semestre 3 - السداسي الثالث', 'S4': 'Semestre 4 - السداسي الرابع',
        'S5': 'Semestre 5 - السداسي الخامس', 'S6': 'Semestre 6 - السداسي السادس'
      };
      doc.setFontSize(14);
      doc.text(semesterNames[semesterCode] || semesterCode, pageWidth / 2, 70, { align: 'center' });
      
      // Academic year
      const academicYear = semesterData.academicYear || 'N/A';
      const formattedAcademicYear = academicYear !== 'N/A' ? `${academicYear}/${parseInt(academicYear) + 1}` : 'N/A';
      doc.setFontSize(10);
      doc.text(`Année Universitaire ${formattedAcademicYear} / السنة الجامعية`, pageWidth / 2, 78, { align: 'center' });

      // Student info table
      const specialization = semesterData.specialization || 'N/A';
      doc.autoTable({
          body: [
              [`Nom complet / الاسم الكامل:`, `${user?.nom_complet || 'N/A'}`],
              [`Date de naissance / تاريخ الازدياد:`, `${user?.date_naissance ? new Date(user.date_naissance).toLocaleDateString('fr-FR') : 'N/A'}`],
              [`Code étudiant / رقم الطالب:`, `${user?.cod_etu || 'N/A'}`],
              [`CIN / رقم البطاقة الوطنية:`, `${user?.cin || 'N/A'}`],
              [`Code Massar / الرقم الوطني للطالب:`, `${user?.cod_nne_ind || 'N/A'}`],
              [`Spécialité / التخصص:`, `${specialization}`],
          ],
          startY: 88, 
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 1.5, font: 'Amiri' },
          columnStyles: { 0: { fontStyle: 'bold' } }
      });

      // Separate regular modules from semester modules
      const regularModules = [];
      const semesterModules = [];

      semesterData.subjects.forEach(subject => {
        const moduleName = subject.lib_elp_arb && subject.lib_elp_arb.trim() !== '' ? subject.lib_elp_arb : subject.lib_elp;
        const moduleData = [
          moduleName.replace(/'/g, "'"), 
          subject.not_elp !== null ? parseFloat(subject.not_elp).toFixed(2) : 'ABS',
          subject.cod_tre || '-', 
          subject.final_session === 1 ? 'Normale' : 'Rattrapage',
        ];
        
        if (moduleName.toLowerCase().includes('semestre') || moduleName.toLowerCase().includes('سداسي')) {
          semesterModules.push(moduleData);
        } else {
          regularModules.push(moduleData);
        }
      });

      const tableData = [...regularModules, ...semesterModules];

      // Grades table
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Module / Matière', 'Note /20', 'Résultat', 'Session']],
        body: tableData, 
        theme: 'grid',
        styles: { 
          font: 'Amiri', 
          fontSize: 8.5, 
          cellPadding: 2.5, 
          textColor: textColor, 
          lineColor: [220, 220, 220], 
          lineWidth: 0.2 
        },
        headStyles: { 
          fillColor: primaryColor, 
          textColor: 255, 
          fontStyle: 'bold', 
          fontSize: 9, 
          halign: 'center' 
        },
        columnStyles: {
          0: { cellWidth: 90 },
        },
        didParseCell: function(data) {
          const cellText = data.cell.text[0];
          if (cellText && (cellText.toLowerCase().includes('semestre') || cellText.toLowerCase().includes('سداسي'))) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 248, 255];
          }
        }
      });

      // Generate security features
      const documentData = {
        studentId: user?.cod_etu,
        semester: semesterCode,
        timestamp: new Date().toISOString(),
        modules: semesterData.subjects
      };

      const verificationUrl = DocumentSecurity.generateVerificationUrl(documentData);
      const signature = DocumentSecurity.generateSignature(documentData);
      const qrCodeDataUrl = await DocumentSecurity.generateQRCode(verificationUrl);

      const pageHeight = doc.internal.pageSize.getHeight();

      // Add QR code if generated successfully
      if (qrCodeDataUrl) {
        try {
          const qrCodeImage = qrCodeDataUrl.split(',')[1];
          doc.addImage(qrCodeImage, 'PNG', pageWidth - 40, pageHeight - 50, 30, 30);
        } catch (qrError) {
          console.error('Failed to add QR code to PDF:', qrError);
        }
      }

      // Add verification info
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);

      const documentId = `DOC-${user?.cod_etu}-${semesterCode}-${Date.now()}`;
      doc.text(`ID Document: ${documentId}`, 15, pageHeight - 35);
      doc.text(`Signature numérique: ${signature.substring(0, 32)}...`, 15, pageHeight - 30);
      doc.text(`Vérification: Scannez le QR code ou visitez le lien de vérification`, 15, pageHeight - 25);

      // Footer text
      doc.setTextColor(150);
      doc.text(`هذا الكشف مستخرج من تطبيق وضعيتي للاطلاع والاستفسار فقط، ولا يُعتبر وثيقة نهائية إلا بعد المصادقة عليه من طرف المصلحة المختصة.`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')} | Certifié par le système académique`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      return doc;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  };

  const handleDownloadPDF = async (semesterCode, semesterData) => {
    setIsGenerating(true); 
    setError(null);
    try {
      const doc = await generateClientPDF(semesterData, semesterCode);
      if (doc) {
        doc.save(`Releve_Notes_${semesterCode}_${user.cod_etu}.pdf`);
      }
    } catch (err) {
      console.error("Error in handleDownloadPDF:", err);
      setError('Une erreur s\'est produite lors de la génération du PDF.');
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handlePrintTranscript = async (semesterCode, semesterData) => {
    setIsGenerating(true); 
    setError(null);
    try {
      const doc = await generateClientPDF(semesterData, semesterCode);
      if (doc) {
        doc.output('dataurlnewwindow');
      }
    } catch (err) {
      console.error("Error in handlePrintTranscript:", err);
      setError('Échec de la préparation du document pour l\'impression.');
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

  const getSemesterDisplayName = (semesterCode) => {
    const semesterNames = {
      'S1': 'السداسي الأول - Semestre 1', 'S2': 'السداسي الثاني - Semestre 2',
      'S3': 'السداسي الثالث - Semestre 3', 'S4': 'السداسي الرابع - Semestre 4',
      'S5': 'السداسي الخامس - Semestre 5', 'S6': 'السداسي السادس - Semestre 6'
    };
    return semesterNames[semesterCode] || semesterCode;
  };

  const TranscriptPreview = ({ semesterCode, semesterData }) => {
    const academicYear = semesterData.academicYear || 'N/A';
    const specialization = semesterData.specialization || 'N/A';
    const formattedAcademicYear = academicYear !== 'N/A' ? `${academicYear}/${parseInt(academicYear) + 1}` : 'N/A';
    
    return (
      <Paper sx={{ p: 4, mb: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>
        <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '3px solid #3498db' }}>
          <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
            🎓 كشف النقط الرسمي
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            RELEVÉ DE NOTES OFFICIEL
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="600" color="primary">
            📚 {getSemesterDisplayName(semesterCode)}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Année Universitaire {formattedAcademicYear}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <Typography variant="h6" fontWeight="600" gutterBottom color="primary">
            👤 Informations Étudiant
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Nom complet / الاسم الكامل</Typography>
              <Typography variant="body1" fontWeight="500">{user?.nom_complet || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Date de naissance / تاريخ الازدياد</Typography>
              <Typography variant="body1" fontWeight="500">
                {user?.date_naissance ? new Date(user.date_naissance).toLocaleDateString('fr-FR') : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Code étudiant / رقم الطالب</Typography>
              <Typography variant="body1" fontWeight="500">{user?.cod_etu || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Spécialité / التخصص</Typography>
              <Typography variant="body1" fontWeight="500">{specialization}</Typography>
            </Grid>
          </Grid>
        </Box>
        
        <TableContainer component={Paper} sx={{ mb: 4, border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#3498db' }}>
                <TableCell sx={{ fontWeight: 600, color: 'white' }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white' }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>Note</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>Résultat</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'white', textAlign: 'center' }}>Session</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                const regularModules = [];
                const semesterModules = [];
                
                semesterData.subjects.forEach((subject, index) => {
                  const moduleName = subject.lib_elp_arb && subject.lib_elp_arb.trim() !== '' ? subject.lib_elp_arb : subject.lib_elp;
                  const isSemesterModule = moduleName.toLowerCase().includes('semestre') || moduleName.toLowerCase().includes('سداسي');
                  
                  if (isSemesterModule) {
                    semesterModules.push({ ...subject, originalIndex: index });
                  } else {
                    regularModules.push({ ...subject, originalIndex: index });
                  }
                });
                
                return [...regularModules, ...semesterModules].map((subject) => {
                  const moduleName = subject.lib_elp_arb && subject.lib_elp_arb.trim() !== '' ? subject.lib_elp_arb : subject.lib_elp;
                  const isSemesterModule = moduleName.toLowerCase().includes('semestre') || moduleName.toLowerCase().includes('سداسي');
                  
                  return (
                    <TableRow 
                      key={subject.originalIndex} 
                      sx={{ 
                        '&:nth-of-type(even)': { bgcolor: '#f8f9fa' },
                        ...(isSemesterModule && { bgcolor: '#e3f2fd', borderTop: '2px solid #1976d2' })
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {subject.cod_elp}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: isSemesterModule ? 700 : 500,
                            color: isSemesterModule ? '#1976d2' : 'inherit'
                          }}
                        >
                          {moduleName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip 
                          label={subject.not_elp !== null ? parseFloat(subject.not_elp).toFixed(2) : 'ABS'} 
                          sx={{ bgcolor: getGradeColor(subject.not_elp), color: 'white', fontWeight: 'bold' }} 
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {subject.cod_tre || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip 
                          label={subject.final_session === 1 ? 'Normale' : 'Rattrapage'} 
                          color={subject.final_session === 1 ? 'primary' : 'secondary'}
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ 
          mt: 3, 
          pt: 3, 
          borderTop: '1px solid #e0e0e0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              🔒 Document sécurisé par signature numérique
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Scannez le QR code pour vérifier l'authenticité
            </Typography>
          </Box>
          <Box sx={{ 
            width: 60, 
            height: 60, 
            border: '1px solid #ddd', 
            borderRadius: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '12px', 
            color: '#666',
            bgcolor: '#f9f9f9'
          }}>
            📱 QR Code
          </Box>
        </Box>
      </Paper>
    );
  };

  if (isLoading) return <Loading message="Chargement des documents officiels..." />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <DescriptionIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          📄 Relevés de Notes
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={() => fetchOfficialDocuments(selectedSemester)} 
          sx={{ ml: 'auto' }} 
          variant="outlined"
        >
          Actualiser
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <FormControl fullWidth>
            <InputLabel>Sélectionner le Semestre</InputLabel>
            <Select value={selectedSemester} onChange={handleSemesterChange} label="Sélectionner le Semestre">
              <MenuItem value="">
                <em>Tous les Semestres</em>
              </MenuItem>
              {availableSemesters.map((semester) => (
                <MenuItem key={semester} value={semester.replace('S', '').replace('A', '')}>
                  {getSemesterDisplayName(semester)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
      
      {documentsData && Object.keys(documentsData).length > 0 ? (
        Object.entries(documentsData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([semesterCode, semesterData]) => (
            <Box key={semesterCode} sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2, 
                px: 2 
              }}>
                <Box>
                  <Typography variant="h5" fontWeight="600" color="text.secondary">
                    {getSemesterDisplayName(semesterCode)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Année: {semesterData.academicYear}/{parseInt(semesterData.academicYear) + 1} | 
                    Spécialité: {semesterData.specialization}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    startIcon={<PdfIcon />} 
                    onClick={() => handlePreview(semesterCode, semesterData)} 
                    variant="outlined" 
                    color="info" 
                    size="small"
                  >
                    Aperçu
                  </Button>
                  <Button 
                    startIcon={<PrintIcon />} 
                    onClick={() => handlePrintTranscript(semesterCode, semesterData)} 
                    variant="contained" 
                    disabled={isGenerating} 
                    size="small"
                  >
                    {isGenerating ? <CircularProgress size={20} /> : 'Imprimer'}
                  </Button>
                  <Button 
                    startIcon={<DownloadIcon />} 
                    onClick={() => handleDownloadPDF(semesterCode, semesterData)} 
                    variant="contained" 
                    color="secondary" 
                    disabled={isGenerating} 
                    size="small"
                  >
                    Télécharger PDF
                  </Button>
                </Box>
              </Box>
              <TranscriptPreview semesterCode={semesterCode} semesterData={semesterData} />
            </Box>
          ))
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Aucun document officiel disponible
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Les documents apparaîtront ici une fois que vos notes seront disponibles.
          </Typography>
        </Paper>
      )}

      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Aperçu du Relevé de Notes</Typography>
            {previewSemester && (
              <Box>
                <Button 
                  startIcon={<PrintIcon />} 
                  onClick={() => {
                    handlePrintTranscript(previewSemester.code, previewSemester.data);
                    setPreviewDialog(false);
                  }} 
                  variant="outlined" 
                  sx={{ mr: 1 }} 
                  disabled={isGenerating}
                >
                  Imprimer
                </Button>
                <Button 
                  startIcon={<DownloadIcon />} 
                  onClick={() => {
                    handleDownloadPDF(previewSemester.code, previewSemester.data);
                    setPreviewDialog(false);
                  }} 
                  variant="contained" 
                  disabled={isGenerating}
                >
                  Télécharger PDF
                </Button>
              </Box>
            )}
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
          <Button onClick={() => setPreviewDialog(false)} color="primary">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficialDocuments;