import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Paper,
  LinearProgress,
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
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Health as HealthIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Computer as ComputerIcon,
  CloudQueue as CloudIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const SystemHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  // Load system health data
  const loadSystemHealth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [healthResponse, statsResponse] = await Promise.all([
        adminAPI.getSystemHealth(),
        adminAPI.getSystemStats(30)
      ]);
      
      setHealthData(healthResponse);
      setSystemStats(statsResponse);
      setLastChecked(new Date());
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load system health data');
      console.error('Error loading system health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystemHealth();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadSystemHealth, 120000);
    return () => clearInterval(interval);
  }, []);

  // Get status color and icon
  const getStatusIcon = (status) => {
    if (status === true) return { icon: <CheckCircleIcon />, color: 'success' };
    if (status === false) return { icon: <ErrorIcon />, color: 'error' };
    return { icon: <WarningIcon />, color: 'warning' };
  };

  // Calculate overall health score
  const calculateHealthScore = () => {
    if (!healthData?.health_checks) return 0;
    
    const checks = healthData.health_checks;
    let totalChecks = 0;
    let passedChecks = 0;
    
    // Database checks
    if (checks.database.postgresql !== undefined) {
      totalChecks++;
      if (checks.database.postgresql) passedChecks++;
    }
    if (checks.database.tables_exist !== undefined) {
      totalChecks++;
      if (checks.database.tables_exist) passedChecks++;
    }
    if (checks.database.recent_activity !== undefined) {
      totalChecks++;
      if (checks.database.recent_activity) passedChecks++;
    }
    
    // Data integrity checks
    if (checks.data_integrity.orphaned_grades !== undefined) {
      totalChecks++;
      if (checks.data_integrity.orphaned_grades === 0) passedChecks++;
    }
    if (checks.data_integrity.missing_elements !== undefined) {
      totalChecks++;
      if (checks.data_integrity.missing_elements === 0) passedChecks++;
    }
    if (checks.data_integrity.duplicate_students !== undefined) {
      totalChecks++;
      if (checks.data_integrity.duplicate_students === 0) passedChecks++;
    }
    
    return totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  };

  const healthScore = calculateHealthScore();

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
            🔧 System Health
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor system performance and health status
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadSystemHealth}
          disabled={isLoading}
          variant="outlined"
        >
          Check Health
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && !healthData && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Health Overview */}
      {healthData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Overall Health Score */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <HealthIcon 
                  sx={{ 
                    fontSize: 60, 
                    mb: 2,
                    color: healthScore >= 90 ? 'success.main' : healthScore >= 70 ? 'warning.main' : 'error.main'
                  }} 
                />
                <Typography variant="h2" fontWeight="bold" 
                  color={healthScore >= 90 ? 'success.main' : healthScore >= 70 ? 'warning.main' : 'error.main'}>
                  {healthScore}%
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Overall Health
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={healthScore}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: healthScore >= 90 ? '#4caf50' : healthScore >= 70 ? '#ff9800' : '#f44336'
                    }
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Critical'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* System Status */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  🖥️ System Status
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ '& > div': { mb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">PostgreSQL</Typography>
                    <Chip
                      icon={getStatusIcon(healthData.health_checks.database.postgresql).icon}
                      label={healthData.health_checks.database.postgresql ? 'Connected' : 'Disconnected'}
                      color={getStatusIcon(healthData.health_checks.database.postgresql).color}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Tables</Typography>
                    <Chip
                      icon={getStatusIcon(healthData.health_checks.database.tables_exist).icon}
                      label={healthData.health_checks.database.tables_exist ? 'OK' : 'Missing'}
                      color={getStatusIcon(healthData.health_checks.database.tables_exist).color}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Recent Activity</Typography>
                    <Chip
                      icon={getStatusIcon(healthData.health_checks.database.recent_activity).icon}
                      label={healthData.health_checks.database.recent_activity ? 'Active' : 'Inactive'}
                      color={getStatusIcon(healthData.health_checks.database.recent_activity).color}
                      size="small"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sync Health */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  🔄 Sync Health
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ '& > div': { mb: 2 } }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Last Sync</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {formatDate(healthData.health_checks.sync_health.last_sync)}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Frequency</Typography>
                    <Chip
                      label={healthData.health_checks.sync_health.sync_frequency}
                      color={
                        healthData.health_checks.sync_health.sync_frequency === 'daily' ? 'success' :
                        healthData.health_checks.sync_health.sync_frequency === 'weekly' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Typography variant="body1" fontWeight="500">
                      {healthData.health_checks.sync_health.sync_frequency === 'outdated' ? 'Needs Sync' : 'Up to Date'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Data Integrity Report */}
      {healthData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              🔍 Data Integrity Report
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" 
                    color={healthData.health_checks.data_integrity.orphaned_grades === 0 ? 'success.main' : 'error.main'}>
                    {healthData.health_checks.data_integrity.orphaned_grades}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Orphaned Grades
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Grades without student records
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" 
                    color={healthData.health_checks.data_integrity.missing_elements === 0 ? 'success.main' : 'error.main'}>
                    {healthData.health_checks.data_integrity.missing_elements}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Missing Elements
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Grades without element info
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" 
                    color={healthData.health_checks.data_integrity.duplicate_students === 0 ? 'success.main' : 'error.main'}>
                    {healthData.health_checks.data_integrity.duplicate_students}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duplicate Students
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Students with duplicate codes
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {/* Data Integrity Recommendations */}
            <Box sx={{ mt: 3 }}>
              {healthData.health_checks.data_integrity.orphaned_grades > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Found {healthData.health_checks.data_integrity.orphaned_grades} orphaned grades. 
                  Consider running a sync to update student records.
                </Alert>
              )}
              
              {healthData.health_checks.data_integrity.missing_elements > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Found {healthData.health_checks.data_integrity.missing_elements} grades with missing element information. 
                  Check the element_pedagogi sync.
                </Alert>
              )}
              
              {healthData.health_checks.data_integrity.duplicate_students > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  Found {healthData.health_checks.data_integrity.duplicate_students} duplicate student records. 
                  This requires immediate attention.
                </Alert>
              )}
              
              {healthData.health_checks.data_integrity.orphaned_grades === 0 && 
               healthData.health_checks.data_integrity.missing_elements === 0 && 
               healthData.health_checks.data_integrity.duplicate_students === 0 && (
                <Alert severity="success">
                  ✅ All data integrity checks passed! Your database is in excellent condition.
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Performance Statistics */}
      {systemStats && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight="600">
              📈 Performance Statistics (Last {systemStats.period_days} Days)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Sync Performance */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  🔄 Sync Performance
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell align="center"><strong>Total Syncs</strong></TableCell>
                        <TableCell align="center"><strong>Avg Records</strong></TableCell>
                        <TableCell align="center"><strong>Max Records</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {systemStats.performance_metrics.map((metric, index) => (
                        <TableRow key={index}>
                          <TableCell>{metric.sync_type}</TableCell>
                          <TableCell align="center">{metric.total_syncs}</TableCell>
                          <TableCell align="center">{metric.avg_records_per_sync}</TableCell>
                          <TableCell align="center">{metric.max_records_per_sync}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Recent Sync Activity */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  📊 Recent Sync Activity
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell align="center"><strong>Count</strong></TableCell>
                        <TableCell align="center"><strong>Success</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {systemStats.sync_history.slice(0, 10).map((history, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(history.sync_date).toLocaleDateString()}</TableCell>
                          <TableCell>{history.sync_type}</TableCell>
                          <TableCell align="center">{history.sync_count}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${history.successful_syncs}/${history.sync_count}`}
                              color={history.successful_syncs === history.sync_count ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Last Check Info */}
      {lastChecked && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Last health check: {lastChecked.toLocaleString('fr-FR')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Checked by: {healthData?.checked_by || 'System'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SystemHealth;