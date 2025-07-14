import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  Sync as SyncIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CloudSync as CloudSyncIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const SyncManagement = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStats, setSyncStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Load sync data
  const loadSyncData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [statusResponse, statsResponse] = await Promise.all([
        adminAPI.getSyncStatus(20),
        adminAPI.getSystemStats(30)
      ]);
      
      setSyncStatus(statusResponse);
      setSyncStats(statsResponse);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sync data');
      console.error('Error loading sync data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSyncData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSyncData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Trigger manual sync
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSuccess(null);
      setConfirmDialog(false);
      
      const response = await adminAPI.triggerManualSync();
      setSuccess(response.message);
      
      // Refresh sync status after a delay
      setTimeout(() => {
        loadSyncData();
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start sync');
      console.error('Error starting sync:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'success':
        return { color: 'success', icon: <CheckCircleIcon />, label: 'Success' };
      case 'error':
        return { color: 'error', icon: <ErrorIcon />, label: 'Error' };
      case 'started':
        return { color: 'warning', icon: <WarningIcon />, label: 'In Progress' };
      default:
        return { color: 'default', icon: <SyncIcon />, label: status };
    }
  };

  // Calculate sync health score
  const getSyncHealthScore = () => {
    if (!syncStatus?.sync_statistics) return 0;
    
    const stats = syncStatus.sync_statistics;
    let totalSyncs = 0;
    let successfulSyncs = 0;
    
    stats.forEach(stat => {
      totalSyncs += stat.total_syncs;
      successfulSyncs += stat.successful_syncs;
    });
    
    return totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 0;
  };

  const healthScore = getSyncHealthScore();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
          🔄 Data Synchronization
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and monitor data synchronization from Oracle to PostgreSQL
        </Typography>
      </Box>

      {/* Error/Success Messages */}
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

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="600">
              🚀 Quick Actions
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadSyncData}
              disabled={isLoading}
              variant="outlined"
            >
              Refresh Status
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={isSyncing ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                onClick={() => setConfirmDialog(true)}
                disabled={isSyncing || isLoading}
                sx={{
                  py: 2,
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
                  }
                }}
              >
                {isSyncing ? 'Syncing...' : 'Start Manual Sync'}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<HistoryIcon />}
                onClick={loadSyncData}
                disabled={isLoading}
                sx={{ py: 2 }}
              >
                View Sync History
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<CloudSyncIcon />}
                disabled={isLoading}
                sx={{ py: 2 }}
                color="info"
              >
                Sync Configuration
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sync Status Overview */}
      {syncStatus && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Last Sync Info */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  📊 Last Sync Status
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {syncStatus.last_sync ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Chip
                        icon={getStatusDisplay(syncStatus.last_sync.sync_status).icon}
                        label={getStatusDisplay(syncStatus.last_sync.sync_status).label}
                        color={getStatusDisplay(syncStatus.last_sync.sync_status).color}
                        sx={{ mr: 2 }}
                      />
                      <Typography variant="body1" fontWeight="500">
                        {syncStatus.last_sync.sync_type}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Records Processed
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {syncStatus.last_sync.records_processed || 0}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Timestamp
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(syncStatus.last_sync.sync_timestamp)}
                      </Typography>
                    </Box>
                    
                    {syncStatus.last_sync.error_message && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {syncStatus.last_sync.error_message}
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    No sync history available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sync Health */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  ❤️ Sync Health Score
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h2" fontWeight="bold" 
                    color={healthScore >= 90 ? 'success.main' : healthScore >= 70 ? 'warning.main' : 'error.main'}>
                    {healthScore}%
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Success Rate (Last 30 Days)
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={healthScore}
                  sx={{
                    height: 10,
                    borderRadius: 1,
                    mb: 2,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: healthScore >= 90 ? '#4caf50' : healthScore >= 70 ? '#ff9800' : '#f44336'
                    }
                  }}
                />
                
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Needs Attention'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Sync Statistics */}
      {syncStatus?.sync_statistics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              📈 Sync Statistics (Last 30 Days)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell><strong>Sync Type</strong></TableCell>
                    <TableCell align="center"><strong>Total Syncs</strong></TableCell>
                    <TableCell align="center"><strong>Successful</strong></TableCell>
                    <TableCell align="center"><strong>Failed</strong></TableCell>
                    <TableCell align="center"><strong>Success Rate</strong></TableCell>
                    <TableCell><strong>Last Sync</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncStatus.sync_statistics.map((stat, index) => {
                    const successRate = stat.total_syncs > 0 ? 
                      Math.round((stat.successful_syncs / stat.total_syncs) * 100) : 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {stat.sync_type}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={stat.total_syncs} color="primary" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={stat.successful_syncs} color="success" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={stat.failed_syncs} color="error" size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${successRate}%`}
                            color={successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(stat.last_sync_time)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Sync History */}
      {syncStatus?.recent_syncs && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              📋 Recent Sync History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Records</strong></TableCell>
                      <TableCell><strong>Timestamp</strong></TableCell>
                      <TableCell><strong>Error Message</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncStatus.recent_syncs.map((sync, index) => {
                      const statusDisplay = getStatusDisplay(sync.sync_status);
                      
                      return (
                        <TableRow 
                          key={index}
                          sx={{ 
                            '&:hover': { bgcolor: '#f8f9fa' },
                            backgroundColor: sync.sync_status === 'error' ? 'rgba(244, 67, 54, 0.05)' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="500">
                              {sync.sync_type}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={statusDisplay.icon}
                              label={statusDisplay.label}
                              color={statusDisplay.color}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {sync.records_processed || 0}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(sync.sync_timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {sync.error_message ? (
                              <Typography 
                                variant="body2" 
                                color="error"
                                sx={{ maxWidth: 300 }}
                                noWrap
                                title={sync.error_message}
                              >
                                {sync.error_message}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon color="warning" />
            <Typography variant="h6">
              Confirm Manual Sync
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Important:</strong> Manual synchronization will:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Connect to the Oracle database</li>
              <li>Fetch the latest student and grade data</li>
              <li>Update the PostgreSQL database</li>
              <li>This process may take several minutes</li>
            </Box>
          </Alert>
          
          <Typography variant="body1">
            Are you sure you want to start a manual synchronization?
          </Typography>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog(false)}
            disabled={isSyncing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleManualSync}
            variant="contained"
            color="warning"
            disabled={isSyncing}
            startIcon={isSyncing ? <CircularProgress size={20} /> : <PlayIcon />}
          >
            {isSyncing ? 'Starting...' : 'Start Sync'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SyncManagement;