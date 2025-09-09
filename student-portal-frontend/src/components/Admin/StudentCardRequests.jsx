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
} from '@mui/material';
import { adminAPI } from '../../services/api';

const StudentCardRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

    fetchRequests();
  }, []);

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
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Student Name</TableCell>
              <TableCell>Student Code</TableCell>
              <TableCell>CIN</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Request Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{`${request.lib_nom_pat_ind} ${request.lib_pr1_ind}`}</TableCell>
                <TableCell>{request.cod_etu}</TableCell>
                <TableCell>{request.cin_ind}</TableCell>
                <TableCell>
                  <Chip label={request.status} color={request.status === 'pending' ? 'warning' : 'success'} />
                </TableCell>
                <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Add this function to the adminAPI object in src/services/api.js
adminAPI.getStudentCardRequests = async () => {
    // The endpoint is now '/admin/student-card-requests'
    const response = await api.get('/admin/student-card-requests');
    return response.data;
};

export default StudentCardRequests;