import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Autocomplete, IconButton,
  Card, CardContent, Chip, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, CircularProgress, LinearProgress
} from '@mui/material';
import {
  Event as EventIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Class as ClassIcon,
  Groups as GroupsIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  MeetingRoom as MeetingRoomIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

const ExamPlanning = () => {
  // --- STATE ---
  const [exams, setExams] = useState([]);
  const [rawStats, setRawStats] = useState([]);
  const [locations, setLocations] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Split Planning State
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [allGroupStudents, setAllGroupStudents] = useState([]);
  const [planningSessions, setPlanningSessions] = useState([]);
  const [commonDate, setCommonDate] = useState('');
  const [commonStartTime, setCommonStartTime] = useState('');
  const [commonEndTime, setCommonEndTime] = useState('');

  // Dialogs
  const [locationDialog, setLocationDialog] = useState(false);
  const [studentDialog, setStudentDialog] = useState({ open: false, students: [], title: '', loading: false });
  const [newLoc, setNewLoc] = useState({ name: '', capacity: '', type: 'AMPHI' });

  // --- FETCH DATA ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [examsData, statsData, locsData, employeesData] = await Promise.all([
        adminAPI.getExams(),
        adminAPI.getDetailedStats(),
        adminAPI.getLocations(),
        adminAPI.getEmployees({ type: 'PROF' })
      ]);

      setExams(examsData);
      setRawStats(statsData);
      setLocations(locsData);
      
      const profs = employeesData.filter(e => 
        (e.type && e.type.toUpperCase() === 'PROF') || 
        (e.grade && e.grade.toLowerCase().includes('prof'))
      );
      setProfessors(profs);

    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- LOGIC: FETCH STUDENTS FOR SPLITTING ---
  const handleSelectGroup = async (module, groupName) => {
    setSelectedModule(module);
    setSelectedGroup(groupName);
    setPlanningSessions([]); // Reset sessions
    
    if (module) {
      setLoading(true);
      try {
        const students = await adminAPI.getGroupStudents(module.cod_elp, groupName);
        setAllGroupStudents(students);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      setAllGroupStudents([]);
    }
  };

  // --- LOGIC: ADD SESSION (SPLIT) ---
  const handleAddSession = () => {
    const allocatedCount = planningSessions.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
    const remaining = allGroupStudents.length - allocatedCount;
    
    if (remaining <= 0) return;

    setPlanningSessions([
      ...planningSessions, 
      { 
        id: Date.now(), 
        location: null, 
        count: 0, // Will be auto-set on location select
        professor: '' 
      }
    ]);
  };

  const handleUpdateSession = (id, field, value) => {
    setPlanningSessions(prev => prev.map(session => {
      if (session.id !== id) return session;

      const updated = { ...session, [field]: value };
      
      // Auto-calc count based on capacity if location changes
      if (field === 'location' && value) {
        const allocatedOthers = prev.filter(s => s.id !== id).reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
        const remainingTotal = allGroupStudents.length - allocatedOthers;
        updated.count = Math.min(value.capacity, remainingTotal);
      }
      return updated;
    }));
  };

  const handleRemoveSession = (id) => {
    setPlanningSessions(prev => prev.filter(s => s.id !== id));
  };

  // --- SUBMIT SPLIT PLAN ---
  const handleSubmitPlan = async () => {
    if (!selectedModule || !commonDate || !commonStartTime || !commonEndTime || planningSessions.length === 0) {
      setError("Veuillez remplir tous les champs communs et ajouter au moins une session.");
      return;
    }

    setLoading(true);
    try {
      let startIndex = 0;
      
      for (const session of planningSessions) {
        if (!session.location || !session.count) continue;

        const count = parseInt(session.count);
        // Slice the specific students for this room
        const sessionStudents = allGroupStudents.slice(startIndex, startIndex + count);
        const studentIds = sessionStudents.map(s => s.cod_etu);

        const payload = {
          module_code: selectedModule.cod_elp,
          module_name: selectedModule.lib_elp,
          group_name: selectedGroup || 'Tous',
          exam_date: commonDate,
          start_time: commonStartTime,
          end_time: commonEndTime,
          location: session.location.name,
          professor_name: session.professor,
          student_ids: studentIds // Send explicit list
        };

        await adminAPI.createExam(payload);
        startIndex += count;
      }

      setSuccess(`Planification réussie pour ${startIndex} étudiants !`);
      // Reset Form
      setSelectedModule(null);
      setSelectedGroup(null);
      setAllGroupStudents([]);
      setPlanningSessions([]);
      setCommonDate('');
      setCommonStartTime('');
      setCommonEndTime('');
      loadData();

    } catch (err) {
      console.error(err);
      setError("Erreur lors de la planification.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOCATION MANAGEMENT ---
  const handleAddLocation = async () => {
    if(!newLoc.name || !newLoc.capacity) return;
    try {
      await adminAPI.addLocation(newLoc);
      const locs = await adminAPI.getLocations();
      setLocations(locs);
      setNewLoc({ name: '', capacity: '', type: 'AMPHI' });
    } catch(err) { alert('Erreur ajout local'); }
  };
  
  const handleDeleteLocation = async (id) => {
    if(window.confirm('Supprimer ce local ?')) {
      await adminAPI.deleteLocation(id);
      setLocations(prev => prev.filter(l => l.id !== id));
    }
  };

  // --- VIEW DETAILS ---
  const handleViewStudents = async (exam) => {
    setStudentDialog({ open: true, students: [], loading: true, title: `${exam.module_name} (${exam.location})` });
    try {
      const students = await adminAPI.getExamStudents(exam.id); // Use new specific route
      setStudentDialog(prev => ({ ...prev, students, loading: false }));
    } catch (err) { setStudentDialog(prev => ({ ...prev, loading: false })); }
  };

  // --- CALCULATIONS ---
  const uniqueModules = useMemo(() => {
    const map = new Map();
    rawStats.forEach(item => {
      if (!map.has(item.cod_elp)) map.set(item.cod_elp, { cod_elp: item.cod_elp, lib_elp: item.lib_elp || item.cod_elp });
    });
    return Array.from(map.values()).sort((a, b) => a.lib_elp.localeCompare(b.lib_elp));
  }, [rawStats]);

  const availableGroups = useMemo(() => {
    if (!selectedModule) return [];
    return rawStats.filter(item => item.cod_elp === selectedModule.cod_elp).map(item => item.group_name).sort();
  }, [rawStats, selectedModule]);

  const allocatedTotal = planningSessions.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
  const remainingStudents = allGroupStudents.length - allocatedTotal;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EventIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" color="primary" fontWeight="600">Planning des Examens</Typography>
            <Typography variant="body2" color="text.secondary">Répartition multi-locaux avec gestion de capacité.</Typography>
          </Box>
        </Box>
        <Button startIcon={<SettingsIcon />} variant="outlined" onClick={() => setLocationDialog(true)}>
          Gérer les Locaux
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* --- PLANNING WIZARD --- */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon color="primary" /> Nouvelle Planification
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {/* 1. Selection */}
                <Autocomplete
                  options={uniqueModules}
                  getOptionLabel={(opt) => `${opt.lib_elp} (${opt.cod_elp})`}
                  value={selectedModule}
                  onChange={(e, val) => handleSelectGroup(val, null)}
                  renderInput={(params) => <TextField {...params} label="Élément / Module" size="small" />}
                />
                <Autocomplete
                  options={availableGroups}
                  value={selectedGroup}
                  onChange={(e, val) => handleSelectGroup(selectedModule, val)}
                  disabled={!selectedModule}
                  renderInput={(params) => <TextField {...params} label="Groupe" size="small" placeholder={!selectedModule ? "..." : "Tous"} />}
                />

                {/* 2. Stats Display */}
                {allGroupStudents.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">Total Étudiants:</Typography>
                      <Typography variant="body2" fontWeight="bold">{allGroupStudents.length}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color={remainingStudents < 0 ? 'error' : 'text.secondary'}>Restant à placer:</Typography>
                      <Typography variant="body2" fontWeight="bold" color={remainingStudents < 0 ? 'error' : 'primary'}>{remainingStudents}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((allocatedTotal / allGroupStudents.length) * 100, 100)} 
                      color={remainingStudents < 0 ? 'error' : 'success'}
                    />
                  </Paper>
                )}

                {/* 3. Common Time */}
                <TextField type="date" label="Date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField type="time" label="Début" value={commonStartTime} onChange={(e) => setCommonStartTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                  <TextField type="time" label="Fin" value={commonEndTime} onChange={(e) => setCommonEndTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                </Box>

                {/* 4. Split Sessions */}
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 'bold' }}>Locaux & Répartition</Typography>
                {planningSessions.map((session, index) => (
                  <Box key={session.id} sx={{ p: 1.5, border: '1px solid #ddd', borderRadius: 1, position: 'relative' }}>
                    <IconButton size="small" onClick={() => handleRemoveSession(session.id)} sx={{ position: 'absolute', right: 0, top: 0, color: 'error.main' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Grid container spacing={2}>
                      <Grid item xs={7}>
                        <Autocomplete
                          options={locations}
                          getOptionLabel={(opt) => `${opt.name} (${opt.capacity})`}
                          value={session.location}
                          onChange={(e, val) => handleUpdateSession(session.id, 'location', val)}
                          renderInput={(params) => <TextField {...params} label={`Local ${index + 1}`} size="small" />}
                        />
                      </Grid>
                      <Grid item xs={5}>
                        <TextField 
                          label="Effectif" 
                          type="number" 
                          size="small" 
                          value={session.count} 
                          onChange={(e) => handleUpdateSession(session.id, 'count', e.target.value)}
                          fullWidth 
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Autocomplete
                           options={professors}
                           getOptionLabel={(opt) => `${opt.nom.toUpperCase()} ${opt.prenom}`}
                           inputValue={session.professor}
                           onInputChange={(e, val) => handleUpdateSession(session.id, 'professor', val)}
                           renderInput={(params) => <TextField {...params} label="Surveillant" size="small" />}
                           freeSolo
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ))}

                <Button 
                  startIcon={<AddIcon />} 
                  variant="outlined" 
                  size="small" 
                  onClick={handleAddSession}
                  disabled={remainingStudents <= 0}
                >
                  Ajouter un Local
                </Button>

                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={handleSubmitPlan}
                  disabled={remainingStudents !== 0 || planningSessions.length === 0}
                  sx={{ mt: 2 }}
                >
                  Confirmer la Planification
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* --- LIST VIEW --- */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Examens Programmés</Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Module</strong></TableCell>
                      <TableCell><strong>Lieu</strong></TableCell>
                      <TableCell align="center"><strong>Effectif</strong></TableCell>
                      <TableCell align="center"><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{new Date(exam.exam_date).toLocaleDateString('fr-FR')}</Typography>
                          <Typography variant="caption" color="text.secondary">{exam.start_time.slice(0,5)} - {exam.end_time.slice(0,5)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{exam.module_name}</Typography>
                          <Chip label={exam.group_name === 'Tous' ? 'Tout' : exam.group_name} size="small" sx={{ fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell>
                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                             <MeetingRoomIcon fontSize="small" color="action" /> {exam.location}
                           </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Voir la liste exacte">
                            <Button 
                              size="small" 
                              onClick={() => handleViewStudents(exam)}
                              sx={{ borderRadius: 5, minWidth: 40 }}
                              variant="soft"
                            >
                              {exam.assigned_count || 0}
                            </Button>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={async () => {
                             if(confirm('Supprimer ?')) { await adminAPI.deleteExam(exam.id); loadData(); }
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* --- LOCATION MANAGER DIALOG --- */}
      <Dialog open={locationDialog} onClose={() => setLocationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gestion des Locaux</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
            <TextField label="Nom (ex: Amphi 1)" size="small" value={newLoc.name} onChange={(e)=>setNewLoc({...newLoc, name:e.target.value})} fullWidth />
            <TextField label="Capacité" type="number" size="small" value={newLoc.capacity} onChange={(e)=>setNewLoc({...newLoc, capacity:e.target.value})} sx={{ width: 100 }} />
            <Button variant="contained" onClick={handleAddLocation}>Ajouter</Button>
          </Box>
          <Table size="small">
            <TableHead><TableRow><TableCell>Nom</TableCell><TableCell>Capacité</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
            <TableBody>
              {locations.map(loc => (
                <TableRow key={loc.id}>
                  <TableCell>{loc.name}</TableCell>
                  <TableCell>{loc.capacity}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => handleDeleteLocation(loc.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={() => setLocationDialog(false)}>Fermer</Button></DialogActions>
      </Dialog>

      {/* --- STUDENT LIST DIALOG --- */}
      <Dialog open={studentDialog.open} onClose={() => setStudentDialog(prev => ({ ...prev, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle>Liste d'émargement: {studentDialog.title}</DialogTitle>
        <DialogContent dividers>
           {studentDialog.loading ? <CircularProgress /> : (
             <TableContainer sx={{ maxHeight: 400 }}>
               <Table size="small" stickyHeader>
                 <TableHead>
                   <TableRow>
                     <TableCell>CNE</TableCell><TableCell>Nom</TableCell><TableCell>Prénom</TableCell><TableCell>Signature</TableCell>
                   </TableRow>
                 </TableHead>
                 <TableBody>
                   {studentDialog.students.map(s => (
                     <TableRow key={s.cod_etu}>
                       <TableCell>{s.cod_etu}</TableCell>
                       <TableCell>{s.lib_nom_pat_ind}</TableCell>
                       <TableCell>{s.lib_pr1_ind}</TableCell>
                       <TableCell sx={{ borderBottom:'1px solid #eee' }}></TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </TableContainer>
           )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
             const csv = ["CNE,Nom,Prenom", ...studentDialog.students.map(s => `${s.cod_etu},"${s.lib_nom_pat_ind}","${s.lib_pr1_ind}"`)].join('\n');
             const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
             link.download = "liste.csv"; document.body.appendChild(link); link.click();
          }}>Excel</Button>
          <Button onClick={() => setStudentDialog(prev => ({ ...prev, open: false }))}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamPlanning;