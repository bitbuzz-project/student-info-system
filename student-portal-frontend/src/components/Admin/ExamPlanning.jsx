import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Autocomplete, IconButton,
  Card, CardContent, Chip, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, CircularProgress, LinearProgress, Divider,
  ToggleButton, ToggleButtonGroup, Badge, Menu, MenuItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  Event as EventIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  MeetingRoom as MeetingRoomIcon,
  Settings as SettingsIcon,
  Balance as BalanceIcon,
  Class as ClassIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  CalendarMonth as CalendarIcon,
  List as ListIcon,
  Download as DownloadIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Assignment as AssignmentIcon,
  Today as TodayIcon,
  WarningAmber as WarningIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  CheckCircleOutline as SuccessIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';

// --- COMPONENT: STAT CARD ---
const StatCard = ({ title, value, icon, color, loading, subtitle, onClick }) => (
  <Card 
    sx={{ 
      height: '100%', 
      boxShadow: 2, 
      position: 'relative', 
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s',
      '&:hover': onClick ? { transform: 'scale(1.02)', boxShadow: 4 } : {}
    }}
    onClick={onClick}
  >
    <Box sx={{ 
        position: 'absolute', 
        top: -10, 
        right: -10, 
        width: 80, 
        height: 80, 
        borderRadius: '50%', 
        bgcolor: (theme) => theme.palette[color].light, 
        opacity: 0.2 
    }} />
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, '&:last-child': { pb: 2 } }}>
      <Box sx={{ zIndex: 1 }}>
        <Typography color="text.secondary" variant="subtitle2" fontWeight="bold">{title}</Typography>
        {loading ? (
          <CircularProgress size={20} sx={{ mt: 1 }} />
        ) : (
          <>
            <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </>
        )}
      </Box>
      <Box sx={{ 
        p: 1.5, 
        borderRadius: 3, 
        bgcolor: (theme) => theme.palette[color].light, 
        color: (theme) => theme.palette[color].contrastText || theme.palette[color].dark,
        opacity: 0.8,
        display: 'flex',
        zIndex: 1
      }}>
        {icon}
      </Box>
    </CardContent>
  </Card>
);


// --- IMPROVED COMPONENT: WEEKLY CALENDAR VIEW (with merged module cards) ---
const WeeklyCalendarView = ({ exams, onSelectExam }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const timeSlots = [
    '09h00→10h00', '10h00→11h00', '11h00→12h00', '12h00→13h00',
    '14h00→15h00', '15h00→16h00', '16h00→17h00'
  ];

  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const weekRangeDisplay = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' });
    const endMonth = end.toLocaleDateString('fr-FR', { month: 'long' });
    const year = start.getFullYear();
    
    if (startMonth === endMonth) {
      return `${start.getDate()} - ${end.getDate()} ${startMonth} ${year}`;
    } else {
      return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${year}`;
    }
  }, [weekDates]);

  // Group exams by module+date+time, then merge locations
  const getGroupedExamsForSlot = (date, timeSlot) => {
    const dateStr = date.toISOString().split('T')[0];
    const [startHour] = timeSlot.split('→')[0].replace('h', ':').split(':');
    
    const slotExams = exams.filter(exam => {
      const examDate = new Date(exam.exam_date).toISOString().split('T')[0];
      if (examDate !== dateStr) return false;
      const examHour = exam.start_time.split(':')[0];
      return examHour === startHour.padStart(2, '0');
    });

    // Group by module_code + group_name + start_time + end_time
    const grouped = {};
    slotExams.forEach(exam => {
      const key = `${exam.module_code}|${exam.group_name}|${exam.start_time}|${exam.end_time}`;
      if (!grouped[key]) {
        grouped[key] = {
          module_code: exam.module_code,
          module_name: exam.module_name,
          group_name: exam.group_name,
          start_time: exam.start_time,
          end_time: exam.end_time,
          exam_date: exam.exam_date,
          locations: [],
          exams: []
        };
      }
      grouped[key].locations.push({
        location: exam.location,
        assigned_count: exam.assigned_count,
        professor_name: exam.professor_name,
        id: exam.id
      });
      grouped[key].exams.push(exam);
    });

    return Object.values(grouped);
  };

  const getExamColor = (moduleCode) => {
    const colors = ['#E3F2FD', '#FFF3E0', '#F3E5F5', '#E8F5E9', '#FFF9C4', '#FCE4EC'];
    const hash = moduleCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <Box sx={{ width: '100%', overflow: 'auto' }}>
      {/* Header with Navigation */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 3,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1
      }}>
        <Button 
          startIcon={<ChevronLeftIcon />} 
          onClick={handlePrevWeek}
          variant="outlined"
          size="small"
        >
          Semaine précédente
        </Button>
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
            {weekRangeDisplay}
          </Typography>
          <Button 
            size="small" 
            onClick={handleToday}
            sx={{ mt: 0.5 }}
          >
            Aujourd'hui
          </Button>
        </Box>
        
        <Button 
          endIcon={<ChevronRightIcon />} 
          onClick={handleNextWeek}
          variant="outlined"
          size="small"
        >
          Semaine suivante
        </Button>
      </Box>

      {/* Calendar Grid */}
      <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  width: 120, 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  fontWeight: 'bold',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  borderRight: '2px solid white'
                }}
              >
                Horaires
              </TableCell>
              {weekDates.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <TableCell 
                    key={index}
                    align="center"
                    sx={{ 
                      bgcolor: isToday ? 'warning.light' : 'primary.main',
                      color: 'white',
                      fontWeight: 'bold',
                      minWidth: 150,
                      borderLeft: '1px solid white'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {weekDays[index]}
                      </Typography>
                      <Typography variant="caption">
                        {date.getDate()} {date.toLocaleDateString('fr-FR', { month: 'short' })}
                      </Typography>
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map((timeSlot, slotIndex) => (
              <TableRow key={slotIndex}>
                <TableCell 
                  sx={{ 
                    bgcolor: 'grey.100', 
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    borderRight: '2px solid #ddd'
                  }}
                >
                  {timeSlot}
                </TableCell>
                {weekDates.map((date, dayIndex) => {
                  const groupedExams = getGroupedExamsForSlot(date, timeSlot);
                  return (
                    <TableCell 
                      key={dayIndex}
                      sx={{ 
                        p: 0.5,
                        verticalAlign: 'top',
                        minHeight: 80,
                        borderLeft: '1px solid #ddd',
                        bgcolor: groupedExams.length > 0 ? '#fafafa' : 'white',
                        position: 'relative'
                      }}
                    >
                      {groupedExams.map((groupedExam, groupIndex) => {
                        const totalStudents = groupedExam.locations.reduce((sum, loc) => sum + (loc.assigned_count || 0), 0);
                        
                        return (
                          <Paper
                            key={groupIndex}
                            onClick={() => onSelectExam(groupedExam.exams[0])}
                            sx={{
                              p: 1,
                              mb: groupIndex < groupedExams.length - 1 ? 0.5 : 0,
                              cursor: 'pointer',
                              bgcolor: getExamColor(groupedExam.module_code),
                              border: '1px solid',
                              borderColor: 'divider',
                              transition: 'all 0.2s',
                              '&:hover': {
                                boxShadow: 3,
                                transform: 'translateY(-2px)',
                                zIndex: 10
                              }
                            }}
                          >
                            {/* Module Name */}
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                color: 'primary.dark',
                                mb: 0.5,
                                lineHeight: 1.2
                              }}
                            >
                              {groupedExam.module_name.length > 40 
                                ? groupedExam.module_name.substring(0, 40) + '...' 
                                : groupedExam.module_name}
                            </Typography>

                            {/* Group Info */}
                            {groupedExam.group_name && groupedExam.group_name !== 'Tous' && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: 'block',
                                  color: 'text.secondary',
                                  fontSize: '0.7rem',
                                  fontStyle: 'italic',
                                  mb: 0.5
                                }}
                              >
                                {groupedExam.group_name}
                              </Typography>
                            )}

                            {/* Time Range */}
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block',
                                color: 'error.main',
                                fontWeight: 'bold',
                                fontSize: '0.7rem',
                                mb: 0.5
                              }}
                            >
                              {groupedExam.start_time.substring(0, 5)} - {groupedExam.end_time.substring(0, 5)}
                            </Typography>

                            {/* Merged Locations */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                              {groupedExam.locations.map((loc, locIndex) => (
                                <Chip
                                  key={locIndex}
                                  label={loc.location}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    bgcolor: 'white',
                                    border: '1px solid',
                                    borderColor: 'primary.main'
                                  }}
                                />
                              ))}
                            </Box>

                            {/* Total Student Count */}
                            {totalStudents > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <PeopleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                                  {totalStudents} étudiant{totalStudents > 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            )}

                            {/* Room count indicator */}
                            {groupedExam.locations.length > 1 && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: 'block',
                                  fontSize: '0.6rem',
                                  color: 'info.main',
                                  fontStyle: 'italic',
                                  mt: 0.5
                                }}
                              >
                                {groupedExam.locations.length} salle{groupedExam.locations.length > 1 ? 's' : ''}
                              </Typography>
                            )}
                          </Paper>
                        );
                      })}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legend */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Légende:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            icon={<EventIcon />} 
            label="Cliquez sur un examen pour voir les détails" 
            size="small" 
            variant="outlined"
          />
          <Chip 
            icon={<PeopleIcon />} 
            label="Total étudiants (toutes salles)" 
            size="small" 
            color="success"
            variant="outlined"
          />
          <Chip 
            icon={<MeetingRoomIcon />} 
            label="Salles multiples affichées ensemble" 
            size="small" 
            color="info"
            variant="outlined"
          />
          <Chip 
            icon={<TodayIcon />} 
            label="Aujourd'hui" 
            size="small" 
            sx={{ bgcolor: 'warning.light' }}
          />
        </Box>
      </Box>
    </Box>
  );
};

const ExamPlanning = () => {
  const [exams, setExams] = useState([]);
  const [rawStats, setRawStats] = useState([]);
  const [locations, setLocations] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); 
  const [conflictCount, setConflictCount] = useState(0);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const openNotif = Boolean(anchorEl);

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
  const [conflictDialog, setConflictDialog] = useState({ open: false, conflicts: [], loading: false });
  const [newLoc, setNewLoc] = useState({ name: '', capacity: '', type: 'AMPHI' });

  // --- FETCH DATA ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [examsData, statsData, locsData, employeesData, conflicts] = await Promise.all([
        adminAPI.getExams(),
        adminAPI.getDetailedStats(),
        adminAPI.getLocations(),
        adminAPI.getEmployees({ type: 'PROF' }),
        adminAPI.getExamConflictsCount()
      ]);

      setExams(examsData);
      setRawStats(statsData);
      setConflictCount(conflicts);

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

  // --- FETCH NOTIFICATIONS ---
  const fetchNotifications = async () => {
    try {
      const data = await adminAPI.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => { 
    loadData(); 
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
    if (unreadCount > 0) {
      adminAPI.markNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  // --- NEW: HANDLE REFRESH PARTICIPANTS ---
  const handleRefreshParticipants = async () => {
    if(!confirm("Voulez-vous recalculer les listes d'étudiants pour tous les examens futurs ? Cette action mettra à jour les affectations en fonction des dernières données pédagogiques.")) return;
    
    setLoading(true);
    try {
      const result = await adminAPI.refreshExamParticipants();
      setSuccess(result.message);
      await loadData(); // Reload data to show new counts
    } catch (err) {
      setError("Erreur lors de l'actualisation des listes.");
    } finally {
      setLoading(false);
    }
  };
  
  const globalStats = useMemo(() => {
    const totalSessions = exams.length;
    const totalAssigned = exams.reduce((sum, e) => sum + (e.assigned_count || 0), 0);
    const uniqueModules = new Set(exams.map(e => e.module_code)).size;
    const uniqueDays = new Set(exams.map(e => {
        const d = new Date(e.exam_date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })).size;
    return { totalSessions, totalAssigned, uniqueModules, uniqueDays };
  }, [exams]);

  const handleShowConflicts = async () => {
    if (conflictCount === 0) return;
    setConflictDialog({ open: true, conflicts: [], loading: true });
    try {
      const data = await adminAPI.getExamConflictsDetails();
      setConflictDialog({ open: true, conflicts: data, loading: false });
    } catch (err) {
      console.error(err);
      setConflictDialog({ open: false, conflicts: [], loading: false });
      setError("Erreur chargement détails conflits");
    }
  };

  const handleExport = async () => {
    try {
      await adminAPI.exportExamAssignments();
      setSuccess("Exportation réussie !");
    } catch (err) {
      setError("Erreur lors de l'exportation.");
    }
  };

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

  const handleAutoDistribute = () => {
    if (!rangeStart || !rangeEnd) return;
    if (allGroupStudents.length === 0) { setError("Aucun étudiant à répartir."); return; }
    const idx1 = locations.findIndex(l => l.id === rangeStart.id);
    const idx2 = locations.findIndex(l => l.id === rangeEnd.id);
    if (idx1 === -1 || idx2 === -1) return;
    const start = Math.min(idx1, idx2);
    const end = Math.max(idx1, idx2);
    const locationSubset = locations.slice(start, end + 1);
    
    const totalCapacity = locationSubset.reduce((sum, loc) => sum + (parseInt(loc.capacity) || 0), 0);
    const totalStudents = allGroupStudents.length;
    const ratio = Math.min(totalStudents / totalCapacity, 1);
    let assignedSoFar = 0;
    const newSessions = [];
    locationSubset.forEach((loc, index) => {
        const cap = parseInt(loc.capacity) || 0;
        let count = Math.floor(cap * ratio); 
        assignedSoFar += count;
        newSessions.push({ id: Date.now() + index, location: loc, count: count, professor: '' });
    });
    let remainder = totalStudents - assignedSoFar;
    if (remainder > 0) {
        for (const session of newSessions) {
            if (remainder <= 0) break;
            const cap = parseInt(session.location.capacity) || 0;
            if (session.count < cap) { session.count++; remainder--; }
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
    setError(null); setSuccess(null);
    if (selectedModules.length === 0 || !commonDate || !commonStartTime || !commonEndTime || planningSessions.length === 0) {
      setError("Veuillez remplir tous les champs communs et ajouter au moins une session."); return;
    }
    if (commonStartTime >= commonEndTime) { setError("L'heure de fin doit être après l'heure de début."); return; }
    
    const currentSelectionNames = planningSessions.filter(s => s.location).map(s => s.location.name);
    const uniqueNames = new Set(currentSelectionNames);
    if (uniqueNames.size !== currentSelectionNames.length) {
      const duplicates = currentSelectionNames.filter((item, index) => currentSelectionNames.indexOf(item) !== index);
      setError(`ERREUR: Vous avez sélectionné plusieurs fois le même local : ${duplicates.join(', ')}`); return;
    }
    setLoading(true);
    try {
      let startIndex = 0;
      const mergedCode = selectedModules.map(m => m.cod_elp).join(' + ');
      const mergedName = selectedModules.map(m => m.lib_elp).join(' & ');
      const mergedGroups = selectedGroups.length > 0 ? selectedGroups.map(g => `${g.group_name}(${g.cod_elp})`).join(' + ') : 'Tous';
      for (const session of planningSessions) {
        if (!session.location || !session.count) continue;
        const count = parseInt(session.count);
        const sessionStudents = allGroupStudents.slice(startIndex, startIndex + count);
        const studentIds = sessionStudents.map(s => s.cod_etu);
        const payload = {
          module_code: mergedCode, module_name: mergedName, group_name: mergedGroups, exam_date: commonDate,
          start_time: commonStartTime, end_time: commonEndTime, location: session.location.name,
          professor_name: session.professor, student_ids: studentIds
        };
        await adminAPI.createExam(payload);
        startIndex += count;
      }
      setSuccess(`Planification réussie pour ${startIndex} étudiants !`);
      setSelectedModules([]); 
      setSelectedGroups([]); 
      setAllGroupStudents([]); 
      setPlanningSessions([]);
      loadData();
    } catch (err) {
      console.error(err); setError("Erreur lors de la planification.");
    } finally {
      setLoading(false);
    }
  };

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
                key: `${mod.cod_elp}-${item.group_name}`, group_name: item.group_name,
                cod_elp: mod.cod_elp, lib_elp: mod.lib_elp, label: `${item.group_name} (${mod.cod_elp})`
            });
        }
      });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [rawStats, selectedModules]);

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

  const handleExamClick = (exam) => {
    setStudentDialog({ open: true, students: [], loading: true, title: `${exam.module_name} (${exam.location})` });
    adminAPI.getExamStudents(exam.id).then(s => setStudentDialog(p => ({ ...p, students: s, loading: false })));
  };

  const handleSelectExam = (exam) => {
    handleExamClick(exam);
  };

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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <IconButton color="primary" onClick={handleNotificationClick}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={openNotif}
              onClose={handleNotificationClose}
              PaperProps={{ sx: { width: 400, maxHeight: 400 } }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Typography variant="subtitle1" sx={{ p: 2, fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                Notifications ({notifications.length})
              </Typography>
              {notifications.length === 0 ? (
                <MenuItem disabled>Aucune notification</MenuItem>
              ) : (
                notifications.map((notif) => (
                  <MenuItem key={notif.id} sx={{ whiteSpace: 'normal', borderBottom: '1px solid #f0f0f0', py: 1.5 }}>
                    <ListItemIcon>
                      {notif.type === 'INFO' && <InfoIcon color="info" fontSize="small" />}
                      {notif.type === 'WARNING' && <WarningIcon color="warning" fontSize="small" />}
                      {notif.type === 'SUCCESS' && <SuccessIcon color="success" fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="body2" fontWeight={!notif.is_read ? 'bold' : 'normal'}>
                          {notif.title}
                        </Typography>
                      } 
                      secondary={
                        <React.Fragment>
                          <Typography variant="caption" color="text.primary" component="span" sx={{ display: 'block' }}>
                            {notif.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notif.created_at).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </MenuItem>
                ))
              )}
            </Menu>

            <Button 
                startIcon={<SyncIcon />} 
                variant="outlined" 
                color="secondary" 
                onClick={handleRefreshParticipants}
            >
                Sync Listes
            </Button>

            <Button 
                startIcon={<DownloadIcon />} 
                variant="contained" 
                color="success" 
                onClick={handleExport}
            >
                Exporter (CSV)
            </Button>
            <Button startIcon={<SettingsIcon />} variant="outlined" onClick={() => setLocationDialog(true)}>
                Gérer les Locaux
            </Button>
        </Box>
      </Box>
      
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', mt: 2 }}>
        <AssignmentIcon color="action" /> Statistiques Globales
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
           <StatCard title="Total Sessions" value={globalStats.totalSessions} subtitle="Examens programmés" icon={<EventIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
           <StatCard title="Étudiants Planifiés" value={globalStats.totalAssigned} subtitle="Total convocations" icon={<PeopleIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
           <StatCard title="Modules Uniques" value={globalStats.uniqueModules} subtitle="Matières distinctes" icon={<ClassIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
           <StatCard title="Jours d'Examens" value={globalStats.uniqueDays} subtitle="Jours occupés" icon={<TodayIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
           <StatCard title="Conflits Horaire" value={conflictCount} subtitle="Étudiants en doublon (Cliquer)" icon={<WarningIcon />} color={conflictCount > 0 ? "error" : "success"} loading={loading} onClick={handleShowConflicts} />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: selectedModules.length > 0 ? 'block' : 'none', mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <AddIcon color="action" /> État de la Planification en cours
        </Typography>
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Étudiants (Sélection)" value={allGroupStudents.length} icon={<PeopleIcon />} color="primary" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Affectés (Sélection)" value={allocatedTotal} icon={<CheckCircleIcon />} color="success" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Non Affectés" value={remainingStudents} icon={<CancelIcon />} color={remainingStudents === 0 ? "success" : "warning"} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Sessions Créées" value={planningSessions.length} icon={<MeetingRoomIcon />} color="info" />
            </Grid>
        </Grid>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Grid container spacing={3}>
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
                    <LinearProgress variant="determinate" value={Math.min((allocatedTotal / allGroupStudents.length) * 100, 100)} color={remainingStudents < 0 ? 'error' : 'success'} />
                  </Paper>
                )}
                <TextField type="date" label="Date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField type="time" label="Début" value={commonStartTime} onChange={(e) => setCommonStartTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                  <TextField type="time" label="Fin" value={commonEndTime} onChange={(e) => setCommonEndTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" fullWidth />
                </Box>
                <Divider sx={{ my: 1 }}>Distribution Automatique</Divider>
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
                    <IconButton color="primary" onClick={handleAutoDistribute} disabled={!rangeStart || !rangeEnd}><BalanceIcon /></IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 'bold' }}>Répartition Détaillée</Typography>
                {planningSessions.map((session, index) => (
                  <Box key={session.id} sx={{ p: 1.5, border: '1px solid #ddd', borderRadius: 1, position: 'relative', mb: 1 }}>
                    <IconButton size="small" onClick={() => handleRemoveSession(session.id)} sx={{ position: 'absolute', right: 0, top: 0, color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
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
                        <TextField label="Effectif" type="number" size="small" value={session.count} onChange={(e) => handleUpdateSession(session.id, 'count', e.target.value)} fullWidth />
                      </Grid>
                      <Grid item xs={12}>
                        <Autocomplete options={professors} getOptionLabel={(opt) => `${opt.nom.toUpperCase()} ${opt.prenom}`} inputValue={session.professor} onInputChange={(e, val) => handleUpdateSession(session.id, 'professor', val)} renderInput={(params) => <TextField {...params} label="Surveillant" size="small" />} freeSolo />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleAddSession} disabled={remainingStudents <= 0}>Ajouter un Local</Button>
                <Button variant="contained" size="large" onClick={handleSubmitPlan} disabled={remainingStudents !== 0 || planningSessions.length === 0} sx={{ mt: 2 }}>Confirmer la Planification</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Planning</Typography>
                  <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)} size="small">
                      <ToggleButton value="calendar"><CalendarIcon sx={{ mr: 1 }}/> Calendrier</ToggleButton>
                      <ToggleButton value="list"><ListIcon sx={{ mr: 1 }}/> Liste</ToggleButton>
                  </ToggleButtonGroup>
              </Box>
              {viewMode === 'calendar' ? (
                <WeeklyCalendarView exams={exams} onSelectExam={handleSelectExam} />
              ) : (
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
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Aucun examen programmé.</TableCell></TableRow>
                        ) : (
                        sortedModuleNames.map(modName => (
                            <React.Fragment key={modName}>
                            <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                                <TableCell colSpan={5}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ClassIcon color="primary" fontSize="small" />
                                    <Typography variant="subtitle2" fontWeight="bold" color="primary.dark">{modName}</Typography>
                                </Box>
                                </TableCell>
                            </TableRow>
                            {groupedExams[modName].map((exam) => (
                                <TableRow key={exam.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{new Date(exam.exam_date).toLocaleDateString('fr-FR')}</Typography>
                                    <Typography variant="caption" color="text.secondary">{exam.start_time.slice(0,5)} - {exam.end_time.slice(0,5)}</Typography>
                                </TableCell>
                                <TableCell><Chip label={exam.group_name} size="small" sx={{ fontSize: '0.75rem', height: 24 }} /></TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MeetingRoomIcon fontSize="small" color="action" /><Typography variant="body2">{exam.location}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Voir liste d'émargement">
                                    <Button size="small" onClick={() => handleExamClick(exam)} sx={{ minWidth: 40, borderRadius: 4, bgcolor: '#f5f5f5', color: 'text.primary' }}>
                                        {exam.assigned_count || 0}
                                    </Button>
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" color="error" onClick={async () => {
                                    if(confirm('Supprimer cet examen ?')) { await adminAPI.deleteExam(exam.id); loadData(); }
                                    }}><DeleteIcon fontSize="small" /></IconButton>
                                </TableCell>
                                </TableRow>
                            ))}
                            </React.Fragment>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

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
            }}>Excel (Liste Seule)</Button>
            <Button onClick={() => setStudentDialog(prev => ({ ...prev, open: false }))}>Fermer</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={conflictDialog.open} onClose={() => setConflictDialog({ ...conflictDialog, open: false })} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
             <WarningIcon /> Détails des Conflits ({conflictDialog.conflicts.length})
          </DialogTitle>
          <DialogContent dividers>
             {conflictDialog.loading ? <CircularProgress /> : (
               <TableContainer sx={{ maxHeight: 500 }}>
                 <Table size="small" stickyHeader>
                   <TableHead>
                     <TableRow>
                       <TableCell><strong>Étudiant</strong></TableCell>
                       <TableCell><strong>Date</strong></TableCell>
                       <TableCell sx={{ bgcolor: '#fff3e0' }}><strong>Examen 1</strong></TableCell>
                       <TableCell sx={{ bgcolor: '#ffebee' }}><strong>Examen 2</strong></TableCell>
                     </TableRow>
                   </TableHead>
                   <TableBody>
                     {conflictDialog.conflicts.map((c, i) => (
                       <TableRow key={i} hover>
                         <TableCell>
                           <Typography variant="body2" fontWeight="bold">{c.nom} {c.prenom}</Typography>
                           <Typography variant="caption" color="text.secondary">{c.cod_etu}</Typography>
                         </TableCell>
                         <TableCell>{new Date(c.exam_date).toLocaleDateString()}</TableCell>
                         <TableCell sx={{ bgcolor: '#fff3e0' }}>
                           <Typography variant="body2">{c.module1}</Typography>
                           <Typography variant="caption">{c.start1.slice(0,5)} - {c.end1.slice(0,5)} ({c.loc1})</Typography>
                         </TableCell>
                         <TableCell sx={{ bgcolor: '#ffebee' }}>
                           <Typography variant="body2">{c.module2}</Typography>
                           <Typography variant="caption">{c.start2.slice(0,5)} - {c.end2.slice(0,5)} ({c.loc2})</Typography>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </TableContainer>
             )}
          </DialogContent>
          <DialogActions>
            <Button color="error" variant="outlined" onClick={() => {
               const csv = ["CNE,Nom,Prenom,Date,Module1,Horaire1,Lieu1,Module2,Horaire2,Lieu2", ...conflictDialog.conflicts.map(c => `${c.cod_etu},"${c.nom}","${c.prenom}",${new Date(c.exam_date).toLocaleDateString()},"${c.module1}","${c.start1}-${c.end1}","${c.loc1}","${c.module2}","${c.start2}-${c.end2}","${c.loc2}"`)].join('\n');
               const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
               link.download = "conflits_examens.csv"; document.body.appendChild(link); link.click();
            }}>Exporter Conflits</Button>
            <Button onClick={() => setConflictDialog({ ...conflictDialog, open: false })}>Fermer</Button>
          </DialogActions>
        </Dialog>

      </Grid>
    </Box>
  );
};

export default ExamPlanning;