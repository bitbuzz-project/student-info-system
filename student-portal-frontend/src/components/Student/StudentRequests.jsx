import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  Chip
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Send as SendIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';

const RequestStudentCard = () => {
  const { t } = useTranslation();
  const [proofOfLoss, setProofOfLoss] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleFileChange = (event) => {
    setProofOfLoss(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!proofOfLoss) {
      setSubmitError('الرجاء إرفاق إثبات الضياع.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const formData = new FormData();
    formData.append('proofOfLoss', proofOfLoss);

    try {
      await studentAPI.requestStudentCard(formData);
      setSubmitSuccess(true);
      setProofOfLoss(null);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'حدث خطأ أثناء إرسال الطلب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          طلب بطاقة الطالب
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          في حالة ضياع بطاقتك، يرجى إرفاق نسخة من إثبات الضياع (صورة أو PDF).
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                تحميل إثبات الضياع
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                />
              </Button>
              {proofOfLoss && (
                <Box sx={{ mt: 2 }}>
                  <Chip label={proofOfLoss.name} onDelete={() => setProofOfLoss(null)} />
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || !proofOfLoss}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
                fullWidth
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </Button>
            </Grid>
          </Grid>
        </form>

        {submitSuccess && (
          <Alert severity="success" sx={{ mt: 3 }}>
            تم إرسال طلبك بنجاح. سيتم إعلامك عند معالجته.
          </Alert>
        )}
        {submitError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {submitError}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const StudentRequests = () => {
  const { t } = useTranslation();
  const [requestType, setRequestType] = useState('student_card');

  const renderRequestForm = () => {
    switch (requestType) {
      case 'student_card':
        return <RequestStudentCard />;
      case 'diploma':
        return (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">طلب شهادة التخرج</Typography>
            <Typography>هذه الخدمة ستكون متاحة قريبا.</Typography>
          </Paper>
        );
      case 'official_documents':
        return (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">طلب وثائق إدارية</Typography>
            <Typography>هذه الخدمة ستكون متاحة قريبا.</Typography>
          </Paper>
        );
      case 'reclamations':
        return (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">تقديم شكاية</Typography>
            <Typography>هذه الخدمة ستكون متاحة قريبا.</Typography>
          </Paper>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" color="primary" sx={{ mb: 3 }}>
        📄 الطلبات والشكايات
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="request-type-label">نوع الطلب</InputLabel>
            <Select
              labelId="request-type-label"
              id="request-type-select"
              value={requestType}
              label="نوع الطلب"
              onChange={(e) => setRequestType(e.target.value)}
            >
              <MenuItem value="student_card">طلب بطاقة الطالب</MenuItem>
              <MenuItem value="diploma">طلب شهادة التخرج</MenuItem>
              <MenuItem value="official_documents">طلب وثائق إدارية</MenuItem>
              <MenuItem value="reclamations">شكاية</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={8}>
          {renderRequestForm()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentRequests;