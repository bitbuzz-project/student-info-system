import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 20
  });
  
  // Search and filter state
  const [filters, setFilters] = useState({
    search: '',
    program: '',
    year: '',
    page: 1,
    limit: 20
  });

  const [programs, setPrograms] = useState([]);
  const [years, setYears] = useState([]);

  // Load students data
  const loadStudents = async (newFilters = filters) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await adminAPI.searchStudents(newFilters);
      setStudents(response.students);
      setPagination(response.pagination);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load students');
      console.error('Error loading students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data and options
  useEffect(() => {
    loadStudents();
    loadFilterOptions();
  }, []);

  // Load filter options (programs and years)
  const loadFilterOptions = async () => {
    try {
      const overviewData = await adminAPI.getDataOverview();
      
      // Extract unique programs and years
      const uniquePrograms = [...new Set(overviewData.students_by_program?.map(p => p.lib_etp) || [])];
      const uniqueYears = overviewData.students_by_year?.map(y => y.cod_anu) || [];
      
      setPrograms(uniquePrograms);
      setYears(uniqueYears);
      
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  // Handle search
  const handleSearch = () => {
    const newFilters = { ...filters, page: 1 };
    setFilters(newFilters);
    loadStudents(newFilters);
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    setFilters(newFilters);
    if (field !== 'search') {
      loadStudents(newFilters);
    }
  };

  // Clear filters
  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      program: '',
      year: '',
      page: 1,
      limit: 20
    };
    setFilters(clearedFilters);
    loadStudents(clearedFilters);
  };

  // Handle pagination
  const handlePageChange = (event, page) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    loadStudents(newFilters);
  };

  // View student details
  const viewStudentDetails = async (studentId) => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getStudent(studentId);
      setSelectedStudent(response);
      setDialogOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load student details');
      console.error('Error loading student details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Get sync status color
  const getSyncStatusColor = (syncStatus) => {
    switch (syncStatus) {
      case 'recent': return 'success';
      case 'week': return 'warning';
      default: return 'default';
    }
  };

  // Student Details Dialog Component
  const StudentDetailsDialog = () => {
    if (!selectedStudent) return null;

    const { student, grades, statistics } = selectedStudent;

    return (
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PeopleIcon color="primary" />
            <Typography variant="h6">
              Student Details: {student.cod_etu}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    👤 Personal Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ '& > div': { mb: 2 } }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Full Name</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {student.lib_nom_pat_ind} {student.lib_pr1_ind}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Arabic Name</Typography>
                      <Typography variant="body1" fontWeight="500" sx={{ direction: 'rtl' }}>
                        {student.lib_nom_ind_arb} {student.lib_prn_ind_arb}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">CIN</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {student.cin_ind}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Birth Date</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {formatDate(student.date_nai_ind)}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Birth Place</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {student.lib_vil_nai_etu}
                        {student.lib_vil_nai_etu_arb && ` - ${student.lib_vil_nai_etu_arb}`}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Academic Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    🎓 Academic Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ '& > div': { mb: 2 } }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Program</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {student.lib_etp}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Academic Year</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {student.cod_anu}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Diploma</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {student.cod_dip}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Last Sync</Typography>
                      <Typography variant="body1" fontWeight="500">
                        {formatDate(student.last_sync)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Grade Statistics */}
            {statistics && statistics.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📊 Grade Statistics
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Year</strong></TableCell>
                            <TableCell><strong>Session</strong></TableCell>
                            <TableCell align="center"><strong>Total</strong></TableCell>
                            <TableCell align="center"><strong>Passed</strong></TableCell>
                            <TableCell align="center"><strong>Failed</strong></TableCell>
                            <TableCell align="center"><strong>Average</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {statistics.map((stat, index) => (
                            <TableRow key={index}>
                              <TableCell>{stat.cod_anu}</TableCell>
                              <TableCell>{stat.cod_ses}</TableCell>
                              <TableCell align="center">
                                <Chip label={stat.total_subjects} color="primary" size="small" />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={stat.passed_subjects} color="success" size="small" />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={stat.failed_subjects} color="error" size="small" />
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={stat.average_grade || 'N/A'} 
                                  color={parseFloat(stat.average_grade) >= 10 ? 'success' : 'error'}
                                  size="small" 
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Recent Grades */}
            {grades && grades.length > 0 && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      📋 Recent Grades ({grades.length} total)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Year</strong></TableCell>
                            <TableCell><strong>Session</strong></TableCell>
                            <TableCell><strong>Subject</strong></TableCell>
                            <TableCell align="center"><strong>Grade</strong></TableCell>
                            <TableCell><strong>Result</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {grades.slice(0, 20).map((grade, index) => (
                            <TableRow key={index}>
                              <TableCell>{grade.cod_anu}</TableCell>
                              <TableCell>{grade.cod_ses}</TableCell>
                              <TableCell>{grade.lib_elp}</TableCell>
                              <TableCell align="center">
                                {grade.not_elp !== null ? (
                                  <Chip 
                                    label={parseFloat(grade.not_elp).toFixed(2)}
                                    color={grade.not_elp >= 10 ? 'success' : 'error'}
                                    size="small"
                                  />
                                ) : (
                                  <Chip label="ABS" color="default" size="small" />
                                )}
                              </TableCell>
                              <TableCell>{grade.cod_tre || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {grades.length > 20 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Showing first 20 of {grades.length} grades
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
          👥 Student Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search and manage student records
        </Typography>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="end">
            {/* Search Field */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Students"
                placeholder="Name, CIN, or Student Code"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>

            {/* Program Filter */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Program</InputLabel>
                <Select
                  value={filters.program}
                  onChange={(e) => handleFilterChange('program', e.target.value)}
                  label="Program"
                >
                  <MenuItem value="">All Programs</MenuItem>
                  {programs.map((program) => (
                    <MenuItem key={program} value={program}>
                      {program}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Year Filter */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  label="Year"
                >
                  <MenuItem value="">All Years</MenuItem>
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                  disabled={isLoading}
                >
                  Clear
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadStudents()}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {pagination.total_count > 0 && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
            {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)} of{' '}
            {pagination.total_count} students
          </Typography>
          
          <Chip
            icon={<PeopleIcon />}
            label={`${pagination.total_count} Total Students`}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

      {/* Students Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <PeopleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No students found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search criteria
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell><strong>Student Code</strong></TableCell>
                    <TableCell><strong>Full Name</strong></TableCell>
                    <TableCell><strong>CIN</strong></TableCell>
                    <TableCell><strong>Program</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
                    <TableCell><strong>Sync Status</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
                    <TableRow 
                      key={student.id}
                      sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" color="primary">
                          {student.cod_etu}
                        </Typography>
                      </TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.cin_ind}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                          {student.lib_etp}
                        </Typography>
                      </TableCell>
                      <TableCell>{student.cod_anu}</TableCell>
                      <TableCell>
                        <Chip
                          label={student.sync_status === 'recent' ? 'Recent' : 
                                student.sync_status === 'week' ? 'This Week' : 'Old'}
                          color={getSyncStatusColor(student.sync_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          onClick={() => viewStudentDetails(student.id)}
                          size="small"
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.total_pages}
            page={pagination.current_page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Student Details Dialog */}
      <StudentDetailsDialog />
    </Box>
  );
};

export default StudentManagement;