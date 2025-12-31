import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Autocomplete, IconButton,
  Card, CardContent, Chip, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, CircularProgress, LinearProgress, Divider
} from '@mui/material';
import {
  Event as EventIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  MeetingRoom as MeetingRoomIcon,
  Settings as SettingsIcon,
  ViewWeek as RangeIcon,
  Balance as BalanceIcon
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

  // Planning State
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [allGroupStudents, setAllGroupStudents] = useState([]);
  const [planningSessions, setPlanningSessions] = useState([]);
  const [commonDate, setCommonDate] = useState('');
  const [commonStartTime, setCommonStartTime] = useState('');
  const [commonEndTime, setCommonEndTime] = useState('');

  // Range Distribution State
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);

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

      // --- FIX: NATURAL SORT FOR LOCATIONS (1, 2, ... 10 instead of 1, 10, 2) ---
      const sortedLocations = locsData.sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      setLocations(sortedLocations);
      
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

  // --- LOGIC: FETCH STUDENTS (PRECISE PAIRS) ---
  const handleSelectData = async (modules, groups) => {
    setSelectedModules(modules);
    setSelectedGroups(groups);
    setPlanningSessions([]); 
    
    if (modules && modules.length > 0) {
      if (groups.length === 0) {
        setAllGroupStudents([]);
        return;
      }

      setLoading(true);
      try {
        const requests = [];
        const moduleMap = new Map();

        // Group selections by Module Code
        groups.forEach(g => {
            if (!moduleMap.has(g.cod_elp)) {
                moduleMap.set(g.cod_elp, []);
            }
            moduleMap.get(g.cod_elp).push(g.group_name);
        });

        for (const [modCode, groupNames] of moduleMap.entries()) {
            if (groupNames.length > 0) {
                requests.push(adminAPI.getGroupStudents(modCode, groupNames.join(',')));
            }
        }

        if (requests.length === 0) {
            setAllGroupStudents([]);
            setLoading(false);
            return;
        }

        const results = await Promise.all(requests);
        const allStudents = results.flat();
        const uniqueStudents = Array.from(new Map(allStudents.map(s => [s.cod_etu, s])).values());
        
        uniqueStudents.sort((a, b) => a.lib_nom_pat_ind.localeCompare(b.lib_nom_pat_ind));
        setAllGroupStudents(uniqueStudents);

      } catch (err) {
        console.error(err);
        setError("Erreur récupération étudiants");
      } finally {
        setLoading(false);
      }
    } else {
      setAllGroupStudents([]);
    }
  };

  // --- LOGIC: BALANCED AUTO DISTRIBUTE ---
  const handleAutoDistribute = () => {
    if (!rangeStart || !rangeEnd) return;
    if (allGroupStudents.length === 0) {
      setError("Aucun étudiant à répartir.");
      return;
    }

    const idx1 = locations.findIndex(l => l.id === rangeStart.id);
    const idx2 = locations.findIndex(l => l.id === rangeEnd.id);

    if (idx1 === -1 || idx2 === -1) return;

    const start = Math.min(idx1, idx2);
    const end = Math.max(idx1, idx2);
    
    // Because locations are now sorted naturally, this slice is numerically correct
    const locationSubset = locations.slice(start, end + 1);

    const totalCapacity = locationSubset.reduce((sum, loc) => sum + (parseInt(loc.capacity) || 0), 0);
    const totalStudents = allGroupStudents.length;

    if (totalStudents > totalCapacity) {
        setError(`Capacité insuffisante ! (Besoin: ${totalStudents}, Dispo: ${totalCapacity}). Les locaux seront remplis à 100%.`);
    }

    const ratio = Math.min(totalStudents / totalCapacity, 1);

    let assignedSoFar = 0;
    const newSessions = [];

    // First Pass: Fill proportionally
    locationSubset.forEach((loc, index) => {
        const cap = parseInt(loc.capacity) || 0;
        let count = Math.floor(cap * ratio); 
        assignedSoFar += count;
        newSessions.push({
            id: Date.now() + index,
            location: loc,
            count: count,
            professor: ''
        });
    });

    // Second Pass: Distribute Remainder
    let remainder = totalStudents - assignedSoFar;
    if (remainder > 0) {
        for (const session of newSessions) {
            if (remainder <= 0) break;
            const cap = parseInt(session.location.capacity) || 0;
            if (session.count < cap) {
                session.count++;
                remainder--;
            }
        }
    }

    setPlanningSessions(newSessions.filter(s => s.count > 0));

    if (remainder > 0) {
        setError(`Répartition effectuée, mais il reste ${remainder} étudiants sans place.`);
    } else {
        setSuccess(`Répartition équilibrée (${(ratio * 100).toFixed(0)}%) effectuée.`);
    }
  };

  // --- MANUAL SESSION MGMT ---
  const handleAddSession = () => {
    const allocatedCount = planningSessions.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
    const remaining = allGroupStudents.length - allocatedCount;
    if (remaining <= 0) return;
    setPlanningSessions([...planningSessions, { id: Date.now(), location: null, count: 0, professor: '' }]);
  };

  const handleUpdateSession = (id, field, value) => {
    setPlanningSessions(prev => prev.map(session => {
      if (session.id !== id) return session;
      const updated = { ...session, [field]: value };
      
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

  // --- SUBMIT PLAN ---
  const handleSubmitPlan = async () => {
    if (selectedModules.length === 0 || !commonDate || !commonStartTime || !commonEndTime || planningSessions.length === 0) {
      setError("Veuillez remplir tous les champs communs et ajouter au moins une session.");
      return;
    }

    setLoading(true);
    try {
      let startIndex = 0;
      
      const mergedCode = selectedModules.map(m => m.cod_elp).join(' + ');
      const mergedName = selectedModules.map(m => m.lib_elp).join(' & ');
      
      const mergedGroups = selectedGroups.length > 0 
        ? selectedGroups.map(g => `${g.group_name}(${g.cod_elp})`).join(' + ') 
        : 'Tous';

      for (const session of planningSessions) {
        if (!session.location || !session.count) continue;

        const count = parseInt(session.count);
        const sessionStudents = allGroupStudents.slice(startIndex, startIndex + count);
        const studentIds = sessionStudents.map(s => s.cod_etu);

        const payload = {
          module_code: mergedCode,
          module_name: mergedName,
          group_name: mergedGroups,
          exam_date: commonDate,
          start_time: commonStartTime,
          end_time: commonEndTime,
          location: session.location.name,
          professor_name: session.professor,
          student_ids: studentIds
        };

        await adminAPI.createExam(payload);
        startIndex += count;
      }

      setSuccess(`Planification réussie pour ${startIndex} étudiants !`);
      
      setSelectedModules([]);
      setSelectedGroups([]);
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

  // --- UTILS ---
  const uniqueModules = useMemo(() => {
    const map = new Map();
    rawStats.forEach(item => {
      if (!map.has(item.cod_elp)) map.set(item.cod_elp, { cod_elp: item.cod_elp, lib_elp: item.lib_elp || item.cod_elp });
    });
    return Array.from(map.values()).sort((a, b) => a.lib_elp.localeCompare(b.lib_elp));
  }, [rawStats]);

  const availableGroups = useMemo(() => {
    if (selectedModules.length === 0) return [];
    
    const options = [];
    selectedModules.forEach(mod => {
      const modStats = rawStats.filter(item => item.cod_elp === mod.cod_elp);
      modStats.forEach(item => {
        if(item.group_name) {
            options.push({
                key: `${mod.cod_elp}-${item.group_name}`,
                group_name: item.group_name,
                cod_elp: mod.cod_elp,
                lib_elp: mod.lib_elp,
                label: `${item.group_name} (${mod.cod_elp})`
            });
        }
      });
    });
    
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [rawStats, selectedModules]);

  const allocatedTotal = planningSessions.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
  const remainingStudents = allGroupStudents.length - allocatedTotal;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EventIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" color="primary" fontWeight="600">Planning des Examens</Typography>
            <Typography variant="body2" color="text.secondary">Fusion Modules + Groupes & Répartition Équilibrée.</Typography>
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
                
                {/* 1. Modules */}
                <Autocomplete
                  multiple
                  options={uniqueModules}
                  getOptionLabel={(opt) => `${opt.lib_elp} (${opt.cod_elp})`}
                  value={selectedModules}
                  onChange={(e, val) => handleSelectData(val, [])}
                  renderInput={(params) => <TextField {...params} label="1. Modules (Fusion)" size="small" />}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" label={option.cod_elp} size="small" {...getTagProps({ index })} />
                    ))
                  }
                />
                
                {/* 2. Groups */}
                <Autocomplete
                  multiple
                  options={availableGroups}
                  isOptionEqualToValue={(option, value) => option.key === value.key}
                  getOptionLabel={(opt) => opt.label}
                  value={selectedGroups}
                  onChange={(e, val) => handleSelectData(selectedModules, val)}
                  disabled={selectedModules.length === 0}
                  renderInput={(params) => <TextField {...params} label="2. Groupes à Fusionner" size="small" placeholder="Sélectionner..." />}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option.label} size="small" {...getTagProps({ index })} />
                    ))
                  }
                />

                {/* 3. Stats */}
                {allGroupStudents.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">Total Étudiants (Fusionnés):</Typography>
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

                {/* 4. Common Time */}
                <TextField type="date" label="Date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField type="time" label="Début" value={commonStartTime} onChange={(e) => setCommonStartTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                  <TextField type="time" label="Fin" value={commonEndTime} onChange={(e) => setCommonEndTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                </Box>

                <Divider sx={{ my: 1 }}>Distribution Automatique</Divider>
                
                {/* 5. Range Auto-Distribution */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Autocomplete
                    options={locations}
                    getOptionLabel={(opt) => opt.name}
                    value={rangeStart}
                    onChange={(e, v) => setRangeStart(v)}
                    renderInput={(p) => <TextField {...p} label="De..." size="small" />}
                    sx={{ width: '40%' }}
                  />
                  <Typography variant="body2">-</Typography>
                  <Autocomplete
                    options={locations}
                    getOptionLabel={(opt) => opt.name}
                    value={rangeEnd}
                    onChange={(e, v) => setRangeEnd(v)}
                    renderInput={(p) => <TextField {...p} label="À..." size="small" />}
                    sx={{ width: '40%' }}
                  />
                  <Tooltip title="Répartition Équilibrée">
                    <IconButton color="primary" onClick={handleAutoDistribute} disabled={!rangeStart || !rangeEnd}>
                       <BalanceIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* 6. Sessions List */}
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 'bold' }}>Répartition Détaillée</Typography>
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

                <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleAddSession} disabled={remainingStudents <= 0}>
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
                          <Typography variant="body2" sx={{maxWidth: 200, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={exam.module_name}>
                             {exam.module_name}
                          </Typography>
                          <Chip label={exam.group_name} size="small" sx={{ fontSize: '0.7rem' }} />
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
                              onClick={() => {
                                setStudentDialog({ open: true, students: [], loading: true, title: `${exam.module_name} (${exam.location})` });
                                adminAPI.getExamStudents(exam.id).then(s => setStudentDialog(p => ({ ...p, students: s, loading: false })));
                              }}
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

        {/* --- DIALOGS --- */}
        <Dialog open={locationDialog} onClose={() => setLocationDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Gestion des Locaux</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
              <TextField label="Nom (ex: Amphi 1)" size="small" value={newLoc.name} onChange={(e)=>setNewLoc({...newLoc, name:e.target.value})} fullWidth />
              <TextField label="Capacité" type="number" size="small" value={newLoc.capacity} onChange={(e)=>setNewLoc({...newLoc, capacity:e.target.value})} sx={{ width: 100 }} />
              <Button variant="contained" onClick={async () => {
                   if(!newLoc.name || !newLoc.capacity) return;
                   await adminAPI.addLocation(newLoc);
                   const locs = await adminAPI.getLocations();
                   setLocations(locs.sort((a,b)=>a.name.localeCompare(b.name, undefined, {numeric:true, sensitivity:'base'})));
                   setNewLoc({ name: '', capacity: '', type: 'AMPHI' });
              }}>Ajouter</Button>
            </Box>
            <Table size="small">
              <TableHead><TableRow><TableCell>Nom</TableCell><TableCell>Capacité</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
              <TableBody>
                {locations.map(loc => (
                  <TableRow key={loc.id}>
                    <TableCell>{loc.name}</TableCell>
                    <TableCell>{loc.capacity}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={async () => {
                          if(confirm('Supprimer ?')) {
                              await adminAPI.deleteLocation(loc.id);
                              setLocations(prev => prev.filter(l => l.id !== loc.id));
                          }
                      }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions><Button onClick={() => setLocationDialog(false)}>Fermer</Button></DialogActions>
        </Dialog>

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
      </Grid>
    </Box>
  );
};

export default ExamPlanning;