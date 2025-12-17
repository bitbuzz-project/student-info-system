import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Alert, InputAdornment, LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Badge as BadgeIcon,
  UploadFile as UploadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ search: '', type: '' });
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [formData, setFormData] = useState({
    ppr: '', nom: '', prenom: '', email: '', phone: '',
    type: 'PROF', department: '', grade: '', 
    diplome: '', specialite: '',
    date_recrutement: '', status: 'ACTIF'
  });

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // --- HELPER: GET TOKEN ---
  const getAdminToken = () => {
    return localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('adminToken');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
  };

  // --- LOAD EMPLOYEES ---
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`http://localhost:3000/admin/employees?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      showNotification('Erreur de connexion serveur', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [filters.type]);

  // --- FILE UPLOAD (CSV/EXCEL) ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const token = getAdminToken();
    if (!token) {
        showNotification('Vous devez être connecté.', 'error');
        return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    setUploading(true);
    try {
      const response = await fetch('http://localhost:3000/admin/employees/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      const data = await response.json();
      if (response.ok) {
        let msg = `Import réussi ! ${data.success} ajoutés.`;
        if (data.errors > 0) msg += ` (${data.errors} erreurs)`;
        showNotification(msg, data.errors > 0 ? 'warning' : 'success');
        
        // Afficher les erreurs détaillées dans la console
        if (data.details) console.warn("Détails des erreurs d'import :", data.details);

        loadEmployees();
      } else {
        showNotification('Échec de l\'import : ' + (data.error || 'Erreur inconnue'), 'error');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showNotification('Erreur technique lors de l\'upload', 'error');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  // --- DIALOG HANDLERS ---
  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditMode(true);
      setCurrentEmployee(employee);
      setFormData({
        ppr: employee.ppr || '',
        nom: employee.nom || '',
        prenom: employee.prenom || '',
        email: employee.email || '',
        phone: employee.phone || '',
        type: employee.type || 'PROF',
        department: employee.departement || '',
        grade: employee.grade || '',
        diplome: employee.diplome || '',
        specialite: employee.specialite || '',
        date_recrutement: employee.date_recrutement ? employee.date_recrutement.split('T')[0] : '',
        status: employee.status || 'ACTIF'
      });
    } else {
      setEditMode(false);
      setCurrentEmployee(null);
      setFormData({
        ppr: '', nom: '', prenom: '', email: '', phone: '',
        type: 'PROF', department: '', grade: '', 
        diplome: '', specialite: '',
        date_recrutement: '', status: 'ACTIF'
      });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const token = getAdminToken();
      const url = editMode 
        ? `http://localhost:3000/admin/employees/${currentEmployee.id}`
        : 'http://localhost:3000/admin/employees';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        date_embauche: formData.date_recrutement 
      };

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showNotification(editMode ? 'Employé mis à jour' : 'Employé ajouté', 'success');
        setOpen(false);
        loadEmployees();
      } else {
        const data = await response.json();
        showNotification(data.error || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (error) {
      showNotification('Erreur de connexion serveur', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
      try {
        const token = getAdminToken();
        const response = await fetch(`http://localhost:3000/admin/employees/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          showNotification('Employé supprimé', 'success');
          loadEmployees();
        }
      } catch (error) {
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1a237e' }}>
        <BadgeIcon sx={{ fontSize: 35, mr: 2, verticalAlign: 'bottom' }} />
        Gestion des Ressources Humaines
      </Typography>

      {/* Action Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Rechercher (Nom, PPR)..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={loadEmployees}><SearchIcon /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type de Personnel</InputLabel>
              <Select
                value={filters.type}
                label="Type de Personnel"
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="PROF">Professeurs</MenuItem>
                <MenuItem value="Administratif">Administratifs</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={5} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              component="label"
              variant="outlined"
              color="success"
              startIcon={uploading ? <LinearProgress sx={{width: 20}} /> : <UploadIcon />}
              disabled={uploading}
            >
              {uploading ? '...' : 'Importer CSV'}
              <input type="file" hidden accept=".csv,.xlsx" onChange={handleFileUpload} />
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ bgcolor: '#1a237e' }}
            >
              Nouveau
            </Button>
            <Button variant="outlined" onClick={loadEmployees}>
              <RefreshIcon />
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Notification */}
      {notification.show && (
        <Alert severity={notification.type} sx={{ mb: 2 }}>
          {notification.message}
        </Alert>
      )}

      {/* Employees Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>PPR</strong></TableCell>
              <TableCell><strong>Nom Complet</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Grade</strong></TableCell>
              <TableCell><strong>Spécialité</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Département</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Aucun employé trouvé
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp.id} hover>
                  <TableCell>{emp.ppr || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {emp.nom} {emp.prenom}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={emp.type} 
                      size="small" 
                      color={emp.type === 'PROF' ? 'primary' : 'secondary'} 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{emp.grade || '-'}</TableCell>
                  <TableCell>{emp.specialite || '-'}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.departement || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleOpenDialog(emp)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(emp.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Modifier l\'Employé' : 'Ajouter un Nouvel Employé'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="PPR (Identifiant)"
                value={formData.ppr}
                onChange={(e) => setFormData({ ...formData, ppr: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="PROF">Professeur</MenuItem>
                  <MenuItem value="Administratif">Administratif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prénom"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Téléphone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Spécialité"
                value={formData.specialite}
                onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
              />
            </Grid>
             <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Diplôme"
                value={formData.diplome}
                onChange={(e) => setFormData({ ...formData, diplome: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Département"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de Recrutement"
                InputLabelProps={{ shrink: true }}
                value={formData.date_recrutement}
                onChange={(e) => setFormData({ ...formData, date_recrutement: e.target.value })}
              />
            </Grid>
             <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.status}
                  label="Statut"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="ACTIF">Actif</MenuItem>
                  <MenuItem value="CONGE">Congé</MenuItem>
                  <MenuItem value="RETRAITE">Retraité</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeManagement;