/*
type: uploaded file
fileName: bitbuzz-project/student-info-system/student-info-system-b858bf5862393e4426ceab7c444160e120be74d4/student-portal-frontend/src/components/Admin/GroupManagement.jsx
fullContent:
*/
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  InputAdornment, Chip, Tooltip, Card, Accordion, AccordionSummary, AccordionDetails,
  Pagination, Grid, ToggleButton, ToggleButtonGroup, LinearProgress, CardContent, Collapse
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Add as AddIcon, 
  Groups as GroupsIcon, 
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  ArrowRightAlt as ArrowIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  BarChart as BarChartIcon,
  List as ListIcon,
  TrendingUp as TrendingUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
import axios from 'axios';

const GroupManagement = () => {
  // --- STATE ---
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'stats'
  
  // Stats Details State
  const [expandedStats, setExpandedStats] = useState(null); // pattern string
  const [statsBreakdown, setStatsBreakdown] = useState({}); // { pattern: [{cod_elp:..., count:...}] }
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // Pagination for Groups (Modules)
  const [page, setPage] = useState(1);
  const GROUPS_PER_PAGE = 5;

  // Dialogs
  const [open, setOpen] = useState(false); // Add Rule Dialog
  const [viewDialog, setViewDialog] = useState(false); // View Students Dialog
  
  // Data for Dialogs
  const [formData, setFormData] = useState({
    module_pattern: '',
    group_name: '',
    range_start: '',
    range_end: ''
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedRuleTitle, setSelectedRuleTitle] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [error, setError] = useState(null);

  // --- API CONFIG ---
  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  // --- FETCH DATA ---
  const fetchRules = async () => {
    setLoading(true);
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

  // --- HANDLERS ---
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

  const handleViewStudents = async (rule) => {
    setSelectedRuleTitle(`${rule.group_name} (${rule.module_pattern})`);
    setLoadingStudents(true);
    setViewDialog(true);
    setSelectedStudents([]); 
    setStudentSearchTerm('');
    
    try {
      const res = await axios.get(`/api/admin/groups/rules/${rule.id}/students`, getAuthHeader());
      setSelectedStudents(res.data);
    } catch (err) {
      console.error(err);
      alert('Impossible de charger la liste des étudiants.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleExpandStats = async (pattern) => {
    if (expandedStats === pattern) {
      setExpandedStats(null); // Collapse
      return;
    }

    setExpandedStats(pattern);
    
    // Fetch if not already cached
    if (!statsBreakdown[pattern]) {
      setLoadingBreakdown(true);
      try {
        const res = await axios.get(`/api/admin/groups/stats/breakdown?pattern=${encodeURIComponent(pattern)}`, getAuthHeader());
        setStatsBreakdown(prev => ({ ...prev, [pattern]: res.data }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBreakdown(false);
      }
    }
  };

  // --- EXPORT FUNCTIONS ---

  const handleExportExcel = () => {
    if (selectedStudents.length === 0) return;

    // Excel CSV Header with Separator
    const separator = 'sep=,';
    const headers = ["CNE", "Nom", "Prénom", "Filière"];
    
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(s => 
        [
            s.cod_etu, 
            `"${s.lib_nom_pat_ind}"`, 
            `"${s.lib_pr1_ind}"`, 
            `"${s.lib_etp}"`
        ].join(',')
      )
    ].join('\n');

    // Add BOM (Byte Order Mark) \uFEFF so Excel recognizes UTF-8 (Arabic/French chars)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    // Use .csv extension, Excel opens it by default
    link.setAttribute("download", `${selectedRuleTitle}_etudiants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGlobalStatsExport = async () => {
    try {
      const res = await axios.get('/api/admin/groups/stats/full-export', getAuthHeader());
      const data = res.data;

      if (!data || data.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
      }

      const headers = ["Pattern Module", "Code Module", "Nom Module", "Groupe", "Nombre Étudiants"];
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          [
            `"${row.module_pattern}"`,
            `"${row.cod_elp}"`,
            `"${row.lib_elp || ''}"`,
            `"${row.group_name}"`,
            row.student_count
          ].join(',')
        )
      ].join('\n');

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `statistiques_groupes_globales_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export error", error);
      alert("Erreur lors de l'exportation des statistiques globales.");
    }
  };

  // --- LOGIC & MEMOIZATION ---
  
  const filteredRules = useMemo(() => {
    return rules.filter(rule => 
      rule.module_pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.group_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rules, searchTerm]);

  const groupedRules = useMemo(() => {
    const groups = {};
    filteredRules.forEach(rule => {
      if (!groups[rule.module_pattern]) {
        groups[rule.module_pattern] = [];
      }
      groups[rule.module_pattern].push(rule);
    });
    return groups;
  }, [filteredRules]);

  const statsData = useMemo(() => {
    const moduleStats = Object.keys(groupedRules).map(pattern => {
        const moduleRules = groupedRules[pattern];
        const studentCount = moduleRules.reduce((acc, r) => acc + parseInt(r.student_count || 0), 0);
        return {
            pattern,
            groups: moduleRules.length,
            students: studentCount
        };
    }).sort((a, b) => b.students - a.students);

    const totalStudents = moduleStats.reduce((acc, m) => acc + m.students, 0);
    const maxStudents = moduleStats.length > 0 ? moduleStats[0].students : 0;

    return {
        moduleStats,
        totalModules: moduleStats.length,
        totalGroups: rules.length,
        totalStudents,
        maxStudents
    };
  }, [groupedRules, rules]);

  // Pagination (List View)
  const sortedModulePatterns = useMemo(() => Object.keys(groupedRules).sort(), [groupedRules]);
  const totalPages = Math.ceil(sortedModulePatterns.length / GROUPS_PER_PAGE);
  const currentModulePatterns = sortedModulePatterns.slice(
    (page - 1) * GROUPS_PER_PAGE,
    page * GROUPS_PER_PAGE
  );

  const filteredStudents = selectedStudents.filter(s => 
    s.lib_nom_pat_ind.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    s.lib_pr1_ind.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    s.cod_etu.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  return (
    <Box>
      {/* --- HEADER --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ClassIcon sx={{ fontSize: 36, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" color="primary" fontWeight="600">
              Répartition Pédagogique
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestion des groupes de TD/TP et statistiques.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => { if (newMode) setViewMode(newMode); }}
                size="small"
                sx={{ bgcolor: 'background.paper' }}
            >
                <ToggleButton value="list">
                    <ListIcon sx={{ mr: 1 }} /> Liste
                </ToggleButton>
                <ToggleButton value="stats">
                    <BarChartIcon sx={{ mr: 1 }} /> Statistiques
                </ToggleButton>
            </ToggleButtonGroup>

            <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => setOpen(true)}
                sx={{ borderRadius: 2, boxShadow: 3 }}
            >
                Nouvelle Règle
            </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* --- STATS DASHBOARD (VISIBLE IN 'STATS' MODE) --- */}
      {viewMode === 'stats' && (
          <Box sx={{ mb: 4, animate: 'fade-in' }}>
              {/* KPI CARDS */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                          <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                      <Typography variant="overline" sx={{ opacity: 0.8 }}>Modules Configurés</Typography>
                                      <Typography variant="h3" fontWeight="bold">{statsData.totalModules}</Typography>
                                  </Box>
                                  <SchoolIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                              </Box>
                          </CardContent>
                      </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: '#2e7d32', color: 'white', borderRadius: 2 }}>
                          <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                      <Typography variant="overline" sx={{ opacity: 0.8 }}>Total Groupes</Typography>
                                      <Typography variant="h3" fontWeight="bold">{statsData.totalGroups}</Typography>
                                  </Box>
                                  <ClassIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                              </Box>
                          </CardContent>
                      </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: '#ed6c02', color: 'white', borderRadius: 2 }}>
                          <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                      <Typography variant="overline" sx={{ opacity: 0.8 }}>Total Affectations</Typography>
                                      <Typography variant="h3" fontWeight="bold">{statsData.totalStudents}</Typography>
                                  </Box>
                                  <GroupsIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                              </Box>
                          </CardContent>
                      </Card>
                  </Grid>
              </Grid>

              {/* DETAILED STATS TABLE */}
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon color="action" />
                        <Typography variant="h6">Statistiques par Module</Typography>
                      </Box>
                      <Button 
                        startIcon={<DownloadIcon />} 
                        variant="outlined" 
                        size="small" 
                        color="success"
                        onClick={handleGlobalStatsExport}
                      >
                        Export Global Excel
                      </Button>
                  </Box>
                  <TableContainer>
                      <Table>
                          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                              <TableRow>
                                  <TableCell width="50" />
                                  <TableCell><strong>Module (Pattern)</strong></TableCell>
                                  <TableCell align="center"><strong>Nombre de Groupes</strong></TableCell>
                                  <TableCell align="center"><strong>Étudiants Affectés</strong></TableCell>
                                  <TableCell width="35%"><strong>Répartition</strong></TableCell>
                              </TableRow>
                          </TableHead>
                          <TableBody>
                              {statsData.moduleStats.map((stat, idx) => (
                                  <React.Fragment key={idx}>
                                    <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                                        <TableCell>
                                            <IconButton
                                                aria-label="expand row"
                                                size="small"
                                                onClick={() => handleExpandStats(stat.pattern)}
                                            >
                                                {expandedStats === stat.pattern ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={stat.pattern} sx={{ fontWeight: 'bold', fontFamily: 'monospace' }} variant="outlined" />
                                        </TableCell>
                                        <TableCell align="center">{stat.groups}</TableCell>
                                        <TableCell align="center">
                                            <Typography fontWeight="bold" color="primary.main">{stat.students}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={statsData.maxStudents > 0 ? (stat.students / statsData.maxStudents) * 100 : 0} 
                                                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {statsData.maxStudents > 0 ? Math.round((stat.students / statsData.maxStudents) * 100) : 0}%
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                                            <Collapse in={expandedStats === stat.pattern} timeout="auto" unmountOnExit>
                                                <Box sx={{ margin: 2, ml: 8, borderLeft: '3px solid #1976d2', pl: 2 }}>
                                                    <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '0.9rem' }}>
                                                        Détails par Élément (Code Module)
                                                    </Typography>
                                                    {loadingBreakdown && !statsBreakdown[stat.pattern] ? (
                                                        <Typography variant="caption">Chargement des détails...</Typography>
                                                    ) : (
                                                        <Table size="small" aria-label="details">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell><strong>Code Élément</strong></TableCell>
                                                                    <TableCell><strong>Nom du Module</strong></TableCell>
                                                                    <TableCell align="right"><strong>Nombre d'Étudiants</strong></TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {(statsBreakdown[stat.pattern] || []).map((detail, dIdx) => (
                                                                    <React.Fragment key={dIdx}>
                                                                        <TableRow>
                                                                            <TableCell component="th" scope="row" sx={{ fontFamily: 'monospace', verticalAlign: 'top' }}>
                                                                                {detail.cod_elp}
                                                                            </TableCell>
                                                                            <TableCell sx={{ verticalAlign: 'top' }}>
                                                                                {detail.lib_elp || <span style={{ color: '#aaa', fontStyle: 'italic' }}>Non défini</span>}
                                                                            </TableCell>
                                                                            <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                                                                                <Chip label={detail.total} size="small" color="primary" sx={{fontWeight:'bold'}} />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        <TableRow>
                                                                            <TableCell colSpan={3} sx={{ pb: 2, pt: 0, borderBottom: '1px solid #e0e0e0' }}>
                                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                                                                    {detail.groups.map((g, gIdx) => (
                                                                                        <Chip 
                                                                                            key={gIdx}
                                                                                            label={`${g.name}: ${g.count}`}
                                                                                            size="small"
                                                                                            variant="outlined"
                                                                                            sx={{ borderRadius: 1 }}
                                                                                        />
                                                                                    ))}
                                                                                    {detail.groups.length === 0 && <Typography variant="caption" color="text.secondary">Aucun groupe détecté</Typography>}
                                                                                </Box>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    </React.Fragment>
                                                                ))}
                                                                {(!statsBreakdown[stat.pattern] || statsBreakdown[stat.pattern].length === 0) && (
                                                                    <TableRow>
                                                                        <TableCell colSpan={3}>Aucun détail disponible ou module vide.</TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                  </React.Fragment>
                              ))}
                              {statsData.moduleStats.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>Aucune donnée disponible.</TableCell>
                                  </TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </TableContainer>
              </Card>
          </Box>
      )}

      {/* --- LIST VIEW (VISIBLE IN 'LIST' MODE) --- */}
      {viewMode === 'list' && (
      <Box>
        {/* TOOLBAR */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
            size="small"
            placeholder="Rechercher (Module, Groupe)..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            sx={{ flexGrow: 1, minWidth: 250 }}
            InputProps={{
                startAdornment: (
                <InputAdornment position="start">
                    <SearchIcon color="action" />
                </InputAdornment>
                ),
                endAdornment: searchTerm && (
                <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                    </IconButton>
                </InputAdornment>
                )
            }}
            />
            <Button 
                startIcon={<RefreshIcon />} 
                onClick={fetchRules}
                variant="outlined"
                sx={{ borderRadius: 2 }}
            >
                Actualiser
            </Button>
        </Paper>

        {/* LIST */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {currentModulePatterns.map((pattern) => {
            const moduleRules = groupedRules[pattern];
            const totalGroups = moduleRules.length;
            const totalStudents = moduleRules.reduce((sum, r) => sum + parseInt(r.student_count || 0), 0);

            return (
                <Accordion key={pattern} defaultExpanded={searchTerm !== ''} sx={{ borderRadius: 2, boxShadow: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SchoolIcon color="action" />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {pattern}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Chip 
                            label={`${totalGroups} Groupe(s)`} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                            icon={<ClassIcon />}
                        />
                        <Chip 
                            label={`${totalStudents} Étudiant(s)`} 
                            size="small" 
                            color="default" 
                            icon={<GroupsIcon />}
                        />
                    </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#fff' }}>
                        <TableRow>
                            <TableCell sx={{ pl: 4 }}><strong>Nom du Groupe</strong></TableCell>
                            <TableCell align="center"><strong>Intervalle Alphabétique</strong></TableCell>
                            <TableCell align="center"><strong>Effectif</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                            {moduleRules
                            .sort((a, b) => a.group_name.localeCompare(b.group_name))
                            .map((rule) => (
                            <TableRow key={rule.id} hover>
                                <TableCell sx={{ pl: 4, fontWeight: 500 }}>{rule.group_name}</TableCell>
                                <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>{rule.range_start}</Typography>
                                    <ArrowIcon fontSize="small" color="action" />
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>{rule.range_end}</Typography>
                                </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <Button 
                                        size="small" 
                                        onClick={() => handleViewStudents(rule)}
                                        sx={{ minWidth: 40, borderRadius: 5, px: 2 }}
                                        variant={rule.student_count > 0 ? "soft" : "text"}
                                        color={rule.student_count > 0 ? "primary" : "inherit"}
                                    >
                                        <GroupsIcon sx={{ fontSize: 16, mr: 1 }} />
                                        {rule.student_count || 0}
                                    </Button>
                                </TableCell>
                                <TableCell align="center">
                                <IconButton color="error" size="small" onClick={() => handleDelete(rule.id)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </TableContainer>
                </AccordionDetails>
                </Accordion>
            );
            })}

            {currentModulePatterns.length === 0 && !loading && (
            <Paper sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                <FilterListIcon sx={{ fontSize: 50, mb: 1, opacity: 0.5 }} />
                <Typography variant="h6">Aucune règle trouvée</Typography>
            </Paper>
            )}
        </Box>

        {/* PAGINATION */}
        {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(e, v) => setPage(v)} 
                color="primary" 
                showFirstButton 
                showLastButton 
            />
            </Box>
        )}
      </Box>
      )}

      {/* --- ADD RULE DIALOG --- */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>Ajouter une règle de répartition</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Alert severity="info" icon={<ClassIcon fontSize="inherit" />}>
               Les étudiants correspondants seront automatiquement affectés à ce groupe pour ce module.
            </Alert>
            <TextField
              label="Pattern Module (ex: JLAP1%)"
              fullWidth
              variant="outlined"
              value={formData.module_pattern}
              onChange={(e) => setFormData({ ...formData, module_pattern: e.target.value })}
              helperText="Utilisez % pour inclure plusieurs variantes (ex: JLAP1% match JLAP1204 et JLAP1304)"
            />
            <TextField
              label="Nom du Groupe (ex: Groupe 1)"
              fullWidth
              variant="outlined"
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit} startIcon={<AddIcon />}>Ajouter</Button>
        </DialogActions>
      </Dialog>

      {/* --- VIEW STUDENTS DIALOG --- */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
            <Box>
                <Typography variant="h6">Étudiants - {selectedRuleTitle}</Typography>
                <Typography variant="caption" color="text.secondary">
                    Total: {filteredStudents.length} étudiant(s) trouvé(s)
                </Typography>
            </Box>
            <Button 
                startIcon={<DownloadIcon />} 
                variant="outlined" 
                size="small" 
                onClick={handleExportExcel}
                disabled={selectedStudents.length === 0}
                color="success"
            >
                Export Excel
            </Button>
        </DialogTitle>
        <DialogContent>
           <Box sx={{ my: 2 }}>
             <TextField
                fullWidth
                size="small"
                placeholder="Filtrer dans la liste (Nom, Prénom, CNE)..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
             />
           </Box>

           {loadingStudents ? (
             <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                 <Typography>Chargement des données...</Typography>
             </Box>
           ) : (
             <TableContainer sx={{ maxHeight: 400, border: '1px solid #eee', borderRadius: 1 }}>
               <Table size="small" stickyHeader>
                 <TableHead>
                   <TableRow>
                     <TableCell sx={{ bgcolor: '#fafafa' }}><strong>CNE</strong></TableCell>
                     <TableCell sx={{ bgcolor: '#fafafa' }}><strong>Nom</strong></TableCell>
                     <TableCell sx={{ bgcolor: '#fafafa' }}><strong>Prénom</strong></TableCell>
                     <TableCell sx={{ bgcolor: '#fafafa' }}><strong>Filière</strong></TableCell>
                   </TableRow>
                 </TableHead>
                 <TableBody>
                   {filteredStudents.map((s, idx) => (
                     <TableRow key={idx} hover>
                       <TableCell>{s.cod_etu}</TableCell>
                       <TableCell>{s.lib_nom_pat_ind}</TableCell>
                       <TableCell>{s.lib_pr1_ind}</TableCell>
                       <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{s.lib_etp}</TableCell>
                     </TableRow>
                   ))}
                   {filteredStudents.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                         Aucun étudiant trouvé.
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </TableContainer>
           )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupManagement;