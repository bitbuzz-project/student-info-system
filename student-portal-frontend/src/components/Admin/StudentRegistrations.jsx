// Updated StudentRegistrations.jsx
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
  TextField,
  LinearProgress
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  DateRange as DateRangeIcon,
  FilterList as FilterIcon
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
  const [filtersApplied, setFiltersApplied] = useState(false);

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
      
      // Check if filters are applied
      setFiltersApplied(Object.keys(filters).length > 0);
      
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

  // Calculate gender percentage
  const getGenderPercentage = (count, total) => {
    if (total === 0) return 0;
    return ((count / total) * 100).toFixed(1);
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
            {filtersApplied && (
              <Chip 
                label="Filters Applied" 
                size="small" 
                color="primary" 
                icon={<FilterIcon />} 
                sx={{ ml: 2 }} 
              />
            )}
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

      {/* Loading indicator */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters Card */}
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

          {/* Filter Summary */}
          {registrationStats?.filter_applied && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Current Filters:</strong>
                {registrationStats.filter_applied.year && ` Year: ${registrationStats.filter_applied.year}`}
                {registrationStats.filter_applied.user && ` | User: ${registrationStats.filter_applied.user}`}
                {registrationStats.filter_applied.date_from && ` | From: ${formatDate(registrationStats.filter_applied.date_from)}`}
                {registrationStats.filter_applied.date_to && ` | To: ${formatDate(registrationStats.filter_applied.date_to)}`}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

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
                {registrationStats.date_range && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {formatDate(registrationStats.date_range.earliest_date)} - {formatDate(registrationStats.date_range.latest_date)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <MaleIcon sx={{ fontSize: 40, color: 'info.main' }} />
                  <FemaleIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                </Box>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  👨 {registrationStats.summary.male_count} | 👩 {registrationStats.summary.female_count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gender Distribution
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {getGenderPercentage(registrationStats.summary.male_count, registrationStats.summary.total_new_registrations)}% Male | 
                  {getGenderPercentage(registrationStats.summary.female_count, registrationStats.summary.total_new_registrations)}% Female
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {registrationStats.summary.unique_programs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Different Programs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DateRangeIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {registrationStats.date_range?.unique_days || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registration Days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Program Statistics */}
      {registrationStats?.program_breakdown && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              📊 Programs Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Program</strong></TableCell>
                    <TableCell align="center"><strong>Total</strong></TableCell>
                    <TableCell align="center"><strong>Male</strong></TableCell>
                    <TableCell align="center"><strong>Female</strong></TableCell>
                    <TableCell><strong>Academic Year</strong></TableCell>
                    <TableCell><strong>Latest Registration</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrationStats.program_breakdown.map((program, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500" sx={{ maxWidth: 250 }}>
                          {program.program_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={program.total_count}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="info.main">
                          👨 {program.male_count}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="secondary.main">
                          👩 {program.female_count}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${program.cod_anu} - ${parseInt(program.cod_anu) + 1}`}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(program.latest_registration)}
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

      {/* Daily Registration Trends */}
      {registrationStats?.daily_trends && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              📈 Daily Registration Trends (Filtered Results)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell align="center"><strong>Total</strong></TableCell>
                    <TableCell align="center"><strong>Male</strong></TableCell>
                    <TableCell align="center"><strong>Female</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
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
                      <TableCell align="center">
                        <Chip
                          label={trend.daily_count}
                          color={getTrendColor(trend.daily_count)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="info.main">
                          👨 {trend.daily_male}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="secondary.main">
                          👩 {trend.daily_female}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${trend.cod_anu} - ${parseInt(trend.cod_anu) + 1}`}
                          color="primary"
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
                          {trend.programs_count} programs
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

      {/* User Statistics - New Section */}
      {registrationStats?.user_statistics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              👤 Registration Statistics by User (Filtered Results)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Created By</strong></TableCell>
                    <TableCell align="center"><strong>Total Registrations</strong></TableCell>
                    <TableCell align="center"><strong>Male</strong></TableCell>
                    <TableCell align="center"><strong>Female</strong></TableCell>
                    <TableCell align="center"><strong>Programs Handled</strong></TableCell>
                    <TableCell><strong>First Registration</strong></TableCell>
                    <TableCell><strong>Latest Registration</strong></TableCell>
                    <TableCell align="center"><strong>Active Days</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrationStats.user_statistics.map((userStat, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {userStat.created_by}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={userStat.total_registrations}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="info.main">
                          👨 {userStat.male_count}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="secondary.main">
                          👩 {userStat.female_count}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={userStat.programs_handled}
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(userStat.first_registration)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {formatDate(userStat.latest_registration)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">
                          {userStat.active_days}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* User Statistics Summary */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Most Active User:</strong><br />
                    {registrationStats.user_statistics.length > 0 
                      ? `${registrationStats.user_statistics[0].created_by} (${registrationStats.user_statistics[0].total_registrations} registrations)`
                      : 'N/A'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Total Active Users:</strong><br />
                    {registrationStats.user_statistics.length} users
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Average per User:</strong><br />
                    {registrationStats.user_statistics.length > 0 
                      ? Math.round(registrationStats.summary.total_new_registrations / registrationStats.user_statistics.length)
                      : 0
                    } registrations
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>System Registrations:</strong><br />
                    {registrationStats.user_statistics.find(u => u.created_by === 'System')?.total_registrations || 0}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
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
                {filtersApplied && <Chip label="Filtered" size="small" color="primary" sx={{ ml: 1 }} />}
              </Typography>
              <Button
                startIcon={<DownloadIcon />}
                variant="outlined"
                size="small"
                onClick={() => {
                  const filters = {};
                  if (selectedYear) filters.year = selectedYear;
                  if (selectedUser) filters.user = selectedUser;
                  if (dateFrom) filters.dateFrom = dateFrom;
                  if (dateTo) filters.dateTo = dateTo;
                  adminAPI.exportRegistrations(filters);
                }}
                sx={{ mr: 1 }}
              >
                Export CSV
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                variant="contained"
                size="small"
                color="primary"
                onClick={() => {
                  const filters = {};
                  if (selectedYear) filters.year = selectedYear;
                  if (selectedUser) filters.user = selectedUser;
                  if (dateFrom) filters.dateFrom = dateFrom;
                  if (dateTo) filters.dateTo = dateTo;
                  adminAPI.exportRegistrationsPDF(filters);
                }}
              >
                📋 Rapport PDF
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
                      <TableCell><strong>Gender</strong></TableCell>
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
                          {student.cod_sex_etu && (
                            <Chip
                              label={student.cod_sex_etu === 'M' ? '👨 Male' : '👩 Female'}
                              color={student.cod_sex_etu === 'M' ? 'info' : 'secondary'}
                              size="small"
                            />
                          )}
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
                  No registrations found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your filter criteria
                </Typography>
              </Box>
            )}

            {/* Results Summary */}
            {registrationsData?.recent_registrations && registrationsData.recent_registrations.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {registrationsData.recent_registrations.length} of {registrationStats?.summary?.total_new_registrations || 0} total registrations
                  {filtersApplied && ' (filtered results)'}
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