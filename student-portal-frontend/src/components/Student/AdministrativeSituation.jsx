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
  AccordionDetails,
  CircularProgress
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
  Person as PersonIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import { DocumentSecurity } from '../../services/documentSecurity';
import Loading from '../common/Loading';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const BACKEND_URL = 'http://localhost:3000';

const AdministrativeSituation = () => {
  const [situationData, setSituationData] = useState(null);
  const [statsData, setStatsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();


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
        return 'نشط';
      case 'D':
        return 'غير نشط';
      default:
        return status || 'غير محدد';
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


  // Add this function to AdministrativeSituation component
const generateAdministrativeSituationPDF = async (year, registrations) => {
  try {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load Arabic font
    try {
      const fontResponse = await fetch('/fonts/Amiri-Regular.ttf');
      if (fontResponse.ok) {
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
      }
    } catch (fontError) {
      console.error("Font loading failed:", fontError);
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
    doc.text('SITUATION ADMINISTRATIVE', pageWidth / 2, 15, { align: 'center' });
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(11);
    doc.text('الوضعية الإدارية', pageWidth / 2, 22, { align: 'center' });
    doc.text('UNIVERSITÉ HASSAN 1ER - SETTAT', pageWidth / 2, 30, { align: 'center' });

    // Title
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.text(`Année Universitaire ${year} - ${parseInt(year) + 1}`, pageWidth / 2, 50, { align: 'center' });

    // Student info table
    doc.autoTable({
      body: [
        [`Nom complet:`, `${user?.nom_complet || 'N/A'}`],
        [`Code étudiant:`, `${user?.cod_etu || 'N/A'}`],
        [`CIN:`, `${user?.cin || 'N/A'}`],
        [`Année:`, `${year}`],
      ],
      startY: 60,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1.5, font: 'Amiri' },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Registrations table
    const tableData = registrations.map(reg => [
      (reg.lib_etp || reg.lic_etp || 'N/A').substring(0, 50),
      reg.cod_etp,
      reg.eta_iae === 'E' ? 'Active' : 'Inactive',
      reg.tem_iae_prm === 'O' ? 'Oui' : 'Non',
      reg.dat_cre_iae ? new Date(reg.dat_cre_iae).toLocaleDateString('fr-FR') : 'N/A'
    ]);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Spécialité', 'Code', 'État', 'Principal', 'Date Création']],
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
      }
    });

    // *** THIS IS THE KEY PART - EXACTLY LIKE OfficialDocuments ***
    const documentData = {
      studentId: user?.cod_etu,
      documentType: 'administrative_situation',
      year: year,
      timestamp: new Date().toISOString(),
      registrations: registrations.map(r => ({
        cod_etp: r.cod_etp,
        lib_etp: r.lib_etp,
        eta_iae: r.eta_iae
      }))
    };

    const verificationUrl = DocumentSecurity.generateVerificationUrl(documentData);
    const signature = DocumentSecurity.generateSignature(documentData);
    const qrCodeDataUrl = await DocumentSecurity.generateQRCode(verificationUrl);

    // Store signature in backend - EXACTLY LIKE OfficialDocuments
    try {
      await fetch(`${BACKEND_URL}/api/store-document-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          signature: signature,
          studentId: user?.cod_etu,
          semester: `ADMIN_${year}`, // Different identifier for admin docs
          documentData: documentData
        })
      });
      console.log('Administrative situation signature stored successfully');
    } catch (err) {
      console.warn('Failed to store signature:', err);
    }

    // Add QR code
    if (qrCodeDataUrl) {
      try {
        const qrCodeImage = qrCodeDataUrl.split(',')[1];
        doc.addImage(qrCodeImage, 'PNG', pageWidth - 40, pageHeight - 50, 30, 30);
      } catch (qrError) {
        console.error('Failed to add QR code:', qrError);
      }
    }

    // Add verification info
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);

    const documentId = `ADMIN-${user?.cod_etu}-${year}-${Date.now()}`;
    doc.text(`ID Document: ${documentId}`, 15, pageHeight - 35);
    doc.text(`Signature numérique: ${signature}`, 15, pageHeight - 30);
    doc.text(`Vérification: Scannez le QR code`, 15, pageHeight - 25);

    // Footer
    doc.setTextColor(150);
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')} | Certifié par le système académique`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return doc;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

// Add download and print handlers
const handleDownloadPDF = async (year, registrations) => {
  try {
    const doc = await generateAdministrativeSituationPDF(year, registrations);
    if (doc) {
      doc.save(`Situation_Administrative_${year}_${user?.cod_etu}.pdf`);
    }
  } catch (err) {
    console.error("Error generating PDF:", err);
    setError('Erreur lors de la génération du PDF');
  }
};

const handlePrintPDF = async (year, registrations) => {
  try {
    const doc = await generateAdministrativeSituationPDF(year, registrations);
    if (doc) {
      doc.output('dataurlnewwindow');
    }
  } catch (err) {
    console.error("Error printing PDF:", err);
    setError('Erreur lors de l\'impression du PDF');
  }
};
const generateEnrollmentCertificate = async (year, registrations) => {
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load Arabic font
    try {
      const fontResponse = await fetch('/fonts/Amiri-Regular.ttf');
      if (fontResponse.ok) {
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
        doc.setFont('Amiri', 'normal');
      }
    } catch (fontError) {
      console.warn("Font loading failed, using default font:", fontError);
    }

    doc.setTextColor(0, 0, 0);

    // ===== HEADER =====
    doc.setFontSize(10);
    // Left side (French)
    doc.text('ROYAUME DU MAROC', 15, 15);
    doc.text('Université Hassan 1er', 15, 21);
    doc.text('FACULTÉ DES SCIENCES', 15, 27);
    doc.text('JURIDIQUES ET POLITIQUES -', 15, 33);
    doc.text('SETTAT', 15, 39);
    doc.setFontSize(8);
    doc.text('Service des Affaires Estudiantines', 15, 45);

    // Right side (Arabic)
    doc.setFontSize(10);
    doc.text('المملكة المغربية', pageWidth - 15, 15, { align: 'right' });
    doc.text('جامعة الحسن الأول', pageWidth - 15, 21, { align: 'right' });
    doc.text('كلية العلوم القانونية والسياسية', pageWidth - 15, 27, { align: 'right' });
    doc.text('سطات', pageWidth - 15, 33, { align: 'right' });
    doc.setFontSize(8);
    doc.text('مصلحة الشؤون الطلابية', pageWidth - 15, 39, { align: 'right' });

    // ===== TITLE =====
    doc.setFontSize(16);
    doc.setFont('Amiri', 'bold');
    doc.text('ATTESTATION D\'INSCRIPTION', pageWidth / 2, 65, { align: 'center' });

    // ===== MAIN CONTENT =====
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);

    doc.text('La Doyenne de la Faculté des Sciences Juridiques et Politiques - Settat atteste que', 20, 82);
    doc.text('l\'étudiant(e) :', 20, 90);

    // Student name
    doc.setFont('Amiri', 'bold');
        console.log('Gender code:', user?.cod_sex_etu, 'Type:', typeof user?.cod_sex_etu);

    const studentTitle = user?.cod_sex_etu === 'f' ? 'Mademoiselle' : 'Monsieur';
    doc.text(`${studentTitle} ${user?.nom_complet || 'N/A'}`, 20, 100);

    // Student details
    doc.setFont('Amiri', 'normal');
    doc.text(`Numéro de la carte d'identité nationale : ${user?.cin || 'N/A'}`, 20, 110);
    doc.text(`Code national de l'étudiant(e) : ${user?.cod_nne_ind || user?.cod_etu || 'N/A'}`, 20, 118);
    
    // Birth info
    let birthText = 'né(e) le ';
    if (user?.date_naissance) {
      const birthDate = new Date(user.date_naissance);
      birthText += birthDate.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } else {
      birthText += '[Date non disponible]';
    }
    
    if (user?.lieu_naissance || user?.lieu_naissance_arabe) {
      birthText += ` à ${user.lieu_naissance || user.lieu_naissance_arabe} ( MAROC )`;
    } else {
      birthText += ' ( MAROC )';
    }
    
    doc.text(birthText, 20, 126);

    // Enrollment statement
    const formattedAcademicYear = `${year}/${parseInt(year) + 1}`;
    doc.text('est régulièrement inscrit(e) à la FACULTÉ DES SCIENCES JURIDIQUES ET POLITIQUES -', 20, 138);
    doc.text(`SETTAT pour l'année universitaire ${formattedAcademicYear}.`, 20, 146);

    // Program information
    let programY = 158;
    if (registrations && registrations.length > 0) {
      const mainRegistration = registrations[0];
      
      if (mainRegistration.lib_dip) {
        doc.text(`Diplôme : ${mainRegistration.lib_dip}`, 20, programY);
        programY += 8;
      } else if (mainRegistration.lib_etp) {
        doc.text(`Diplôme : ${mainRegistration.lib_etp}`, 20, programY);
        programY += 8;
      }
      
      if (mainRegistration.lib_etp || mainRegistration.lic_etp) {
        doc.text(`Année : ${mainRegistration.lib_etp || mainRegistration.lic_etp}`, 20, programY);
      }
    }

    // ===== GENERATE SECURITY FEATURES - MATCH OfficialDocuments EXACTLY =====
    const documentData = {
      studentId: user?.cod_etu,
      semester: `YEAR_${year}`,  // ← Changed to match the format used in storage
      timestamp: new Date().toISOString(),
      registrations: registrations.map(r => ({
        cod_etp: r.cod_etp,
        lib_etp: r.lib_etp
      }))
    };

    const verificationUrl = DocumentSecurity.generateVerificationUrl(documentData);
    const signature = DocumentSecurity.generateSignature(documentData);
    const qrCodeDataUrl = await DocumentSecurity.generateQRCode(verificationUrl);

    // ===== FOOTER SECTION =====
    const footerStartY = 180;

    // Date and Dean info (RIGHT)
    const currentDate = new Date();
    const dateText = `Fait à SETTAT, le ${currentDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}`;
    doc.setFontSize(10);
    doc.text(dateText, pageWidth - 20, footerStartY, { align: 'right' });

    doc.setFont('Amiri', 'bold');
    doc.text('La Doyenne de la FSJP - Settat', pageWidth - 20, footerStartY + 8, { align: 'right' });
    doc.setFont('Amiri', 'normal');

    doc.setFontSize(9);
    doc.text(user?.cod_etu || '', pageWidth - 20, footerStartY + 16, { align: 'right' });

    // ===== QR CODE (LEFT) =====
    const qrX = 15;
    const qrY = footerStartY - 5;
    const qrSize = 35;

    try {
      if (qrCodeDataUrl) {
        doc.setDrawColor(52, 152, 219);
        doc.setLineWidth(0.5);
        doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2);
        
        const qrCodeImage = qrCodeDataUrl.split(',')[1];
        doc.addImage(qrCodeImage, 'PNG', qrX, qrY, qrSize, qrSize);
        
        doc.setFontSize(7);
        doc.text('Code QR de Vérification', qrX + (qrSize / 2), qrY + qrSize + 4, { align: 'center' });
        doc.text('Scanner pour vérifier', qrX + (qrSize / 2), qrY + qrSize + 8, { align: 'center' });
      }
    } catch (qrError) {
      console.warn('QR code generation failed:', qrError);
    }

    // ===== DIGITAL SIGNATURE BOX (CENTER) =====
    const sigX = 60;
    const sigY = footerStartY + 10;
    const sigWidth = 90;
    const sigHeight = 18;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(sigX, sigY, sigWidth, sigHeight);

    doc.setFontSize(7);
    doc.setFont('Amiri', 'bold');

    doc.text('Signature Numérique', sigX + (sigWidth / 2), sigY + 8, { align: 'center' });

    if (signature && signature.length > 0) {
      doc.setFont('Courier', 'normal');
      doc.setFontSize(6);
      doc.text(signature, sigX + (sigWidth / 2), sigY + 13, { align: 'center' });
    }



    // ===== UNIVERSITY FOOTER =====
    const bottomY = pageHeight - 20;
    
    doc.setFontSize(8);
    doc.setFont('Amiri', 'normal');
    
    doc.text('Adresse : COMPLEXE UNIVERSITAIRE - SETTAT', 15, bottomY);
    doc.text('Tél. : 0523721939  |  FAX : 0523724087', 15, bottomY + 5);

    doc.text('العنوان : المركب الجامعي - سطات', pageWidth - 15, bottomY, { align: 'right' });
    doc.text('الهاتف : 0523721939  |  الفاكس : 0523724087', pageWidth - 15, bottomY + 5, { align: 'right' });

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('16005333', pageWidth - 15, bottomY + 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // ===== STORE SIGNATURE IN DATABASE - MATCH OfficialDocuments EXACTLY =====
    try {
      await fetch(`${BACKEND_URL}/api/store-document-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          signature: signature,
          studentId: user?.cod_etu,
          semester: `YEAR_${year}`,  // ← Same format as documentData
          documentData: documentData  // ← Exact same structure
        })
      });
      console.log('Enrollment certificate signature stored successfully');
    } catch (err) {
      console.warn('Failed to store signature:', err);
    }

    return doc;
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw error;
  }
};

  const handleDownloadCertificate = async (year, registrations) => {
    setIsGenerating(true);
    setError(null);
    try {
      const doc = await generateEnrollmentCertificate(year, registrations);
      if (doc) {
        doc.save(`Certificat_Scolarite_${year}_${user?.cod_etu}.pdf`);
      }
    } catch (err) {
      console.error("Error generating enrollment certificate:", err);
      setError('Une erreur s\'est produite lors de la génération du certificat.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <Loading message="جاري تحميل الوضعية الإدارية..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AdminIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          📋 الوضعية الإدارية 
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
            <InputLabel>السنة الجامعية</InputLabel>
            <Select
              value={selectedYear}
              onChange={handleYearChange}
              label="السنة الجامعية"
            >
              <MenuItem value="">جميع السنوات</MenuItem>
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
          💡 <strong>الوضعية الإدارية:</strong> هذه الصفحة خاصة بعرض وضعيتك الإدارية في الكلية، وذلك حسب المواسم الجامعية
        </Typography>

      </Alert>

      {/* Statistics Summary */}
      {statsData.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarIcon sx={{ mr: 1 }} />
              التسجيلات الإدارية
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      📅 السنة الجامعية {year} - {parseInt(year) + 1}
                      <Chip 
                        label={`${registrations.length} تسجيل`} 
                        size="small" 
                        sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                      />
                    </Typography>
                  </Box>
                  <Button
                    startIcon={isGenerating ? <CircularProgress size={16} /> : <PdfIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadCertificate(year, registrations);
                    }}
                    variant="contained"
                    color="secondary"
                    size="small"
                    disabled={isGenerating}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.9)', 
                      color: '#2c3e50',
                      '&:hover': { bgcolor: 'white' }
                    }}
                  >
                    شهادة مدرسية
                  </Button>
                </Box>
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
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>آخر تعديل</TableCell>
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
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Typography variant="body2">
                              {registration.dat_mod_iae && registration.dat_mod_iae !== registration.dat_cre_iae 
                                ? formatDate(registration.dat_mod_iae) 
                                : '-'
                              }
                            </Typography>
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
          📜 الوضعية الإدارية تظهر جميع تسجيلاتك الجامعية مع إمكانية تحميل شهادة التسجيل الجامعية لكل سنة.<br/>
        </Typography>
      </Paper>
    </Box>
  );
};

export default AdministrativeSituation;