import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Alert, InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Badge as BadgeIcon, // For "RH" feel
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', type: '' });
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [formData, setFormData] = useState({
    cin: '', nom: '', prenom: '', email: '', phone: '',
    type: 'PROFESSEUR', department: '', grade: '', date_embauche: '', status: 'ACTIF'
  });

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getEmployees(filters);
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [filters.type]); // Reload when type filter changes

  const handleOpen = (employee = null) => {
    if (employee) {
      setEditMode(true);
      setCurrentEmployee(employee);
      setFormData({
        ...employee,
        date_embauche: employee.date_embauche ? employee.date_embauche.split('T')[0] : ''
      });
    } else {
      setEditMode(false);
      setCurrentEmployee(null);
      setFormData({
        cin: '', nom: '', prenom: '', email: '', phone: '',
        type: 'PROFESSEUR', department: '', grade: '', date_embauche: '', status: 'ACTIF'
      });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editMode) {
        await adminAPI.updateEmployee(currentEmployee.id, formData);
      } else {
        await adminAPI.addEmployee(formData);
      }
      setOpen(false);
      loadEmployees();
    } catch (error) {
      alert("Erreur lors de l'enregistrement: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet employé ?')) {
      try {
        await adminAPI.deleteEmployee(id);
        loadEmployees();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <BadgeIcon color="primary" sx={{ fontSize: 35 }} />
          <Typography variant="h4" fontWeight="bold" color="primary">Gestion RH</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Nouvel Employé
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField 
              fullWidth size="small" label="Rechercher (Nom, CIN)" 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              onKeyPress={(e) => e.key === 'Enter' && loadEmployees()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={loadEmployees}><SearchIcon /></IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type de Personnel</InputLabel>
              <Select 
                value={filters.type} 
                label="Type de Personnel"
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="PROFESSEUR">Professeurs</MenuItem>
                <MenuItem value="ADMINISTRATIF">Administratifs</MenuItem>
                <MenuItem value="TECHNICIEN">Techniciens</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
             <Button variant="outlined" fullWidth onClick={loadEmployees} startIcon={<RefreshIcon />}>
               Actualiser
             </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>CIN</strong></TableCell>
              <TableCell><strong>Nom & Prénom</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Département</strong></TableCell>
              <TableCell><strong>Statut</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id} hover>
                <TableCell>{emp.cin}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{emp.nom} {emp.prenom}</Typography>
                  <Typography variant="caption" color="textSecondary">{emp.email}</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={emp.type} 
                    size="small" 
                    color={emp.type === 'PROFESSEUR' ? 'primary' : 'default'} 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell>{emp.department || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={emp.status} 
                    size="small" 
                    color={emp.status === 'ACTIF' ? 'success' : 'warning'} 
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" size="small" onClick={() => handleOpen(emp)}><EditIcon /></IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDelete(emp.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && !loading && (
              <TableRow><TableCell colSpan={6} align="center">Aucun employé trouvé</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Modifier Employé' : 'Ajouter Nouvel Employé'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="CIN" value={formData.cin} onChange={(e) => setFormData({...formData, cin: e.target.value})} disabled={editMode} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={formData.type} label="Type" onChange={(e) => setFormData({...formData, type: e.target.value})}>
                  <MenuItem value="PROFESSEUR">Professeur</MenuItem>
                  <MenuItem value="ADMINISTRATIF">Administratif</MenuItem>
                  <MenuItem value="TECHNICIEN">Technicien</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Nom" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Prénom" value={formData.prenom} onChange={(e) => setFormData({...formData, prenom: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Téléphone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Département" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Date d'embauche" InputLabelProps={{ shrink: true }} value={formData.date_embauche} onChange={(e) => setFormData({...formData, date_embauche: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select value={formData.status} label="Statut" onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <MenuItem value="ACTIF">Actif</MenuItem>
                  <MenuItem value="CONGE">En Congé</MenuItem>
                  <MenuItem value="RETRAITE">Retraité</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeManagement;