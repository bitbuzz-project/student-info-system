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
  Balance as BalanceIcon,
  Block as BlockIcon,
  Class as ClassIcon,
  People as PeopleIcon,          // Restored
  CheckCircle as CheckCircleIcon, // Restored
  Cancel as CancelIcon           // Restored
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

// --- COMPONENT: STAT CARD ---
const StatCard = ({ title, value, icon, color, loading }) => (
  <Card sx={{ height: '100%', boxShadow: 2 }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, '&:last-child': { pb: 2 } }}>
      <Box>
        <Typography color="text.secondary" variant="subtitle2" fontWeight="bold">{title}</Typography>
        {loading ? (
          <CircularProgress size={20} sx={{ mt: 1 }} />
        ) : (
          <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>{value}</Typography>
        )}
      </Box>
      <Box sx={{ 
        p: 1.5, 
        borderRadius: 3, 
        bgcolor: (theme) => theme.palette[color].light, 
        color: (theme) => theme.palette[color].contrastText || theme.palette[color].dark,
        opacity: 0.8,
        display: 'flex'
      }}>
        {icon}
      </Box>
    </CardContent>
  </Card>
);

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

  // --- LOGIC: IDENTIFY OCCUPIED LOCATIONS ---
  const occupiedLocationNames = useMemo(() => {
    if (!commonDate || !commonStartTime || !commonEndTime) return [];
    
    return exams
      .filter(e => {
        const examDate = new Date(e.exam_date).toISOString().split('T')[0];
        if (examDate !== commonDate) return false;
        return e.start_time < commonEndTime && e.end_time > commonStartTime;
      })
      .map(e => e.location);
  }, [exams, commonDate, commonStartTime, commonEndTime]);

  // --- LOGIC: FETCH STUDENTS ---
  const handleSelectData = async (modules, groups) => {
    setSelectedModules(modules);
    setSelectedGroups(groups);
    setPlanningSessions([]); 
    
    if (modules && modules.length > 0) {
      setLoading(true);
      try {
        const requests = [];
        
        if (groups.length === 0) {
            const moduleCodes = modules.map(m => m.cod_elp).join(',');
            requests.push(adminAPI.getGroupStudents(moduleCodes, 'Tous'));
        } else {
            const moduleMap = new Map();
            groups.forEach(g => {
                if (!moduleMap.has(g.cod_elp)) moduleMap.set(g.cod_elp, []);
                moduleMap.get(g.cod_elp).push(g.group_name);
            });

            for (const [modCode, groupNames] of moduleMap.entries()) {
                if (groupNames.length > 0) {
                    requests.push(adminAPI.getGroupStudents(modCode, groupNames.join(',')));
                }
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

  // --- LOGIC: AUTO DISTRIBUTE ---
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
    
    const locationSubset = locations.slice(start, end + 1).filter(loc => 
      !occupiedLocationNames.includes(loc.name)
    );

    if (locationSubset.length === 0) {
      setError("Tous les locaux de cette plage sont occupés !");
      return;
    }

    const totalCapacity = locationSubset.reduce((sum, loc) => sum + (parseInt(loc.capacity) || 0), 0);
    const totalStudents = allGroupStudents.length;

    const ratio = Math.min(totalStudents / totalCapacity, 1);

    let assignedSoFar = 0;
    const newSessions = [];

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
    setSuccess(`Répartition automatique effectuée.`);
  };

  const handleAddSession = () => {
    setPlanningSessions([...planningSessions, { id: Date.now(), location: null, count: 0, professor: '' }]);
  };

  const handleUpdateSession = (id, field, value) => {
    setPlanningSessions(prev => prev.map(session => {
      if (session.id !== id) return session;
      const updated = { ...session, [field]: value };
      if (field === 'location' && value) {
        const allocatedOthers = prev.filter(s => s.id !== id).reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
        const remainingTotal = allGroupStudents.length - allocatedOthers;
        updated.count = Math.min(value.capacity, Math.max(0, remainingTotal));
      }
      return updated;
    }));
  };

  const handleRemoveSession = (id) => {
    setPlanningSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmitPlan = async () => {
    setError(null);
    setSuccess(null);

    if (selectedModules.length === 0 || !commonDate || !commonStartTime || !commonEndTime || planningSessions.length === 0) {
      setError("Veuillez remplir tous les champs communs et ajouter au moins une session.");
      return;
    }

    if (commonStartTime >= commonEndTime) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    const occupiedInDb = exams
    .filter(e => {
      const examDate = new Date(e.exam_date).toISOString().split('T')[0];
      if (examDate !== commonDate) return false;
      return e.start_time < commonEndTime && e.end_time > commonStartTime;
    })
    .map(e => e.location);

    const dbConflicts = planningSessions.filter(s => 
      s.location && occupiedInDb.includes(s.location.name)
    );

    if (dbConflicts.length > 0) {
      const names = dbConflicts.map(s => s.location.name).join(', ');
      setError(`ERREUR CRITIQUE: Les locaux suivants sont DÉJÀ occupés : ${names}`);
      return;
    }

    const currentSelectionNames = planningSessions.filter(s => s.location).map(s => s.location.name);
    const uniqueNames = new Set(currentSelectionNames);
    if (uniqueNames.size !== currentSelectionNames.length) {
      const duplicates = currentSelectionNames.filter((item, index) => currentSelectionNames.indexOf(item) !== index);
      setError(`ERREUR: Vous avez sélectionné plusieurs fois le même local : ${duplicates.join(', ')}`);
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

  // --- GROUPING LOGIC FOR LIST ---
  const groupedExams = useMemo(() => {
    const groups = {};
    exams.forEach(exam => {
      const key = exam.module_name || 'Autre';
      if (!groups[key]) groups[key] = [];
      groups[key].push(exam);
    });
    return groups;
  }, [exams]);

  const sortedModuleNames = useMemo(() => {
    return Object.keys(groupedExams).sort((a, b) => a.localeCompare(b));
  }, [groupedExams]);

  const allocatedTotal = planningSessions.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
  const remainingStudents = allGroupStudents.length - allocatedTotal;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EventIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" color="primary" fontWeight="600">Planning des Examens</Typography>
            <Typography variant="body2" color="text.secondary">Gestion des sessions, conflits & listes.</Typography>
          </Box>
        </Box>
        <Button startIcon={<SettingsIcon />} variant="outlined" onClick={() => setLocationDialog(true)}>
          Gérer les Locaux
        </Button>
      </Box>

      {/* STATS CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Étudiants" value={allGroupStudents.length} icon={<PeopleIcon />} color="primary" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Affectés" value={allocatedTotal} icon={<CheckCircleIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Non Affectés" value={remainingStudents} icon={<CancelIcon />} color={remainingStudents === 0 ? "success" : "warning"} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
           {/* Placeholder for future stat */}
           <StatCard title="Salles Occupées" value={occupiedLocationNames.length} icon={<MeetingRoomIcon />} color="info" />
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* --- LEFT: PLANNING WIZARD --- */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon color="primary" /> Nouvelle Planification
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                
                <Autocomplete
                  multiple
                  options={uniqueModules}
                  getOptionLabel={(opt) => `${opt.lib_elp} (${opt.cod_elp})`}
                  value={selectedModules}
                  onChange={(e, val) => handleSelectData(val, [])}
                  renderInput={(params) => <TextField {...params} label="1. Modules" size="small" />}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" label={option.cod_elp} size="small" {...getTagProps({ index })} />
                    ))
                  }
                />
                
                <Autocomplete
                  multiple
                  options={availableGroups}
                  isOptionEqualToValue={(option, value) => option.key === value.key}
                  getOptionLabel={(opt) => opt.label}
                  value={selectedGroups}
                  onChange={(e, val) => handleSelectData(selectedModules, val)}
                  disabled={selectedModules.length === 0}
                  renderInput={(params) => <TextField {...params} label="2. Groupes" size="small" />}
                />

                {allGroupStudents.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">Total Étudiants:</Typography>
                      <Typography variant="body2" fontWeight="bold">{allGroupStudents.length}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((allocatedTotal / allGroupStudents.length) * 100, 100)} 
                      color={remainingStudents < 0 ? 'error' : 'success'}
                    />
                  </Paper>
                )}

                <TextField type="date" label="Date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField type="time" label="Début" value={commonStartTime} onChange={(e) => setCommonStartTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                  <TextField type="time" label="Fin" value={commonEndTime} onChange={(e) => setCommonEndTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                </Box>
                
                {occupiedLocationNames.length > 0 && (
                   <Alert severity="warning" icon={<BlockIcon />} sx={{ mt: 0 }}>
                     <strong>Attention :</strong> {occupiedLocationNames.length} salles indisponibles.
                   </Alert>
                )}

                <Divider sx={{ my: 1 }}>Distribution Automatique</Divider>
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Autocomplete
                    options={locations}
                    getOptionLabel={(opt) => `${opt.name} ${occupiedLocationNames.includes(opt.name) ? '(Occupé)' : ''}`}
                    getOptionDisabled={(opt) => occupiedLocationNames.includes(opt.name)}
                    value={rangeStart}
                    onChange={(e, v) => setRangeStart(v)}
                    renderInput={(p) => <TextField {...p} label="De..." size="small" />}
                    sx={{ width: '40%' }}
                  />
                  <Typography variant="body2">-</Typography>
                  <Autocomplete
                    options={locations}
                    getOptionLabel={(opt) => `${opt.name} ${occupiedLocationNames.includes(opt.name) ? '(Occupé)' : ''}`}
                    getOptionDisabled={(opt) => occupiedLocationNames.includes(opt.name)}
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

                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 'bold' }}>Répartition Détaillée</Typography>
                {planningSessions.map((session, index) => (
                  <Box key={session.id} sx={{ p: 1.5, border: '1px solid #ddd', borderRadius: 1, position: 'relative', mb: 1 }}>
                    <IconButton size="small" onClick={() => handleRemoveSession(session.id)} sx={{ position: 'absolute', right: 0, top: 0, color: 'error.main' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Grid container spacing={2}>
                      <Grid item xs={7}>
                        <Autocomplete
                          options={locations}
                          getOptionLabel={(opt) => `${opt.name} (${opt.capacity}) ${occupiedLocationNames.includes(opt.name) ? '(Occupé)' : ''}`}
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

        {/* --- RIGHT: LIST VIEW (GROUPED) --- */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Liste des Examens</Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Groupe</strong></TableCell>
                      <TableCell><strong>Lieu</strong></TableCell>
                      <TableCell align="center"><strong>Eff.</strong></TableCell>
                      <TableCell align="center"><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedModuleNames.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                           Aucun examen programmé.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedModuleNames.map(modName => (
                        <React.Fragment key={modName}>
                          {/* En-tête du Module */}
                          <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                             <TableCell colSpan={5}>
                               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                 <ClassIcon color="primary" fontSize="small" />
                                 <Typography variant="subtitle2" fontWeight="bold" color="primary.dark">
                                   {modName}
                                 </Typography>
                               </Box>
                             </TableCell>
                          </TableRow>
                          
                          {/* Liste des Sessions pour ce Module */}
                          {groupedExams[modName].map((exam) => (
                            <TableRow key={exam.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">{new Date(exam.exam_date).toLocaleDateString('fr-FR')}</Typography>
                                <Typography variant="caption" color="text.secondary">{exam.start_time.slice(0,5)} - {exam.end_time.slice(0,5)}</Typography>
                              </TableCell>
                              <TableCell>
                                {/* On affiche uniquement le groupe car le module est dans le titre */}
                                <Chip label={exam.group_name} size="small" sx={{ fontSize: '0.75rem', height: 24 }} />
                              </TableCell>
                              <TableCell>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                   <MeetingRoomIcon fontSize="small" color="action" /> 
                                   <Typography variant="body2">{exam.location}</Typography>
                                 </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Voir liste d'émargement">
                                  <Button 
                                    size="small" 
                                    onClick={() => {
                                      setStudentDialog({ open: true, students: [], loading: true, title: `${exam.module_name} (${exam.location})` });
                                      adminAPI.getExamStudents(exam.id).then(s => setStudentDialog(p => ({ ...p, students: s, loading: false })));
                                    }}
                                    sx={{ minWidth: 40, borderRadius: 4, bgcolor: '#f5f5f5', color: 'text.primary' }}
                                  >
                                    {exam.assigned_count || 0}
                                  </Button>
                                </Tooltip>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton size="small" color="error" onClick={async () => {
                                   if(confirm('Supprimer cet examen ?')) { await adminAPI.deleteExam(exam.id); loadData(); }
                                }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    )}
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