// src/components/DocumentVerification.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
  Button,
  TextField
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  School as SchoolIcon,
  Home as HomeIcon
} from '@mui/icons-material';

const DocumentVerification = () => {
  const { token } = useParams();
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Manual verification states
  const [manualSignature, setManualSignature] = useState('');
  const [isManualVerifying, setIsManualVerifying] = useState(false);
  const [manualVerificationResult, setManualVerificationResult] = useState(null);

  // Backend URL - change this if your backend is on a different port
  const BACKEND_URL = 'http://localhost:3000';

  useEffect(() => {
    // Only verify if we have a token
    if (token && token.trim() !== '') {
      verifyDocument();
    } else {
      setIsLoading(false);
      // Don't set any verification result for missing token
    }
  }, [token]);

  const verifyDocument = async () => {
    if (!token) {
      setError('Token de vérification manquant');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('=== FRONTEND VERIFICATION ===');
      console.log('Token to verify:', token);
      console.log('Backend URL:', BACKEND_URL);
      
      // Test connection first
      try {
        console.log('Testing connection to:', `${BACKEND_URL}/api/test-connection`);
        const testResponse = await fetch(`${BACKEND_URL}/api/test-connection`);
        console.log('Connection test status:', testResponse.status);
        
        if (!testResponse.ok) {
          throw new Error(`Backend responded with status: ${testResponse.status}`);
        }
        
        const testResult = await testResponse.json();
        console.log('Connection test result:', testResult);
      } catch (connError) {
        console.error('Connection error:', connError);
        setError(`Impossible de contacter le serveur sur ${BACKEND_URL}. Assurez-vous que le backend est démarré.`);
        setVerificationResult({
          valid: false,
          error: 'Serveur de vérification non accessible'
        });
        return;
      }
      
      // Try actual verification
      console.log('Attempting verification...');
      const response = await fetch(`${BACKEND_URL}/api/verify-document/${encodeURIComponent(token)}`);
      console.log('Verification response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Verification result:', result);
        setVerificationResult(result);
      } else {
        // Get the error details
        const errorText = await response.text();
        console.error('Verification error response:', errorText);
        
        let errorResult;
        try {
          errorResult = JSON.parse(errorText);
        } catch {
          errorResult = { error: errorText };
        }
        
        setVerificationResult({
          valid: false,
          error: errorResult.error || `Erreur serveur: ${response.status}`
        });
      }
      
    } catch (err) {
      console.error('Network/other error:', err);
      setError(`Erreur de vérification: ${err.message}`);
      setVerificationResult({
        valid: false,
        error: 'Erreur réseau ou serveur inaccessible'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyManualSignature = async () => {
    if (!manualSignature.trim()) {
      setError('Veuillez saisir une signature à vérifier');
      return;
    }

    setIsManualVerifying(true);
    setError(null);
    setManualVerificationResult(null);

    try {
      console.log('Manual verification for signature:', manualSignature);
      
      // Check if the input looks like a full token (starts with base64-like pattern)
      const isFullToken = manualSignature.includes('U2FsdGVkX1') || manualSignature.includes('%') || manualSignature.length > 100;
      
      let response;
      if (isFullToken) {
        // This is a full token, treat it like a regular document verification
        console.log('Treating as full token');
        const encodedToken = encodeURIComponent(manualSignature.trim());
        response = await fetch(`${BACKEND_URL}/api/verify-document/${encodedToken}`);
      } else {
        // This is a raw signature hash, use a different approach
        console.log('Treating as raw signature');
        response = await fetch(`${BACKEND_URL}/api/verify-signature`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ signature: manualSignature.trim() })
        });
      }
      
      if (response.ok) {
        const result = await response.json();
        setManualVerificationResult(result);
      } else {
        const errorText = await response.text();
        let errorResult;
        try {
          errorResult = JSON.parse(errorText);
        } catch {
          errorResult = { error: errorText };
        }
        setManualVerificationResult({
          valid: false,
          error: errorResult.error || 'Signature invalide'
        });
      }
    } catch (err) {
      console.error('Manual verification error:', err);
      setManualVerificationResult({
        valid: false,
        error: 'Erreur lors de la vérification manuelle'
      });
    } finally {
      setIsManualVerifying(false);
    }
  };

  const openFullVerificationPage = () => {
    window.open(`${BACKEND_URL}/verify-document/${encodeURIComponent(token)}`, '_blank');
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom>
            Vérification du document en cours...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تجري عملية التحقق من الوثيقة
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: 4
    }}>
      <Container maxWidth="md">
        {/* Header */}
        <Paper elevation={8} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
            color: 'white',
            p: 4,
            textAlign: 'center'
          }}>
            <SchoolIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              🎓 وضعيتي - WADAITI
            </Typography>
            <Typography variant="h5" gutterBottom>
              Vérification de Document Officiel
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              تحقق من صحة الوثيقة الرسمية
            </Typography>
          </Box>
        </Paper>

        {/* Only show verification result if we have a token */}
        {token && token.trim() !== '' && (
          <Card elevation={8} sx={{ mb: 4, borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                {verificationResult?.valid ? (
                  <VerifiedIcon sx={{ fontSize: 64, color: 'success.main', mr: 2 }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mr: 2 }} />
                )}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    {verificationResult?.valid ? 'Document Authentique' : 'Document Non Valide'}
                  </Typography>
                  <Typography variant="h5" color="text.secondary">
                    {verificationResult?.valid ? 'وثيقة صحيحة ✅' : 'وثيقة غير صحيحة ❌'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {verificationResult?.valid ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      ✅ Ce document est authentique et vérifié
                    </Typography>
                    <Typography variant="body2">
                      هذا المستند أصلي ومتحقق منه من قبل النظام الأكاديمي
                    </Typography>
                  </Alert>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={4}>
                      <Chip 
                        icon={<SecurityIcon />}
                        label="Signature Vérifiée" 
                        color="success" 
                        sx={{ width: '100%', py: 1 }} 
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Chip 
                        label="Base de Données ✓" 
                        color="primary" 
                        sx={{ width: '100%', py: 1 }} 
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Chip 
                        label="QR Code Valide" 
                        color="info" 
                        sx={{ width: '100%', py: 1 }} 
                      />
                    </Grid>
                  </Grid>

                  {verificationResult.student_id && (
                    <Box sx={{ bgcolor: '#f8f9fa', p: 3, borderRadius: 2, mb: 3 }}>
                      <Typography variant="h6" gutterBottom color="primary">
                        📋 Informations du Document
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Code Étudiant:
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {verificationResult.student_id}
                          </Typography>
                        </Grid>
                        {verificationResult.student_name && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Nom de l'étudiant:
                            </Typography>
                            <Typography variant="body1" fontWeight="600">
                              {verificationResult.student_name}
                            </Typography>
                          </Grid>
                        )}
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Semestre:
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {verificationResult.semester}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Vérifié le:
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {new Date(verificationResult.verified_at || verificationResult.timestamp).toLocaleString('fr-FR')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    ❌ Document Non Valide
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {verificationResult?.error || 'Ce document peut être falsifié, corrompu ou généré par un système non autorisé.'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Que faire?</strong>
                  </Typography>
                  <ul>
                    <li>Vérifiez que le QR code n'est pas endommagé</li>
                    <li>Assurez-vous que le serveur backend est démarré</li>
                    <li>Contactez la Faculté des Sciences Juridiques et Politiques</li>
                    <li>Demandez une nouvelle copie du document officiel</li>
                  </ul>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Verification Section */}
        <Card elevation={4} sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🔍 Vérification Manuelle par Signature
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Saisissez la signature numérique complète du document pour vérification manuelle
            </Typography>
            
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Signature Numérique"
                  placeholder="Collez ici la signature complète du document..."
                  value={manualSignature}
                  onChange={(e) => setManualSignature(e.target.value)}
                  variant="outlined"
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={verifyManualSignature}
                  disabled={isManualVerifying || !manualSignature.trim()}
                  sx={{ mb: 2, height: '56px' }}
                >
                  {isManualVerifying ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Vérifier Signature'
                  )}
                </Button>
              </Grid>
            </Grid>

            {/* Manual Verification Result */}
            {manualVerificationResult && (
              <Box sx={{ mt: 3 }}>
                <Alert 
                  severity={manualVerificationResult.valid ? 'success' : 'error'}
                  sx={{ borderRadius: 2 }}
                >
                  <Typography variant="h6" gutterBottom>
                    {manualVerificationResult.valid ? '✅ Signature Valide' : '❌ Signature Invalide'}
                  </Typography>
                  <Typography variant="body2">
                    {manualVerificationResult.valid 
                      ? 'La signature numérique a été vérifiée avec succès'
                      : manualVerificationResult.error || 'La signature numérique ne correspond à aucun document valide'
                    }
                  </Typography>
          // In DocumentVerification.jsx, update to handle different document types
{manualVerificationResult.valid && manualVerificationResult.student_id && (
  <Box sx={{ mt: 2 }}>
    <Typography variant="body2">
      <strong>Code Étudiant:</strong> {manualVerificationResult.student_id}
    </Typography>
    {manualVerificationResult.student_name && (
      <Typography variant="body2">
        <strong>Nom:</strong> {manualVerificationResult.student_name}
      </Typography>
    )}
    {manualVerificationResult.semester && (
      <Typography variant="body2">
        <strong>Document:</strong> {
          manualVerificationResult.semester.startsWith('ADMIN_') 
            ? `Situation Administrative ${manualVerificationResult.semester.replace('ADMIN_', '')}`
            : `Semestre ${manualVerificationResult.semester}`
        }
      </Typography>
    )}
  </Box>
)}
                </Alert>
              </Box>
            )}
            
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                💡 <strong>Types de vérification supportés:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • <strong>Token complet:</strong> Collez le token complet du QR code (commence par U2FsdGVkX1...)<br/>
                • <strong>Signature numérique:</strong> Collez uniquement la signature hash (ex: 436a5a0755ceb...)<br/>
                • Les deux formats sont acceptés pour la vérification
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Security Features Info */}
        <Card elevation={4} sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🔐 Caractéristiques de Sécurité
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Documents Authentiques:
                </Typography>
                <ul style={{ fontSize: '0.9rem', color: '#666' }}>
                  <li>Signature numérique cryptographique</li>
                  <li>QR code de vérification unique</li>
                  <li>Vérification en temps réel</li>
                  <li>Horodatage sécurisé</li>
                </ul>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Protection Anti-Falsification:
                </Typography>
                <ul style={{ fontSize: '0.9rem', color: '#666' }}>
                  <li>Chiffrement AES-256</li>
                  <li>Hash HMAC-SHA256</li>
                  <li>Token unique par document</li>
                  <li>Validation base de données</li>
                </ul>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* University Info Footer */}
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, bgcolor: '#f8f9fa' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Université Hassan 1er - Settat
          </Typography>
          <Typography variant="body1" gutterBottom>
            Faculté des Sciences Juridiques et Politiques
          </Typography>
          <Typography variant="body2" color="text.secondary">
            كلية العلوم القانونية والسياسية - جامعة الحسن الأول - سطات
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Button
            startIcon={<HomeIcon />}
            variant="outlined"
            onClick={() => window.location.href = '/'}
            sx={{ mt: 2 }}
          >
            Retour à l'Accueil
          </Button>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Erreur de connexion:</strong>
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Solutions possibles:</strong>
            </Typography>
            <ul>
              <li>Vérifiez que le serveur backend est démarré sur le port 3000</li>
              <li>Vérifiez votre connexion internet</li>
              <li>Essayez de rafraîchir la page</li>
            </ul>
          </Alert>
        )}
      </Container>
    </Box>
  );
};

export default DocumentVerification;