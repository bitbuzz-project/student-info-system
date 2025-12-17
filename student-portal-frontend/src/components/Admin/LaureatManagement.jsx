import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Pagination, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Switch, FormControlLabel, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const LaureatManagement = () => {
  const [laureats, setLaureats] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  // Detail Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    year: '',
    diploma: '',
    multiDiploma: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dataRes, statsRes] = await Promise.all([
        adminAPI.getLaureats({ ...filters, page: pagination.page }),
        adminAPI.getLaureatStats()
      ]);
      setLaureats(dataRes.laureats);
      setPagination({
        page: dataRes.page,
        totalPages: dataRes.totalPages,
        total: dataRes.total
      });
      setStats(statsRes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (student) => {
    setSelectedStudent(student);
    setOpenDialog(true);
    setHistoryLoading(true);
    try {
      const history = await adminAPI.getLaureatDetails(student.cod_etu);
      setStudentHistory(history);
    } catch (error) {
      console.error("Failed to fetch student details", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, pagination.page]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <SchoolIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h4" color="primary" fontWeight="bold">
            Gestion des Lauréats
          </Typography>
        </Box>
        <Button 
          startIcon={<RefreshIcon />} 
          variant="outlined"
          onClick={loadData}
        >
          Actualiser
        </Button>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 40, color: '#1565c0', mb: 1 }} />
                <Typography variant="h6" color="textSecondary">Total Lauréats</Typography>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  {pagination.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#fff3e0', height: '100%', border: '1px solid #ffe0b2' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrophyIcon sx={{ fontSize: 40, color: '#f57c00', mb: 1 }} />
                <Typography variant="h6" color="textSecondary">Multi-Diplômés</Typography>
                <Typography variant="h3" sx={{ color: '#e65100' }} fontWeight="bold">
                  {stats.multiDiplomaCount || 0}
                </Typography>
                <Typography variant="caption">Étudiants avec {'>'} 1 diplôme</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Top Diplômes
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {stats.byDiploma.slice(0, 6).map(d => (
                    <Tooltip key={d.cod_dip} title={d.lib_dip || d.cod_dip}>
                      <Chip 
                        label={`${d.cod_dip}: ${d.count}`} 
                        color="success" 
                        variant="outlined" 
                        size="medium"
                      />
                    </Tooltip>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Rechercher (Nom, CNE, CIN...)"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'gray' }} /> }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Année</InputLabel>
              <Select
                value={filters.year}
                label="Année"
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              >
                <MenuItem value="">Toutes</MenuItem>
                <MenuItem value="2023">2023</MenuItem>
                <MenuItem value="2022">2022</MenuItem>
                <MenuItem value="2021">2021</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
             <FormControlLabel
                control={
                  <Switch 
                    checked={filters.multiDiploma}
                    onChange={(e) => setFilters({ ...filters, multiDiploma: e.target.checked })}
                    color="warning"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={filters.multiDiploma ? 'bold' : 'normal'}>
                    Afficher multi-diplômes uniquement
                  </Typography>
                }
              />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Data Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: '#f8f9fa' }}><strong>Étudiant</strong></TableCell>
              <TableCell sx={{ bgcolor: '#f8f9fa' }}><strong>Diplôme Actuel</strong></TableCell>
              <TableCell sx={{ bgcolor: '#f8f9fa' }}><strong>Année</strong></TableCell>
              <TableCell sx={{ bgcolor: '#f8f9fa' }}><strong>Info Personnelle</strong></TableCell>
              <TableCell sx={{ bgcolor: '#f8f9fa' }} align="center"><strong>Détails</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : laureats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  Aucun résultat trouvé
                </TableCell>
              </TableRow>
            ) : (
              laureats.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {row.nom_pat_ind} {row.prenom_ind}
                      </Typography>
                      <Typography variant="caption" display="block" color="textSecondary">
                        {row.cod_etu}
                      </Typography>
                      {row.nom_arabe && (
                        <Typography variant="caption" color="primary" sx={{ direction: 'rtl' }}>
                          {row.nom_arabe} {row.prenom_arabe}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.cod_dip} 
                      size="small" 
                      color="info" 
                      variant="filled"
                    />
                    {row.lib_dip && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5, maxWidth: 300 }} noWrap>
                        {row.lib_dip}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={row.cod_anu} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">CIN: {row.cin_ind}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Né(e) le: {row.date_nai_ind ? new Date(row.date_nai_ind).toLocaleDateString('fr-FR') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Voir tout l'historique">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleViewStudent(row)}
                        sx={{ bgcolor: 'action.hover' }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Pagination 
          count={pagination.totalPages} 
          page={pagination.page} 
          onChange={(e, p) => setPagination({ ...pagination, page: p })}
          color="primary" 
          showFirstButton 
          showLastButton
        />
      </Box>

      {/* STUDENT HISTORY DIALOG */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <SchoolIcon color="primary" />
            <Typography variant="h6">Dossier Académique</Typography>
          </Box>
          <IconButton onClick={() => setOpenDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedStudent && (
            <Box>
              {/* Student Header Info */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#e3f2fd', borderColor: '#90caf9' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">Étudiant</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {selectedStudent.nom_pat_ind} {selectedStudent.prenom_ind}
                    </Typography>
                    <Typography variant="body2" sx={{ direction: 'rtl', textAlign: 'left' }}>
                      {selectedStudent.nom_arabe} {selectedStudent.prenom_arabe}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      <Typography variant="body2"><strong>Code Étudiant:</strong> {selectedStudent.cod_etu}</Typography>
                      <Typography variant="body2"><strong>CNE:</strong> {selectedStudent.cod_nne_ind}</Typography>
                      <Typography variant="body2"><strong>CIN:</strong> {selectedStudent.cin_ind}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrophyIcon color="warning" />
                Diplômes Obtenus ({studentHistory.length})
              </Typography>

              {/* History Table */}
              {historyLoading ? (
                <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#fff3e0' }}>
                        <TableCell><strong>Année</strong></TableCell>
                        <TableCell><strong>Code Diplôme</strong></TableCell>
                        <TableCell><strong>Intitulé du Diplôme</strong></TableCell>
                        <TableCell><strong>Date Obtention</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentHistory.map((history, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Chip label={history.cod_anu} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell><strong>{history.cod_dip}</strong></TableCell>
                          <TableCell>{history.lib_dip || 'Nom non disponible'}</TableCell>
                          <TableCell>
                            {history.dat_cre_iae ? new Date(history.dat_cre_iae).toLocaleDateString('fr-FR') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LaureatManagement;