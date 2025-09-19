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
  AccordionDetails,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge
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
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  ContactPage as ContactIcon,
  MenuBook as MenuBookIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
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
      setTabValue(0); // Reset to first tab
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

  // Format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  // Get sync status color
  const getSyncStatusColor = (syncStatus) => {
    switch (syncStatus) {
      case 'recent': return 'success';
      case 'week': return 'warning';
      default: return 'default';
    }
  };

  // Get grade color
  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'default';
    const numGrade = parseFloat(grade);
    if (numGrade >= 16) return 'success';
    if (numGrade >= 14) return 'info';
    if (numGrade >= 12) return 'primary';
    if (numGrade >= 10) return 'warning';
    return 'error';
  };

  // Calculate academic progress
  const calculateProgress = (grades) => {
    if (!grades || grades.length === 0) return { total: 0, passed: 0, failed: 0, average: 0 };
    
    const validGrades = grades.filter(g => g.not_elp !== null && g.not_elp !== undefined);
    const total = validGrades.length;
    const passed = validGrades.filter(g => parseFloat(g.not_elp) >= 10).length;
    const failed = total - passed;
    const sum = validGrades.reduce((acc, g) => acc + parseFloat(g.not_elp), 0);
    const average = total > 0 ? (sum / total).toFixed(2) : 0;
    
    return { total, passed, failed, average };
  };

  // Enhanced Student Details Dialog Component
  const StudentDetailsDialog = () => {
    if (!selectedStudent) return null;

    const { student, grades, statistics } = selectedStudent;
    const progress = calculateProgress(grades);

    const PersonalInfoTab = () => (
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Basic Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Student Code" 
                    secondary={<Typography variant="h6" color="primary">{student.cod_etu}</Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Full Name (French)" secondary={`${student.lib_nom_pat_ind} ${student.lib_pr1_ind}`} />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Full Name (Arabic)" 
                    secondary={
                      <Typography sx={{ direction: 'rtl', textAlign: 'right' }}>
                        {student.lib_nom_ind_arb} {student.lib_prn_ind_arb}
                      </Typography>
                    } 
                  />
                </ListItem>
                {student.lib_nom_usu_ind && (
                  <ListItem>
                    <ListItemText primary="Usual Name" secondary={student.lib_nom_usu_ind} />
                  </ListItem>
                )}
                {student.lib_pr2_ind && (
                  <ListItem>
                    <ListItemText primary="Second Name" secondary={student.lib_pr2_ind} />
                  </ListItem>
                )}
                {student.lib_pr3_ind && (
                  <ListItem>
                    <ListItemText primary="Third Name" secondary={student.lib_pr3_ind} />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemText primary="Gender" secondary={student.cod_sex_etu === 'M' ? 'Male' : student.cod_sex_etu === 'F' ? 'Female' : 'Not specified'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="CIN" secondary={student.cin_ind || 'Not provided'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="CNE" secondary={student.cod_nne_ind || 'Not provided'} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Birth & Location Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Birth & Location
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText primary="Birth Date" secondary={formatDate(student.date_nai_ind)} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Birth Place (French)" secondary={student.lib_vil_nai_etu || 'Not provided'} />
                </ListItem>
                {student.lib_vil_nai_etu_arb && (
                  <ListItem>
                    <ListItemText 
                      primary="Birth Place (Arabic)" 
                      secondary={
                        <Typography sx={{ direction: 'rtl' }}>
                          {student.lib_vil_nai_etu_arb}
                        </Typography>
                      } 
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemText primary="Birth Department/Country" secondary={student.cod_dep_pay_nai || 'Not provided'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Nationality" secondary={student.cod_pay_nat || 'Not provided'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Institution Code" secondary={student.cod_etb || 'Not provided'} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InfoIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  System Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Record Created" secondary={formatDateTime(student.dat_cre_ind)} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Last Modified" secondary={formatDateTime(student.dat_mod_ind)} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Last Sync" secondary={formatDateTime(student.last_sync)} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={4}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="User Code" secondary={student.cod_uti || 'Not provided'} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Entry Year (University)" secondary={student.daa_ens_sup || 'Not provided'} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Entry Year (Institution)" secondary={student.daa_etb || 'Not provided'} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={4}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Institution Entry" secondary={formatDate(student.daa_ent_etb)} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Created At" secondary={formatDateTime(student.created_at)} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Updated At" secondary={formatDateTime(student.updated_at)} />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );

    const AcademicInfoTab = () => (
      <Grid container spacing={3}>
        {/* Current Academic Status */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SchoolIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Current Academic Status
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Academic Year" 
                    secondary={<Chip label={student.cod_anu} color="primary" />}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Program Code" secondary={student.cod_etp} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Program Name" secondary={student.lib_etp} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Program Short Name" secondary={student.lic_etp || 'Not provided'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Version" secondary={student.cod_vrs_vet || 'Not provided'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Diploma Code" secondary={student.cod_dip || 'Not provided'} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Registration Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Registration Details
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText primary="Registration Date" secondary={formatDateTime(student.dat_cre_iae)} />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Cycle Registrations" 
                    secondary={
                      <Chip 
                        label={student.nbr_ins_cyc || 0} 
                        color={student.nbr_ins_cyc === 1 ? 'success' : 'warning'} 
                        size="small" 
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Program Registrations" 
                    secondary={<Chip label={student.nbr_ins_etp || 0} color="info" size="small" />}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Diploma Registrations" 
                    secondary={<Chip label={student.nbr_ins_dip || 0} color="secondary" size="small" />}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Diploma Status" 
                    secondary={
                      <Chip 
                        label={student.tem_dip_iae === 'O' ? 'Graduated' : student.tem_dip_iae === 'N' ? 'In Progress' : 'Unknown'} 
                        color={student.tem_dip_iae === 'O' ? 'success' : 'primary'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Academic Progress Summary */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Academic Progress Summary
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {progress.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Subjects
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e8f5e8', borderRadius: 2 }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {progress.passed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Passed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#ffebee', borderRadius: 2 }}>
                    <Typography variant="h4" color="error.main" fontWeight="bold">
                      {progress.failed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant="h4" color="info.main" fontWeight="bold">
                      {progress.average}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overall Average
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );

    const GradesTab = () => (
      <Box>
        {/* Grade Statistics by Year/Session */}
        {statistics && statistics.length > 0 && (
          <Card sx={{ mb: 3 }} elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Grade Statistics by Period
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Academic Year</strong></TableCell>
                      <TableCell><strong>Session</strong></TableCell>
                      <TableCell align="center"><strong>Total Subjects</strong></TableCell>
                      <TableCell align="center"><strong>Passed</strong></TableCell>
                      <TableCell align="center"><strong>Failed</strong></TableCell>
                      <TableCell align="center"><strong>Average Grade</strong></TableCell>
                      <TableCell align="center"><strong>Success Rate</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statistics.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={stat.cod_anu} color="primary" size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={stat.cod_ses} color="secondary" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Badge badgeContent={stat.total_subjects} color="primary">
                            <MenuBookIcon />
                          </Badge>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={stat.passed_subjects} color="success" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={stat.failed_subjects} color="error" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={stat.average_grade ? parseFloat(stat.average_grade).toFixed(2) : 'N/A'} 
                            color={getGradeColor(stat.average_grade)}
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${Math.round((stat.passed_subjects / stat.total_subjects) * 100)}%`}
                            color={stat.passed_subjects / stat.total_subjects >= 0.7 ? 'success' : 
                                   stat.passed_subjects / stat.total_subjects >= 0.5 ? 'warning' : 'error'}
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
        )}

        {/* Detailed Grades Table */}
        {grades && grades.length > 0 && (
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Complete Grade History ({grades.length} records)
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Year</strong></TableCell>
                      <TableCell><strong>Session</strong></TableCell>
                      <TableCell><strong>Subject Code</strong></TableCell>
                      <TableCell><strong>Subject Name</strong></TableCell>
                      <TableCell align="center"><strong>Grade</strong></TableCell>
                      <TableCell><strong>Result Code</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grades
                      .sort((a, b) => {
                        // Sort by year desc, then session, then subject
                        if (a.cod_anu !== b.cod_anu) return b.cod_anu - a.cod_anu;
                        if (a.cod_ses !== b.cod_ses) return a.cod_ses.localeCompare(b.cod_ses);
                        return (a.lib_elp || '').localeCompare(b.lib_elp || '');
                      })
                      .map((grade, index) => (
                        <TableRow key={index} sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                          <TableCell>
                            <Chip label={grade.cod_anu} color="primary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={grade.cod_ses} color="secondary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="500">
                              {grade.cod_elp}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 250 }}>
                              {grade.lib_elp || 'Subject name not available'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {grade.not_elp !== null && grade.not_elp !== undefined ? (
                              <Chip 
                                label={parseFloat(grade.not_elp).toFixed(2)}
                                color={getGradeColor(grade.not_elp)}
                                size="small"
                              />
                            ) : (
                              <Chip label="ABS" color="default" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {grade.cod_tre || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {grade.not_elp !== null && grade.not_elp !== undefined ? (
                              <Chip 
                                label={parseFloat(grade.not_elp) >= 10 ? 'PASS' : 'FAIL'}
                                color={parseFloat(grade.not_elp) >= 10 ? 'success' : 'error'}
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Chip label="N/A" color="default" size="small" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {(!grades || grades.length === 0) && (
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <AssessmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No grade records found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This student has no recorded grades in the system.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    );

    return (
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <PeopleIcon />
            </Avatar>
            <Box>
              <Typography variant="h5">
                {student.lib_nom_pat_ind} {student.lib_pr1_ind}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Student Code: {student.cod_etu} • Program: {student.lib_etp} • Year: {student.cod_anu}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              variant="fullWidth"
            >
              <Tab 
                label="Personal Information" 
                icon={<PersonIcon />}
                iconPosition="start"
              />
              <Tab 
                label="Academic Details" 
                icon={<SchoolIcon />}
                iconPosition="start"
              />
              <Tab 
                label="Grades & Performance" 
                icon={<AssessmentIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>
          
          <Box sx={{ p: 3, height: 'calc(90vh - 180px)', overflow: 'auto' }}>
            {tabValue === 0 && <PersonalInfoTab />}
            {tabValue === 1 && <AcademicInfoTab />}
            {tabValue === 2 && <GradesTab />}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={() => {
              // TODO: Implement export functionality
              console.log('Export student data:', student.cod_etu);
            }}
          >
            Export Data
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => setDialogOpen(false)} variant="contained">
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
          Student Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search and manage student records with comprehensive details
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
                          title="View Complete Student Details"
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

      {/* Enhanced Student Details Dialog */}
      <StudentDetailsDialog />
    </Box>
  );
};

export default StudentManagement;