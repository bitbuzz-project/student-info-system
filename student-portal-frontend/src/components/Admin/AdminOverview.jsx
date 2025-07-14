import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Sync as SyncIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const AdminOverview = ({ onNavigate }) => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dataOverview, setDataOverview] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [statsResponse, overviewResponse, syncResponse] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getDataOverview(),
        adminAPI.getSyncStatus(5)
      ]);
      
      setDashboardStats(statsResponse);
      setDataOverview(overviewResponse);
      setSyncStatus(syncResponse);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'started': return 'warning';
      default: return 'default';
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color, onClick, loading = false }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            {icon}
          </Box>
          {loading && <LinearProgress sx={{ width: 30 }} />}
        </Box>
        
        <Typography variant="h3" fontWeight="bold" color="primary" gutterBottom>
          {loading ? '...' : value}
        </Typography>
        
        <Typography variant="h6" fontWeight="600" gutterBottom>
          {title}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight="600" gutterBottom>
          Dashboard Overview
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <StatCard 
                title="Loading..."
                value="..."
                icon={<DashboardIcon />}
                color="#95a5a6"
                loading={true}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="600" color="primary" gutterBottom>
            📊 Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System overview and quick statistics
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Main Statistics Cards */}
      {dashboardStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Students"
              value={dashboardStats.overview.total_students.toLocaleString()}
              subtitle="Registered students"
              icon={<PeopleIcon sx={{ fontSize: 28 }} />}
              color="#3498db"
              onClick={() => onNavigate('students')}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Grades"
              value={dashboardStats.overview.total_grades.toLocaleString()}
              subtitle="Grade records"
              icon={<AssessmentIcon sx={{ fontSize: 28 }} />}
              color="#2ecc71"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Academic Programs"
              value={dashboardStats.overview.total_programs}
              subtitle="Different specializations"
              icon={<SchoolIcon sx={{ fontSize: 28 }} />}
              color="#e74c3c"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Academic Years"
              value={dashboardStats.overview.total_years}
              subtitle="Years with data"
              icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
              color="#9b59b6"
            />
          </Grid>
        </Grid>
      )}

      {/* Recent Activity & Sync Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Recent Activity */}
        {dashboardStats && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  📈 Recent Activity (Last 7 Days)
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Students Updated
                    </Typography>
                    <Chip 
                      label={dashboardStats.recent_activity.students_updated}
                      color="primary"
                      size="small"
                    />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(dashboardStats.recent_activity.students_updated / 10, 100)} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Grades Updated
                    </Typography>
                    <Chip 
                      label={dashboardStats.recent_activity.grades_updated}
                      color="success"
                      size="small"
                    />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(dashboardStats.recent_activity.grades_updated / 50, 100)} 
                    color="success"
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>

                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Sync: {formatDate(dashboardStats.recent_activity.last_sync)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                🚀 Quick Actions
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PeopleIcon />}
                    onClick={() => onNavigate('students')}
                    sx={{ mb: 2 }}
                  >
                    Manage Students
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    startIcon={<SyncIcon />}
                    onClick={() => onNavigate('sync')}
                    sx={{ mb: 2 }}
                  >
                    Data Synchronization
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<AssessmentIcon />}
                    onClick={() => onNavigate('system')}
                  >
                    System Health
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Overview Tables */}
      <Grid container spacing={3}>
        {/* Students by Year */}
        {dataOverview && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  👥 Students by Academic Year
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Year</strong></TableCell>
                        <TableCell align="right"><strong>Students</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dataOverview.students_by_year.map((row) => (
                        <TableRow key={row.cod_anu}>
                          <TableCell>{row.cod_anu} - {parseInt(row.cod_anu) + 1}</TableCell>
                          <TableCell align="right">
                            <Chip label={row.count} color="primary" size="small" />
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

        {/* Recent Sync History */}
        {syncStatus && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  🔄 Recent Sync History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Records</strong></TableCell>
                        <TableCell><strong>Time</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {syncStatus.recent_syncs.slice(0, 5).map((sync, index) => (
                        <TableRow key={index}>
                          <TableCell>{sync.sync_type}</TableCell>
                          <TableCell>
                            <Chip 
                              label={sync.sync_status}
                              color={getStatusColor(sync.sync_status)}
                              size="small"
                              icon={sync.sync_status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                            />
                          </TableCell>
                          <TableCell>{sync.records_processed || 0}</TableCell>
                          <TableCell>{new Date(sync.sync_timestamp).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button 
                    variant="text" 
                    onClick={() => onNavigate('sync')}
                    size="small"
                  >
                    View All Sync History
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AdminOverview;