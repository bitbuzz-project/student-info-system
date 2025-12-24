import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Groups as GroupsIcon } from '@mui/icons-material';
import axios from 'axios';

const GroupManagement = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    module_pattern: '',
    group_name: '',
    range_start: '',
    range_end: ''
  });
  const [error, setError] = useState(null);

  // Use the configured axios instance or fetch directly with token
  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  const fetchRules = async () => {
    try {
      const res = await axios.get('/api/admin/groups/rules', getAuthHeader());
      setRules(res.data);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      try {
        await axios.delete(`/api/admin/groups/rules/${id}`, getAuthHeader());
        fetchRules();
      } catch (err) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post('/api/admin/groups/rules', formData, getAuthHeader());
      setOpen(false);
      setFormData({ module_pattern: '', group_name: '', range_start: '', range_end: '' });
      fetchRules();
    } catch (err) {
      alert('Erreur lors de la création de la règle');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" color="primary" fontWeight="600">
            Gestion des Groupes
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Nouvelle Règle
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Pattern Module</strong> (ex: JLAP1%)</TableCell>
              <TableCell><strong>Nom du Groupe</strong></TableCell>
              <TableCell><strong>Début Nom</strong> (ex: A)</TableCell>
              <TableCell><strong>Fin Nom</strong> (ex: BEL)</TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell sx={{ fontFamily: 'monospace' }}>{rule.module_pattern}</TableCell>
                <TableCell>{rule.group_name}</TableCell>
                <TableCell>{rule.range_start}</TableCell>
                <TableCell>{rule.range_end}</TableCell>
                <TableCell align="center">
                  <IconButton color="error" onClick={() => handleDelete(rule.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  Aucune règle de groupe définie.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Ajouter une règle de groupe</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
            <TextField
              label="Pattern Module (ex: JLAP1%)"
              fullWidth
              value={formData.module_pattern}
              onChange={(e) => setFormData({ ...formData, module_pattern: e.target.value })}
              helperText="Utilisez % pour faire correspondre plusieurs caractères"
            />
            <TextField
              label="Nom du Groupe (ex: Groupe 1)"
              fullWidth
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Début Nom (ex: A)"
                fullWidth
                value={formData.range_start}
                onChange={(e) => setFormData({ ...formData, range_start: e.target.value })}
              />
              <TextField
                label="Fin Nom (ex: BEL)"
                fullWidth
                value={formData.range_end}
                onChange={(e) => setFormData({ ...formData, range_end: e.target.value })}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Exemple: "A" à "BEL" inclura tous les étudiants dont le nom de famille commence par A jusqu'à ceux commençant par BEL inclus.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit}>Ajouter</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupManagement;