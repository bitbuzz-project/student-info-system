// src/components/Admin/StudentRegistrations.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Divider,
  TextField
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const StudentRegistrations = () => {
  const [registrationsData, setRegistrationsData] = useState(null);
  const [registrationStats, setRegistrationStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [availableYears, setAvailableYears] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Load registrations data
  const loadRegistrationsData = async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [registrationsResponse, statsResponse] = await Promise.all([
        adminAPI.getStudentRegistrations(filters),
        adminAPI.getRegistrationStats(filters)
      ]);
      
      setRegistrationsData(registrationsResponse);
      setRegistrationStats(statsResponse);
      
      // Extract available filter options
      if (registrationsResponse.available_years) {
        setAvailableYears(registrationsResponse.available_years);
      }
      if (registrationsResponse.available_users) {
        setAvailableUsers(registrationsResponse.available_users);
      }
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load registration data');
      console.error('Error loading registrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrationsData();
  }, []);

  // Handle filter changes
  const applyFilters = () => {
    const filters = {};
    if (selectedYear) filters.year = selectedYear;
    if (selectedUser) filters.user = selectedUser;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    
    loadRegistrationsData(filters);
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedYear('');
    setSelectedUser('');
    setDateFrom('');
    setDateTo('');
    loadRegistrationsData();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Get registration trend color
  const getTrendColor = (count) => {
    if (count >= 10) return 'success';
    if (count >= 5) return 'warning';
    return 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
            👥 Student Registrations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage newly registered students
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => loadRegistrationsData()}
          disabled={isLoading}
          variant="outlined"
        >
          Refresh Data
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Statistics */}
      {registrationStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonAddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {registrationStats.summary.total_new_registrations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total New Registrations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CalendarIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {registrationStats.summary.registrations_today}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registered Today
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {registrationStats.summary.registrations_this_week}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This Week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {registrationStats.summary.unique_programs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Different Programs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            🔍 Filter Registrations
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3} alignItems="end">
            {/* Year Filter */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Academic Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Academic Year"
                >
                  <MenuItem value="">All Years</MenuItem>
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year} - {parseInt(year) + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* User Filter */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Created By</InputLabel>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="Created By"
                >
                  <MenuItem value="">All Users</MenuItem>
                  {availableUsers.map((user) => (
                    <MenuItem key={user} value={user}>
                      {user}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date From */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="date"
                label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Date To */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="date"
                label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={applyFilters}
                disabled={isLoading}
                sx={{ mb: 1 }}
              >
                Apply Filters
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={clearFilters}
                disabled={isLoading}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Registration Trends */}
      {registrationStats?.daily_trends && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              📈 Daily Registration Trends
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
                    <TableCell align="center"><strong>Registrations</strong></TableCell>
                    <TableCell><strong>Created By</strong></TableCell>
                    <TableCell><strong>Programs</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrationStats.daily_trends.map((trend, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {formatDate(trend.registration_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${trend.cod_anu} - ${parseInt(trend.cod_anu) + 1}`}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={trend.daily_count}
                          color={getTrendColor(trend.daily_count)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {trend.cod_uti || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {trend.programs_count} different programs
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Registrations */}
      {registrationsData?.recent_registrations && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="600">
                📋 Recent New Registrations
              </Typography>
              <Button
                startIcon={<DownloadIcon />}
                variant="outlined"
                size="small"
                onClick={() => adminAPI.exportRegistrations()}
              >
                Export Data
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell><strong>Student Code</strong></TableCell>
                      <TableCell><strong>Full Name</strong></TableCell>
                      <TableCell><strong>Program</strong></TableCell>
                      <TableCell><strong>Academic Year</strong></TableCell>
                      <TableCell><strong>Registration Date</strong></TableCell>
                      <TableCell><strong>Created By</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrationsData.recent_registrations.map((student, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600" color="primary">
                            {student.cod_etu}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="500">
                              {student.lib_nom_pat_ind} {student.lib_pr1_ind}
                            </Typography>
                            {student.lib_nom_ind_arb && student.lib_prn_ind_arb && (
                              <Typography variant="caption" color="text.secondary" sx={{ direction: 'rtl' }}>
                                {student.lib_nom_ind_arb} {student.lib_prn_ind_arb}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                            {student.lib_etp}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${student.cod_anu} - ${parseInt(student.cod_anu) + 1}`}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(student.dat_cre_iae)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {student.cod_uti || 'System'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="New Registration"
                            color="success"
                            size="small"
                            icon={<PersonAddIcon />}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {registrationsData?.recent_registrations?.length === 0 && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <PersonAddIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No new registrations found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your filter criteria
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default StudentRegistrations;