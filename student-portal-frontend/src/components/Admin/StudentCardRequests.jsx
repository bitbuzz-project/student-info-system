// src/components/Admin/StudentCardRequests.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Divider,
  Snackbar
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const StudentCardRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStudentCardRequests();
      setRequests(response.requests);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch student card requests');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (request) => {
    setSelectedRequest(request);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequest(null);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      setActionLoading(true);
      await adminAPI.updateStudentCardRequestStatus(id, status);
      
      setNotification({
        open: true,
        message: `Request ${status} successfully`,
        severity: 'success'
      });

      // Update local state to reflect change
      setRequests(requests.map(req => 
        req.id === id ? { ...req, status: status } : req
      ));
      
      if (openDialog) handleCloseDialog();

    } catch (err) {
      setNotification({
        open: true,
        message: err.response?.data?.error || `Failed to ${status} request`,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" color="primary" sx={{ mb: 3 }}>
        Student Card Requests
      </Typography>
      
      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 650 }} aria-label="student card requests table">
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Student Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>CIN</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Request Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length > 0 ? (
              requests.map((request, index) => (
                // FIX: Use composite key or fallback to index to avoid "duplicate key" warning
                <TableRow key={`${request.id}-${index}`} hover>
                  <TableCell>{`${request.lib_nom_pat_ind} ${request.lib_pr1_ind}`}</TableCell>
                  <TableCell>{request.cod_etu}</TableCell>
                  <TableCell>{request.cin_ind}</TableCell>
                  <TableCell>
                    <Chip 
                      label={request.status} 
                      color={
                        request.status === 'approved' ? 'success' : 
                        request.status === 'rejected' ? 'error' : 'warning'
                      }
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton 
                          color="info" 
                          size="small" 
                          onClick={() => handleOpenDialog(request)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {request.status === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton 
                              color="success" 
                              size="small"
                              onClick={() => handleUpdateStatus(request.id, 'approved')}
                              disabled={actionLoading}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => handleUpdateStatus(request.id, 'rejected')}
                              disabled={actionLoading}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No student card requests found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedRequest && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Request Details
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} display="flex" justifyContent="center" mb={2}>
                  {selectedRequest.photo_url ? (
                    <Box 
                      component="img"
                      src={selectedRequest.photo_url} // Ensure your backend returns this field
                      alt="Student Photo"
                      sx={{ 
                        width: 150, 
                        height: 150, 
                        objectFit: 'cover', 
                        borderRadius: 2,
                        boxShadow: 2 
                      }}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/150?text=No+Photo';
                      }}
                    />
                  ) : (
                    <Box 
                      sx={{ 
                        width: 150, 
                        height: 150, 
                        bgcolor: '#e0e0e0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="caption">No Photo Available</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Full Name</Typography>
                  <Typography variant="body1" fontWeight="500">
                    {`${selectedRequest.lib_nom_pat_ind} ${selectedRequest.lib_pr1_ind}`}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Student Code</Typography>
                  <Typography variant="body1" fontWeight="500">{selectedRequest.cod_etu}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">CIN</Typography>
                  <Typography variant="body1" fontWeight="500">{selectedRequest.cin_ind}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date Requested</Typography>
                  <Typography variant="body1" fontWeight="500">
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog} color="inherit">Close</Button>
              {selectedRequest.status === 'pending' && (
                <>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                  <Button 
                    variant="contained" 
                    color="success"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentCardRequests;