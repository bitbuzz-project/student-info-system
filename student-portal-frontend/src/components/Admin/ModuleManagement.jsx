// Updated ModuleManagement.jsx - Fixed dialog close issue

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
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Assessment as AssessmentIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

// ===== FIXED EDIT MODULE DIALOG COMPONENT =====
const EditModuleDialog = ({ open, module, onClose, onSave, availableParents }) => {
  const [formData, setFormData] = useState({
    lib_elp: '',
    lib_elp_arb: '',
    element_type: '',
    semester_number: null,
    year_level: null,
    cod_nel: '',
    cod_pel: ''
  });
  const [parentCode, setParentCode] = useState('');
  const [errors, setErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (module) {
      setFormData({
        lib_elp: module.lib_elp || '',
        lib_elp_arb: module.lib_elp_arb || '',
        element_type: module.element_type || '',
        semester_number: module.semester_number,
        year_level: module.year_level,
        cod_nel: module.cod_nel || '',
        cod_pel: module.cod_pel || ''
      });
      setParentCode(module.parent_code || '');
      setErrors([]); // Clear errors when opening new module
    }
  }, [module]);

  const handleSave = async () => {
    // Validate form data
    const validation = adminAPI.validateModuleData(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setIsSaving(true);
    
    try {
      // Call the parent's onSave function and wait for it to complete
      await onSave(formData, parentCode);
      // If we get here, the save was successful and parent will close dialog
    } catch (error) {
      // Handle error display
      console.error('Save error in dialog:', error);
      setErrors(['Failed to save module: ' + (error.message || 'Unknown error')]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setErrors([]);
    setIsSaving(false);
    onClose();
  };

  if (!module) return null;

  return (
    <Dialog open={open} onClose={!isSaving ? handleClose : undefined} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <EditIcon color="primary" />
          <Typography variant="h6">
            Edit Module: {module.cod_elp}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Module Code (Read-only) */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Module Code"
              value={module.cod_elp}
              disabled
              variant="filled"
            />
          </Grid>

          {/* Current Usage Info */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#f8f9fa' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Usage: {module.usage_display} | Children: {module.children_display}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Module Name (French) */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Module Name (French)"
              value={formData.lib_elp}
              onChange={(e) => setFormData({ ...formData, lib_elp: e.target.value })}
              multiline
              rows={2}
              disabled={isSaving}
            />
          </Grid>

          {/* Module Name (Arabic) */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Module Name (Arabic)"
              value={formData.lib_elp_arb}
              onChange={(e) => setFormData({ ...formData, lib_elp_arb: e.target.value })}
              multiline
              rows={2}
              sx={{ direction: 'rtl' }}
              disabled={isSaving}
            />
          </Grid>

          {/* Element Type */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={isSaving}>
              <InputLabel>Element Type</InputLabel>
              <Select
                value={formData.element_type}
                onChange={(e) => {
                  const newElementType = e.target.value;
                  setFormData({ 
                    ...formData, 
                    element_type: newElementType,
                    // Clear conflicting fields based on type
                    semester_number: newElementType === 'ANNEE' ? null : formData.semester_number,
                    year_level: newElementType !== 'ANNEE' ? null : formData.year_level
                  });
                }}
                label="Element Type"
              >
                {adminAPI.getElementTypeOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Year Level - Only show for ANNEE type */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={formData.element_type !== 'ANNEE' || isSaving}>
              <InputLabel>Academic Year Level</InputLabel>
              <Select
                value={formData.year_level || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  year_level: e.target.value === '' ? null : parseInt(e.target.value)
                })}
                label="Academic Year Level"
              >
                {adminAPI.getYearLevelOptions().map((option) => (
                  <MenuItem key={option.value || 'null'} value={option.value || ''}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Semester Number - Only show for non-ANNEE types */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={formData.element_type === 'ANNEE' || isSaving}>
              <InputLabel>Semester</InputLabel>
              <Select
                value={formData.semester_number || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  semester_number: e.target.value === '' ? null : parseInt(e.target.value)
                })}
                label="Semester"
              >
                {adminAPI.getSemesterOptions().map((option) => (
                  <MenuItem key={option.value || 'null'} value={option.value || ''}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* COD_NEL */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="COD_NEL"
              value={formData.cod_nel}
              onChange={(e) => setFormData({ ...formData, cod_nel: e.target.value })}
              disabled={isSaving}
            />
          </Grid>

          {/* COD_PEL */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="COD_PEL"
              value={formData.cod_pel}
              onChange={(e) => setFormData({ ...formData, cod_pel: e.target.value })}
              disabled={isSaving}
            />
          </Grid>

          {/* Parent Module */}
          <Grid item xs={12}>
            <Autocomplete
              options={availableParents}
              getOptionLabel={(option) => `${option.cod_elp} - ${option.lib_elp}`}
              value={availableParents.find(p => p.cod_elp === parentCode) || null}
              onChange={(event, newValue) => {
                setParentCode(newValue?.cod_elp || '');
              }}
              disabled={isSaving}
              renderInput={(params) => (
                <TextField {...params} label="Parent Module" fullWidth />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      {option.cod_elp}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.lib_elp}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleClose} 
          startIcon={<CancelIcon />}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ===== MODULE USAGE STATISTICS DIALOG =====
const ModuleUsageDialog = ({ open, module, usage, onClose }) => {
  if (!module || !usage) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h6">
            Usage Statistics: {module.cod_elp}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Module Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 {module.lib_elp}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {module.lib_elp_arb}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Chip label={module.element_type_display} color="primary" size="small" />
                <Chip label={module.semester_display} color="secondary" size="small" />
              </Box>
            </CardContent>
          </Card>

          {/* Overall Statistics */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                📈 Overall Usage Statistics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {usage.usage_statistics.total_grades || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Grades
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {usage.usage_statistics.unique_students || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unique Students
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {usage.usage_statistics.grades_2024 || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      2024 Grades
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="info.main">
                      {usage.usage_statistics.average_grade ? 
                        parseFloat(usage.usage_statistics.average_grade).toFixed(2) : 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Grade
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Distribution by Year and Session */}
          {usage.distribution && usage.distribution.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  📋 Grade Distribution by Year & Session
                </Typography>
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                        <TableCell><strong>Academic Year</strong></TableCell>
                        <TableCell><strong>Session</strong></TableCell>
                        <TableCell align="center"><strong>Count</strong></TableCell>
                        <TableCell align="center"><strong>Average Grade</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {usage.distribution.map((dist, index) => (
                        <TableRow key={index}>
                          <TableCell>{dist.cod_anu}</TableCell>
                          <TableCell>
                            <Chip 
                              label={dist.cod_ses === '1' ? 'Normal' : 'Rattrapage'}
                              color={dist.cod_ses === '1' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="600">
                              {dist.count}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="600">
                              {dist.avg_grade ? parseFloat(dist.avg_grade).toFixed(2) : 'N/A'}
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

          {/* No Usage Message */}
          {usage.usage_statistics.total_grades === 0 && (
            <Alert severity="info">
              This module has no recorded grades yet. It may be a new module or a parent/grouping element.
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ===== BULK UPDATE DIALOG =====
const BulkUpdateDialog = ({ open, selectedCount, bulkSemester, setBulkSemester, onClose, onUpdate }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            Bulk Update Semester Assignment
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            You are about to update the semester assignment for <strong>{selectedCount} modules</strong>.
            This action will modify the semester_number field for all selected modules.
          </Alert>

          <FormControl fullWidth>
            <InputLabel>New Semester Assignment</InputLabel>
            <Select
              value={bulkSemester}
              onChange={(e) => setBulkSemester(e.target.value)}
              label="New Semester Assignment"
            >
              <MenuItem value="null">Remove Semester Assignment</MenuItem>
              {adminAPI.getSemesterOptions().filter(option => option.value !== null).map((option) => (
                <MenuItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> This action will update all selected modules immediately. 
              Make sure you have selected the correct modules before proceeding.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button 
          onClick={onUpdate} 
          variant="contained" 
          startIcon={<SaveIcon />}
          disabled={bulkSemester === ''}
        >
          Update {selectedCount} Modules
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ===== MAIN MODULE MANAGEMENT COMPONENT =====
const ModuleManagement = () => {
  // State for modules data
  const [modules, setModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 50
  });
  
  // State for UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for filters
  const [filters, setFilters] = useState({
    search: '',
    element_type: '',
    year_level: '',
    semester: '',
    parent_code: '',
    page: 1,
    limit: 50
  });
  
  // State for dialogs
  const [editDialog, setEditDialog] = useState({ open: false, module: null });
  const [usageDialog, setUsageDialog] = useState({ open: false, module: null, usage: null });
  const [bulkDialog, setBulkDialog] = useState({ open: false });
  
  // State for bulk operations
  const [bulkSemester, setBulkSemester] = useState('');
  const [availableParents, setAvailableParents] = useState([]);

  // Load modules data
  const loadModules = async (newFilters = filters) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await adminAPI.getModules(newFilters);
      setModules(response.modules.map(adminAPI.formatModuleForDisplay));
      setPagination(response.pagination);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load modules');
      console.error('Error loading modules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load available parents for dropdowns
  const loadAvailableParents = async (search = '') => {
    try {
      const response = await adminAPI.getAvailableParents(search);
      setAvailableParents(response.parents);
    } catch (err) {
      console.error('Error loading available parents:', err);
    }
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value, page: 1 };
    setFilters(newFilters);
    loadModules(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      element_type: '',
      semester: '',
      year_level: '',
      parent_code: '',
      page: 1,
      limit: 50
    };
    setFilters(clearedFilters);
    loadModules(clearedFilters);
  };

  // Handle pagination
  const handlePageChange = (event, page) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    loadModules(newFilters);
  };

  // FIXED: Handle module edit with proper error handling and dialog closing
  const handleEditModule = async (moduleData, parentCode) => {
    try {
      const validation = adminAPI.validateModuleData(moduleData);
      if (!validation.isValid) {
        throw new Error('Validation errors: ' + validation.errors.join(', '));
      }

      // First, update the module properties
      await adminAPI.updateModule(editDialog.module.id, moduleData);
      
      // Then, update the parent relationship if it changed
      if (editDialog.module && parentCode !== editDialog.module.parent_code) {
        await adminAPI.updateModuleParent(editDialog.module.id, parentCode);
      }
      
      setSuccess('Module updated successfully!');
      setEditDialog({ open: false, module: null }); // Close the dialog
      loadModules(); // Reload the modules list
      
      // Return success to indicate completion
      return Promise.resolve();
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update module';
      setError(errorMessage);
      console.error('Error updating module:', err);
      
      // Re-throw the error so the dialog can handle it
      throw new Error(errorMessage);
    }
  };

  // Handle parent update
  const handleUpdateParent = async (moduleId, parentCode) => {
    try {
      await adminAPI.updateModuleParent(moduleId, parentCode);
      setSuccess('Parent relationship updated!');
      loadModules();
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update parent relationship');
      console.error('Error updating parent:', err);
    }
  };

  // Handle bulk semester update
  const handleBulkUpdate = async () => {
    try {
      if (selectedModules.length === 0) {
        setError('Please select modules to update');
        return;
      }

      if (bulkSemester === '') {
        setError('Please select a semester');
        return;
      }

      const updates = selectedModules.map(moduleId => ({
        id: moduleId,
        semester_number: bulkSemester === 'null' ? null : parseInt(bulkSemester)
      }));

      await adminAPI.bulkUpdateSemesters(updates);
      setSuccess(`Successfully updated ${updates.length} modules`);
      setBulkDialog({ open: false });
      setSelectedModules([]);
      setBulkSemester('');
      loadModules();
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to bulk update');
      console.error('Error in bulk update:', err);
    }
  };

  // Handle module selection for bulk operations
  const handleModuleSelect = (moduleId, isSelected) => {
    if (isSelected) {
      setSelectedModules([...selectedModules, moduleId]);
    } else {
      setSelectedModules(selectedModules.filter(id => id !== moduleId));
    }
  };

  // Select all modules on current page
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const currentPageModuleIds = modules.map(module => module.id);
      setSelectedModules([...new Set([...selectedModules, ...currentPageModuleIds])]);
    } else {
      const currentPageModuleIds = modules.map(module => module.id);
      setSelectedModules(selectedModules.filter(id => !currentPageModuleIds.includes(id)));
    }
  };

  // Load module usage statistics
  const loadModuleUsage = async (module) => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getModuleUsage(module.id);
      setUsageDialog({ open: true, module, usage: response });
    } catch (err) {
      setError('Failed to load module usage statistics');
      console.error('Error loading usage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get semester color
  const getSemesterColor = (semesterNumber) => {
    if (!semesterNumber) return 'default';
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];
    return colors[(semesterNumber - 1) % colors.length];
  };

  // Get element type color
  const getElementTypeColor = (elementType) => {
    switch (elementType) {
      case 'SEMESTRE': return 'success';
      case 'MODULE': return 'primary';
      case 'MATIERE': return 'warning';
      case 'ANNEE': return 'info';
      default: return 'default';
    }
  };

  // Initialize data
  useEffect(() => {
    loadModules();
    loadAvailableParents();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          🔧 Module Management
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => loadModules()}
          sx={{ ml: 'auto' }}
          variant="outlined"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {/* Alert Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterListIcon sx={{ mr: 2 }} />
                <Typography variant="h6" fontWeight="600">
                  Filters & Search
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Search */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Search Modules"
                    placeholder="Module code, name, or Arabic name"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>

                {/* Element Type Filter */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Element Type</InputLabel>
                    <Select
                      value={filters.element_type}
                      onChange={(e) => handleFilterChange('element_type', e.target.value)}
                      label="Element Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      {adminAPI.getElementTypeOptions().map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Semester Filter */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Semester</InputLabel>
                    <Select
                      value={filters.semester}
                      onChange={(e) => handleFilterChange('semester', e.target.value)}
                      label="Semester"
                      disabled={filters.element_type === 'ANNEE'}
                    >
                      <MenuItem value="">All Semesters</MenuItem>
                      {adminAPI.getSemesterOptions().map((option) => (
                        <MenuItem key={option.value || 'null'} value={option.value || ''}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Year Level Filter */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Academic Year</InputLabel>
                    <Select
                      value={filters.year_level || ''}
                      onChange={(e) => handleFilterChange('year_level', e.target.value)}
                      label="Academic Year"
                      disabled={filters.element_type !== 'ANNEE' && filters.element_type !== ''}
                    >
                      <MenuItem value="">All Years</MenuItem>
                      {adminAPI.getYearLevelOptions().map((option) => (
                        <MenuItem key={option.value || 'null'} value={option.value || ''}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Parent Filter */}
                <Grid item xs={12} md={2}>
                  <Autocomplete
                    options={availableParents}
                    getOptionLabel={(option) => `${option.cod_elp} - ${option.lib_elp}`}
                    value={availableParents.find(p => p.cod_elp === filters.parent_code) || null}
                    onChange={(event, newValue) => {
                      handleFilterChange('parent_code', newValue?.cod_elp || '');
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Parent Module" fullWidth />
                    )}
                  />
                </Grid>

                {/* Clear Filters */}
                <Grid item xs={12} md={1}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                    sx={{ height: '56px' }}
                  >
                    Clear
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {selectedModules.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: '#e3f2fd', borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" color="primary">
                {selectedModules.length} modules selected
              </Typography>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setBulkDialog({ open: true })}
              >
                Bulk Update Semester
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
          {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)} of{' '}
          {pagination.total_count} modules
        </Typography>
        
        <Chip
          icon={<SettingsIcon />}
          label={`${pagination.total_count} Total Modules`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* Modules Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : modules.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <SettingsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No modules found
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={modules.length > 0 && modules.every(module => selectedModules.includes(module.id))}
                        indeterminate={modules.some(module => selectedModules.includes(module.id)) && !modules.every(module => selectedModules.includes(module.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell><strong>Module Code</strong></TableCell>
                    <TableCell><strong>Module Name</strong></TableCell>
                    <TableCell><strong>Element Type</strong></TableCell>
                    <TableCell><strong>Academic Year</strong></TableCell>
                    <TableCell><strong>Semester</strong></TableCell>
                    <TableCell><strong>Parent Module</strong></TableCell>
                    <TableCell><strong>Usage</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modules.map((module) => (
                    <TableRow 
                      key={module.id}
                      sx={{ 
                        '&:hover': { bgcolor: '#f8f9fa' },
                        bgcolor: selectedModules.includes(module.id) ? '#e3f2fd' : 'inherit'
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedModules.includes(module.id)}
                          onChange={(e) => handleModuleSelect(module.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" color="primary">
                          {module.cod_elp}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {module.lib_elp}
                          </Typography>
                          {module.lib_elp_arb && (
                            <Typography variant="caption" color="text.secondary" sx={{ direction: 'rtl' }}>
                              {module.lib_elp_arb}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={module.element_type_display}
                          color={getElementTypeColor(module.element_type)}
                          size="small"
                        />
                      </TableCell>
                      {/* Academic Year Column */}
                      <TableCell>
                        {module.element_type === 'ANNEE' ? (
                          <Chip
                            label={module.year_display}
                            color="info"
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      {/* Semester Column */}
                      <TableCell>
                        {module.element_type === 'SEMESTRE' || (module.semester_number && module.element_type !== 'ANNEE') ? (
                          <Chip
                            label={module.semester_display}
                            color={getSemesterColor(module.semester_number)}
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {module.parent_display}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {module.usage_display}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit Module">
                            <IconButton
                              color="primary"
                              onClick={() => setEditDialog({ open: true, module })}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Usage Statistics">
                            <IconButton
                              color="info"
                              onClick={() => loadModuleUsage(module)}
                              size="small"
                            >
                              <AssessmentIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
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

      {/* Edit Module Dialog */}
      <EditModuleDialog
        open={editDialog.open}
        module={editDialog.module}
        availableParents={availableParents}
        onClose={() => setEditDialog({ open: false, module: null })}
        onSave={handleEditModule}
      />

      {/* Usage Statistics Dialog */}
      <ModuleUsageDialog
        open={usageDialog.open}
        module={usageDialog.module}
        usage={usageDialog.usage}
        onClose={() => setUsageDialog({ open: false, module: null, usage: null })}
      />

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        open={bulkDialog.open}
        selectedCount={selectedModules.length}
        bulkSemester={bulkSemester}
        setBulkSemester={setBulkSemester}
        onClose={() => setBulkDialog({ open: false })}
        onUpdate={handleBulkUpdate}
      />
    </Box>
  );
};

export default ModuleManagement;