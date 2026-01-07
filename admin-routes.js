const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const multer = require('multer'); 
const fs = require('fs'); 
const router = express.Router();
require('dotenv').config();

const upload = multer({ dest: 'uploads/' });

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// ==========================================
// 1. AUTO-INITIALIZATION
// ==========================================
async function initHRDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        ppr VARCHAR(50) UNIQUE,
        etablissement VARCHAR(50),
        nom VARCHAR(100),
        prenom VARCHAR(100),
        sexe VARCHAR(10),
        date_naissance DATE,
        lieu_naissance VARCHAR(100),
        email VARCHAR(100),
        grade VARCHAR(100),
        type VARCHAR(50),
        date_recrutement DATE,
        date_mise_en_service DATE,
        departement VARCHAR(100),
        diplome VARCHAR(200),
        specialite VARCHAR(200),
        cin VARCHAR(20),
        phone VARCHAR(50),
        status VARCHAR(20) DEFAULT 'ACTIF',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const saltRounds = 10;
    const adminExists = await pool.query("SELECT 1 FROM admins WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
        const adminHash = await bcrypt.hash('admin123', saltRounds);
        await pool.query(`INSERT INTO admins (username, password_hash, full_name, role) VALUES ('admin', $1, 'Administrateur Principal', 'SUPER_ADMIN')`, [adminHash]);
    }
    const rhExists = await pool.query("SELECT 1 FROM admins WHERE username = 'rh'");
    if (rhExists.rows.length === 0) {
        const rhHash = await bcrypt.hash('rh123', saltRounds);
        await pool.query(`INSERT INTO admins (username, password_hash, full_name, role) VALUES ('rh', $1, 'Responsable RH', 'RH_MANAGER')`, [rhHash]);
    }
    console.log('✅ HR Database initialized.');
  } catch (error) {
    console.error('❌ Error initializing HR database:', error);
  }
}
initHRDatabase();

// ==========================================
// 2. MIDDLEWARE
// ==========================================
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Admin access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid admin token' });
    req.admin = decoded;
    next();
  });
};

const requireRH = (req, res, next) => {
  const role = req.admin?.role;
  if (role === 'SUPER_ADMIN' || role === 'RH_MANAGER') next();
  else res.status(403).json({ error: 'Access denied: HR privileges required' });
};

// ==========================================
// 3. AUTHENTICATION ROUTES
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    
    const dbResult = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (dbResult.rows.length > 0) {
        const admin = dbResult.rows[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        if (match) {
            const adminToken = jwt.sign({ id: admin.id, username: admin.username, role: admin.role, isAdmin: true, loginTime: new Date().toISOString() }, process.env.JWT_SECRET, { expiresIn: '12h' });
            return res.json({ success: true, token: adminToken, user: { username: admin.username, role: admin.role, fullName: admin.full_name } });
        }
    }
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const adminToken = jwt.sign({ username: username, role: 'SUPER_ADMIN', isAdmin: true, loginTime: new Date().toISOString() }, process.env.JWT_SECRET, { expiresIn: '8h' });
      return res.json({ success: true, token: adminToken, user: { username: username, role: 'SUPER_ADMIN' } });
    }
    res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/logout', authenticateAdmin, (req, res) => { res.json({ success: true, message: 'Logged out successfully' }); });
router.get('/verify', authenticateAdmin, (req, res) => { res.json({ valid: true, admin: { username: req.admin.username, role: req.admin.role || 'admin', loginTime: req.admin.loginTime } }); });


// ==========================================
// 4. GROUP & PEDAGOGICAL ROUTES
// ==========================================

// Get all grouping rules with statistics
router.get('/groups/rules', authenticateAdmin, async (req, res) => {
  try {
    // FIX: Use COLLATE "C" to strictly force "Space" (32) < "Letters" (65+)
    const query = `
      SELECT 
        gr.*,
        (
          SELECT COUNT(DISTINCT ps.cod_etu)
          FROM pedagogical_situation ps
          WHERE 
            ps.cod_elp ILIKE gr.module_pattern
            AND ps.cod_elp NOT LIKE '%CC'
            AND ps.cod_elp NOT LIKE '%005'
            AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
            AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
        ) as student_count
      FROM grouping_rules gr
      ORDER BY gr.module_pattern, gr.group_name
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get grouping rules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Students for a specific Grouping Rule
router.get('/groups/rules/:id/students', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch the rule details first
    const ruleRes = await pool.query('SELECT * FROM grouping_rules WHERE id = $1', [id]);
    
    if (ruleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Règle introuvable' });
    }

    const rule = ruleRes.rows[0];

    // 2. Fetch matching students using the rule's criteria
    const query = `
      SELECT DISTINCT
        ps.cod_etu, 
        COALESCE(ps.lib_nom_pat_ind, s.lib_nom_pat_ind) as lib_nom_pat_ind, 
        COALESCE(ps.lib_pr1_ind, s.lib_pr1_ind) as lib_pr1_ind, 
        s.cin_ind, 
        s.lib_etp
      FROM pedagogical_situation ps
      LEFT JOIN students s ON ps.cod_etu = s.cod_etu
      WHERE ps.cod_elp ILIKE $1
      AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER($2) COLLATE "C"
      AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER($3) || 'ZZZZZZ') COLLATE "C"
      ORDER BY 2, 3
    `;

    const result = await pool.query(query, [
      rule.module_pattern, 
      rule.range_start, 
      rule.range_end
    ]);

    res.json(result.rows);

  } catch (error) {
    console.error('❌ Error in GET /groups/rules/:id/students');
    console.error('Message:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET BREAKDOWN: Distribution par Code Module et Groupe
router.get('/groups/stats/breakdown', authenticateAdmin, async (req, res) => {
  try {
    const { pattern } = req.query;
    if (!pattern) return res.status(400).json({ error: 'Pattern required' });

    const totalsQuery = `
      SELECT ps.cod_elp, MAX(ps.lib_elp) as lib_elp, COUNT(DISTINCT ps.cod_etu) as total_count
      FROM pedagogical_situation ps
      WHERE ps.cod_elp ILIKE $1 AND ps.cod_elp NOT LIKE '%CC' AND ps.cod_elp NOT LIKE '%005'
      GROUP BY ps.cod_elp
    `;
    
    const groupsQuery = `
      SELECT ps.cod_elp, gr.group_name, COUNT(DISTINCT ps.cod_etu) as group_count
      FROM pedagogical_situation ps
      JOIN grouping_rules gr ON gr.module_pattern = $1
      WHERE ps.cod_elp ILIKE $1 AND ps.cod_elp NOT LIKE '%CC' AND ps.cod_elp NOT LIKE '%005'
      AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
      AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
      GROUP BY ps.cod_elp, gr.group_name
    `;

    const [totalsResult, groupsResult] = await Promise.all([pool.query(totalsQuery, [pattern]), pool.query(groupsQuery, [pattern])]);

    const map = {};
    totalsResult.rows.forEach(row => { map[row.cod_elp] = { cod_elp: row.cod_elp, lib_elp: row.lib_elp, total: parseInt(row.total_count), groups: [] }; });
    groupsResult.rows.forEach(row => { if (map[row.cod_elp]) { map[row.cod_elp].groups.push({ name: row.group_name, count: parseInt(row.group_count) }); } });

    Object.values(map).forEach(m => { m.groups.sort((a, b) => a.name.localeCompare(b.name)); });
    const finalResult = Object.values(map).sort((a, b) => a.cod_elp.localeCompare(b.cod_elp));
    res.json(finalResult);
  } catch (error) {
    console.error('Stats breakdown error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FULL EXPORT
router.get('/groups/stats/full-export', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT gr.module_pattern, ps.cod_elp, MAX(ps.lib_elp) as lib_elp, gr.group_name, COUNT(DISTINCT ps.cod_etu) as student_count
      FROM grouping_rules gr
      JOIN pedagogical_situation ps ON ps.cod_elp ILIKE gr.module_pattern
      WHERE ps.cod_elp NOT LIKE '%CC' AND ps.cod_elp NOT LIKE '%005'
      AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
      AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
      GROUP BY gr.module_pattern, ps.cod_elp, gr.group_name
      ORDER BY gr.module_pattern, ps.cod_elp, gr.group_name
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) { console.error('Full stats export error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// EXPORT DETAILED ASSIGNMENTS
router.get('/groups/assignments/export', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        ps.cod_etu,
        ps.lib_nom_pat_ind,
        ps.lib_pr1_ind,
        ps.cod_elp,
        ps.lib_elp,
        gr.group_name
      FROM grouping_rules gr
      JOIN pedagogical_situation ps ON ps.cod_elp ILIKE gr.module_pattern
      WHERE 
        ps.cod_elp NOT LIKE '%CC'
        AND ps.cod_elp NOT LIKE '%005'
        AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
        AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
      ORDER BY gr.group_name, ps.cod_elp, ps.lib_nom_pat_ind, ps.lib_pr1_ind
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Export assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rule Management Routes
router.post('/groups/rules', authenticateAdmin, async (req, res) => {
  try {
    const { module_pattern, group_name, range_start, range_end } = req.body;
    if (!module_pattern || !group_name || !range_start || !range_end) return res.status(400).json({ error: 'All fields are required' });
    const result = await pool.query(`INSERT INTO grouping_rules (module_pattern, group_name, range_start, range_end) VALUES ($1, $2, $3, $4) RETURNING *`, [module_pattern.toUpperCase(), group_name, range_start.toUpperCase(), range_end.toUpperCase()]);
    res.status(201).json(result.rows[0]);
  } catch (error) { console.error('Add grouping rule error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/groups/rules/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params; await pool.query('DELETE FROM grouping_rules WHERE id = $1', [id]);
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) { console.error('Delete grouping rule error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// ==========================================
// 5. DASHBOARD & STATS ROUTES
// ==========================================

router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM students'),
      pool.query('SELECT COUNT(*) as total FROM grades'),
      pool.query('SELECT COUNT(*) as total FROM element_pedagogi'),
      pool.query('SELECT COUNT(DISTINCT cod_anu) as total FROM students'),
      pool.query('SELECT COUNT(DISTINCT lib_etp) as total FROM students WHERE lib_etp IS NOT NULL'),
      pool.query(`SELECT sync_timestamp FROM sync_log ORDER BY sync_timestamp DESC LIMIT 1`),
      pool.query(`SELECT COUNT(*) as recent_students FROM students WHERE last_sync >= NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) as recent_grades FROM grades WHERE last_sync >= NOW() - INTERVAL '7 days'`)
    ]);

    const [totalStudents, totalGrades, totalElements, totalYears, totalPrograms, lastSync, recentStudents, recentGrades] = stats;

    res.json({
      overview: {
        total_students: parseInt(totalStudents.rows[0].total),
        total_grades: parseInt(totalGrades.rows[0].total),
        total_elements: parseInt(totalElements.rows[0].total),
        total_years: parseInt(totalYears.rows[0].total),
        total_programs: parseInt(totalPrograms.rows[0].total)
      },
      recent_activity: {
        students_updated: parseInt(recentStudents.rows[0].recent_students),
        grades_updated: parseInt(recentGrades.rows[0].recent_grades),
        last_sync: lastSync.rows[0]?.sync_timestamp || null
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard/overview', authenticateAdmin, async (req, res) => {
  try {
    const [studentsByYear, studentsByProgram, gradesByYear] = await Promise.all([
      pool.query(`SELECT cod_anu, COUNT(*) as count FROM students GROUP BY cod_anu ORDER BY cod_anu DESC`),
      pool.query(`SELECT lib_etp, COUNT(*) as count FROM students WHERE lib_etp IS NOT NULL GROUP BY lib_etp ORDER BY count DESC LIMIT 10`),
      pool.query(`SELECT cod_anu, COUNT(*) as count FROM grades GROUP BY cod_anu ORDER BY cod_anu DESC`)
    ]);

    res.json({
      students_by_year: studentsByYear.rows,
      students_by_program: studentsByProgram.rows,
      grades_by_year: gradesByYear.rows
    });
  } catch (error) {
    console.error('Error getting data overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 6. STUDENT MANAGEMENT ROUTES
// ==========================================

// GET /students/export - Export filtered students to CSV
router.get('/students/export', authenticateAdmin, async (req, res) => {
  try {
    const { search = '', program = '', year = '' } = req.query;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(lib_nom_pat_ind ILIKE $${paramIndex} OR lib_pr1_ind ILIKE $${paramIndex} OR cod_etu ILIKE $${paramIndex} OR cin_ind ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (program) { whereConditions.push(`lib_etp = $${paramIndex}`); params.push(program); paramIndex++; }
    if (year) { whereConditions.push(`cod_anu = $${paramIndex}`); params.push(year); paramIndex++; }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        cod_etu, 
        lib_nom_pat_ind, 
        lib_pr1_ind, 
        cin_ind, 
        lib_etp, 
        cod_anu, 
        date_nai_ind,  
        lib_vil_nai_etu, 
        cod_sex_etu,
        cod_nne_ind
      FROM students ${whereClause}
      ORDER BY cod_anu DESC, lib_nom_pat_ind, lib_pr1_ind
    `;
    
    const result = await pool.query(query, params);
    
    const headers = [
      'Code Etudiant', 'Nom', 'Prenom', 'CIN', 
      'Filiere', 'Annee', 
      'Date Naissance', 'Lieu Naissance', 
      'Sexe', 'CNE'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    result.rows.forEach(row => {
      const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';
      const escape = (t) => t ? `"${t.toString().replace(/"/g, '""')}"` : '';
      
      const line = [
        row.cod_etu,
        escape(row.lib_nom_pat_ind),
        escape(row.lib_pr1_ind),
        row.cin_ind || '',
        escape(row.lib_etp),
        row.cod_anu || '',
        formatDate(row.date_nai_ind),
        escape(row.lib_vil_nai_etu),
        row.cod_sex_etu || '',
        row.cod_nne_ind || ''
      ].join(',');
      
      csvContent += line + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=students_export_${year || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

router.get('/students/search', authenticateAdmin, async (req, res) => {
  try {
    const { search = '', program = '', year = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(lib_nom_pat_ind ILIKE $${paramIndex} OR lib_pr1_ind ILIKE $${paramIndex} OR cod_etu ILIKE $${paramIndex} OR cin_ind ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (program) { whereConditions.push(`lib_etp = $${paramIndex}`); params.push(program); paramIndex++; }
    if (year) { whereConditions.push(`cod_anu = $${paramIndex}`); params.push(year); paramIndex++; }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM students ${whereClause}`, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const dataQuery = `
      SELECT id, cod_etu, lib_nom_pat_ind || ' ' || lib_pr1_ind as full_name, cin_ind, lib_etp, cod_anu, last_sync,
        CASE 
          WHEN last_sync >= NOW() - INTERVAL '24 hours' THEN 'recent'
          WHEN last_sync >= NOW() - INTERVAL '7 days' THEN 'week'
          ELSE 'old'
        END as sync_status
      FROM students ${whereClause}
      ORDER BY last_sync DESC, lib_nom_pat_ind, lib_pr1_ind
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await pool.query(dataQuery, [...params, limit, offset]);
    
    res.json({
      students: dataResult.rows,
      pagination: {
        current_page: parseInt(page), total_pages: Math.ceil(totalCount / limit), total_count: totalCount,
        per_page: parseInt(limit), has_next: offset + parseInt(limit) < totalCount, has_prev: page > 1
      }
    });
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/students/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const studentResult = await pool.query(`SELECT * FROM students WHERE id = $1`, [id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    
    const student = studentResult.rows[0];
    const gradesResult = await pool.query(`
      SELECT g.cod_anu, g.cod_ses, g.cod_elp, g.not_elp, g.cod_tre, ep.lib_elp, ep.lib_elp_arb, ep.element_type, ep.semester_number, g.last_sync as grade_last_sync
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = $1
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.semester_number, ep.lib_elp
    `, [student.cod_etu]);
    
    const statsResult = await pool.query(`
      SELECT cod_anu, cod_ses, COUNT(*) as total_subjects, COUNT(CASE WHEN not_elp >= 10 THEN 1 END) as passed_subjects,
        COUNT(CASE WHEN not_elp < 10 THEN 1 END) as failed_subjects, COUNT(CASE WHEN not_elp IS NULL THEN 1 END) as absent_subjects,
        AVG(CASE WHEN not_elp IS NOT NULL THEN not_elp END) as average_grade
      FROM grades WHERE cod_etu = $1 GROUP BY cod_anu, cod_ses ORDER BY cod_anu DESC, cod_ses
    `, [student.cod_etu]);
    
    res.json({
      student: student, grades: gradesResult.rows,
      statistics: statsResult.rows.map(stat => ({ ...stat, average_grade: stat.average_grade ? parseFloat(stat.average_grade).toFixed(2) : null }))
    });
  } catch (error) {
    console.error('Error getting student details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 7. SYNC MANAGEMENT ROUTES
// ==========================================

router.get('/sync/status', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await pool.query(`
      SELECT sync_type, records_processed, sync_status, error_message, sync_timestamp
      FROM sync_log ORDER BY sync_timestamp DESC LIMIT $1
    `, [limit]);
    
    const syncStats = await pool.query(`
      SELECT sync_type, COUNT(*) as total_syncs, COUNT(CASE WHEN sync_status = 'success' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as failed_syncs, MAX(sync_timestamp) as last_sync_time
      FROM sync_log WHERE sync_timestamp >= NOW() - INTERVAL '30 days' GROUP BY sync_type ORDER BY last_sync_time DESC
    `);
    
    res.json({ last_sync: result.rows[0] || null, recent_syncs: result.rows, sync_statistics: syncStats.rows });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sync/manual', authenticateAdmin, async (req, res) => {
  try {
    const { syncStudents } = require('./sync-service');
    console.log(`Manual sync requested by admin: ${req.admin.username}`);
    await pool.query(`INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message) VALUES ('manual_trigger', 0, 'started', $1)`, [`Manual sync initiated by admin: ${req.admin.username}`]);
    syncStudents()
      .then(() => console.log(`Manual sync completed successfully`))
      .catch((error) => {
        console.error('Manual sync failed:', error);
        pool.query(`INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message) VALUES ('manual_sync', 0, 'error', $1)`, [`Sync failed: ${error.message}`]);
      });
    res.json({ success: true, message: 'Manual sync started.', initiated_by: req.admin.username });
  } catch (error) {
    console.error('Error starting manual sync:', error);
    res.status(500).json({ error: 'Failed to start manual sync' });
  }
});

// ==========================================
// 8. SYSTEM HEALTH & REQUESTS ROUTES
// ==========================================

router.get('/system/health', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('SELECT 1');
    const healthChecks = { database: { postgresql: true }, sync_health: { last_sync: null } };
    const syncInfo = await pool.query(`SELECT sync_timestamp FROM sync_log ORDER BY sync_timestamp DESC LIMIT 1`);
    if(syncInfo.rows.length > 0) healthChecks.sync_health.last_sync = syncInfo.rows[0].sync_timestamp;
    res.json({ status: 'completed', timestamp: new Date().toISOString(), health_checks: healthChecks });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.get('/student-card-requests', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT scr.id, scr.status, scr.created_at, s.cod_etu, s.lib_nom_pat_ind, s.lib_pr1_ind, s.cin_ind
      FROM student_card_requests scr JOIN students s ON scr.cod_etu = s.cod_etu ORDER BY scr.created_at DESC
    `);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get student card requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/student-card-requests/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
       return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE student_card_requests 
       SET status = $1, comment = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [status, comment || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update student card request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/system/stats', authenticateAdmin, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const syncStats = await pool.query(`
      SELECT DATE(sync_timestamp) as sync_date, sync_type, COUNT(*) as sync_count, SUM(records_processed) as total_records
      FROM sync_log WHERE sync_timestamp >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(sync_timestamp), sync_type ORDER BY sync_date DESC, sync_type
    `);
    res.json({ sync_history: syncStats.rows, period_days: parseInt(period) });
  } catch (error) {
    console.error('Error getting system statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 9. LAUREAT MANAGEMENT ROUTES
// ==========================================
router.get('/laureats', authenticateAdmin, async (req, res) => {
  try {
    const { year, diploma, search, multiDiploma, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM laureats WHERE 1=1`;
    let params = []; let paramIndex = 1;

    if (year) { query += ` AND cod_anu = $${paramIndex}`; params.push(year); paramIndex++; }
    if (diploma) { query += ` AND cod_dip = $${paramIndex}`; params.push(diploma); paramIndex++; }
    if (search) {
      query += ` AND (cod_etu ILIKE $${paramIndex} OR cin_ind ILIKE $${paramIndex} OR nom_pat_ind ILIKE $${paramIndex} OR prenom_ind ILIKE $${paramIndex})`;
      params.push(`%${search}%`); paramIndex++;
    }
    if (multiDiploma === 'true') {
      query += ` AND cod_etu IN (SELECT cod_etu FROM laureats GROUP BY cod_etu HAVING COUNT(DISTINCT cod_dip) > 1)`;
    }
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    query += ` ORDER BY cod_anu DESC, nom_pat_ind LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json({ laureats: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit) });
  } catch (error) {
    console.error('Get laureats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/laureats/stats', authenticateAdmin, async (req, res) => {
  try {
    const byYear = await pool.query(`SELECT cod_anu, COUNT(*) as count FROM laureats GROUP BY cod_anu ORDER BY cod_anu DESC`);
    const byDiploma = await pool.query(`SELECT cod_dip, MIN(lib_dip) as lib_dip, COUNT(*) as count FROM laureats GROUP BY cod_dip ORDER BY count DESC`);
    const multiDiploma = await pool.query(`SELECT COUNT(*) as count FROM (SELECT cod_etu FROM laureats GROUP BY cod_etu HAVING COUNT(DISTINCT cod_dip) > 1) as multi`);
    res.json({ byYear: byYear.rows, byDiploma: byDiploma.rows, multiDiplomaCount: parseInt(multiDiploma.rows[0].count) });
  } catch (error) {
    console.error('Get laureats stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/laureats/student/:codEtu', authenticateAdmin, async (req, res) => {
  try {
    const { codEtu } = req.params;
    const result = await pool.query(`SELECT * FROM laureats WHERE cod_etu = $1 ORDER BY cod_anu DESC`, [codEtu]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get laureat details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/laureats/sync', authenticateAdmin, async (req, res) => {
  try {
    const { syncLaureats } = require('./sync-service');
    syncLaureats([2024, 2023, 2022, 2021]).then(r => console.log('Sync Laureats Done'));
    res.json({ message: 'Sync started' });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});



// ==========================================
// 10. RH MANAGEMENT ROUTES
// ==========================================
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  let s = dateStr.trim().replace(/"/g, ''); 
  if (!/^[\d\/\-\.]+$/.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10), p1 = parseInt(parts[1], 10), p2 = parseInt(parts[2], 10);
      let year, month, day;
      if (p2 > 1900) { year = p2; if (p1 > 12) { month = p0; day = p1; } else { day = p0; month = p1; } } 
      else if (p0 > 1900) { year = p0; month = p1; day = p2; } else return null;
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  return null;
};

const splitCSV = (str, delimiter) => {
  const regex = new RegExp(`(?:^|${delimiter})(\"(?:[^\"]+|\"\")*\"|[^${delimiter}]*)`, 'g');
  let match; const result = [];
  while ((match = regex.exec(str))) { let val = match[1]; if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1); result.push(val.trim()); }
  return result;
};

router.post('/employees/import', authenticateAdmin, requireRH, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path; let successCount = 0; let errorCount = 0; const errorsDetails = [];
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8'); const lines = fileContent.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line) continue;
      const delimiter = line.includes(';') ? ';' : ','; const cols = splitCSV(line, delimiter); if (cols.length < 3) continue; 
      const ppr = cols[2]; if (!ppr) continue; 
      const emp = {
        etablissement: cols[0], ppr: cols[2], nom: cols[3], prenom: cols[4], sexe: cols[5],
        date_naissance: parseDate(cols[6]), lieu_naissance: cols[7], email: cols[8], grade: cols[9], type: cols[10],
        date_recrutement: parseDate(cols[11]), date_mise_en_service: parseDate(cols[12]),
        departement: cols[14], diplome: cols[15], specialite: cols[16]
      };
      try {
        await pool.query(`
          INSERT INTO employees (etablissement, ppr, nom, prenom, sexe, date_naissance, lieu_naissance, email, grade, type, date_recrutement, date_mise_en_service, departement, diplome, specialite)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (ppr) DO UPDATE SET nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, grade=EXCLUDED.grade, type=EXCLUDED.type, email=EXCLUDED.email, departement=EXCLUDED.departement, diplome=EXCLUDED.diplome, specialite=EXCLUDED.specialite, date_recrutement=EXCLUDED.date_recrutement
        `, [emp.etablissement, emp.ppr, emp.nom, emp.prenom, emp.sexe, emp.date_naissance, emp.lieu_naissance, emp.email, emp.grade, emp.type, emp.date_recrutement, emp.date_mise_en_service, emp.departement, emp.diplome, emp.specialite]);
        successCount++;
      } catch (err) { errorCount++; if (errorsDetails.length < 10) errorsDetails.push(`Ligne ${i}: ${err.message}`); }
    }
    fs.unlinkSync(filePath); res.json({ message: 'Import processed', success: successCount, errors: errorCount, details: errorsDetails });
  } catch (error) { console.error('Import error:', error); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); res.status(500).json({ error: 'Failed to process file' }); }
});

router.get('/employees', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { type, search } = req.query; let query = 'SELECT * FROM employees WHERE 1=1'; let params = []; let paramIndex = 1;
    if (type) { query += ` AND type = $${paramIndex}`; params.push(type); paramIndex++; }
    if (search) { query += ` AND (nom ILIKE $${paramIndex} OR prenom ILIKE $${paramIndex} OR ppr ILIKE $${paramIndex})`; params.push(`%${search}%`); paramIndex++; }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params); res.json(result.rows);
  } catch (error) { console.error('Get employees error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/employees', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { ppr, nom, prenom, email, phone, type, department, grade, date_embauche, status } = req.body;
    if (!ppr || !nom || !prenom || !type) return res.status(400).json({ error: 'Champs obligatoires manquants' });
    const result = await pool.query(`INSERT INTO employees (ppr, nom, prenom, email, phone, type, departement, grade, date_recrutement, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [ppr, nom, prenom, email, phone, type, department, grade, date_embauche, status || 'ACTIF']);
    res.status(201).json(result.rows[0]);
  } catch (error) { if (error.code === '23505') return res.status(400).json({ error: 'Ce PPR existe déjà.' }); console.error('Add employee error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/employees/:id', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { id } = req.params; const { nom, prenom, email, phone, type, department, grade, status, date_embauche, diplome, specialite } = req.body;
    const result = await pool.query(`UPDATE employees SET nom = $1, prenom = $2, email = $3, phone = $4, type = $5, departement = $6, grade = $7, status = $8, date_recrutement = $9, diplome = $10, specialite = $11 WHERE id = $12 RETURNING *`, [nom, prenom, email, phone, type, department, grade, status, date_embauche, diplome, specialite, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employé non trouvé' });
    res.json(result.rows[0]);
  } catch (error) { console.error('Update employee error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/employees/:id', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { id } = req.params; await pool.query('DELETE FROM employees WHERE id = $1', [id]); res.json({ message: 'Employé supprimé avec succès' });
  } catch (error) { console.error('Delete employee error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/employees/stats', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const [total, byType, active, depts] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM employees'), pool.query('SELECT type, COUNT(*) as count FROM employees GROUP BY type'),
        pool.query("SELECT COUNT(*) as count FROM employees WHERE status = 'ACTIF'"), pool.query('SELECT COUNT(DISTINCT departement) as count FROM employees')
    ]);
    const typeStats = byType.rows.reduce((acc, row) => { acc[row.type] = parseInt(row.count); return acc; }, {});
    res.json({ total: parseInt(total.rows[0].count), professors: typeStats['PROF'] || 0, admins: typeStats['Administratif'] || 0, active: parseInt(active.rows[0].count), departments: parseInt(depts.rows[0].count) });
  } catch (error) { console.error('Error getting employee stats:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// ==========================================
// 11. EXAM PLANNING ROUTES
// ==========================================

// DELETE an exam
router.delete('/exams/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM exam_planning WHERE id = $1', [id]);
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Students for Multiple Modules + Multiple Groups (MERGE FEATURE)
router.get('/groups/students', authenticateAdmin, async (req, res) => {
  try {
    const { module, group } = req.query;
    
    if (!module) return res.status(400).json({ error: 'Module code required' });

    // 1. Parse comma-separated inputs
    const modules = module.split(',').map(m => m.trim()).filter(m => m);
    // Parse groups, filtering out 'null' or 'undefined' strings
    const groups = group 
      ? group.split(',').map(g => g.trim()).filter(g => g && g !== 'null' && g !== 'undefined') 
      : [];

    console.log(`🔍 Fetching students for Modules: [${modules.join(', ')}], Groups: [${groups.join(', ')}]`);

    // 2. Build Dynamic Module Conditions (OR logic)
    // Result: (TRIM(ps.cod_elp) ILIKE TRIM($1) OR TRIM(ps.cod_elp) ILIKE TRIM($2) ...)
    const moduleConditions = modules.map((_, index) => `TRIM(ps.cod_elp) ILIKE TRIM($${index + 1})`).join(' OR ');

    let query = `
      SELECT DISTINCT 
        ps.cod_etu, 
        COALESCE(ps.lib_nom_pat_ind, s.lib_nom_pat_ind) as lib_nom_pat_ind, 
        COALESCE(ps.lib_pr1_ind, s.lib_pr1_ind) as lib_pr1_ind, 
        s.cin_ind, 
        s.lib_etp
      FROM pedagogical_situation ps
      LEFT JOIN students s ON ps.cod_etu = s.cod_etu
      WHERE (${moduleConditions})
    `;
    
    const params = [...modules];
    let nextParamIndex = modules.length + 1;

    // 3. Apply Group Filter (only if groups provided and not "Tous")
    if (groups.length > 0 && !groups.includes('Tous')) {
      const groupPlaceholders = groups.map((_, i) => `$${nextParamIndex + i}`).join(',');
      
      // We check if the student belongs to ANY of the selected groups for ANY of the selected modules
      query += `
        AND EXISTS (
          SELECT 1 FROM grouping_rules gr
          WHERE (
             ${modules.map((_, i) => `ps.cod_elp ILIKE gr.module_pattern`).join(' OR ')}
          )
          AND gr.group_name IN (${groupPlaceholders})
          AND UPPER(COALESCE(ps.lib_nom_pat_ind, s.lib_nom_pat_ind)) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
          AND UPPER(COALESCE(ps.lib_nom_pat_ind, s.lib_nom_pat_ind)) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
        )
      `;
      params.push(...groups);
    }

    query += ` ORDER BY 2, 3`; // Order by Nom, Prenom

    const result = await pool.query(query, params);
    console.log(`✅ Found ${result.rows.length} students.`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error in /groups/students:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ==========================================
// 12. LOCATION & ASSIGNMENT ROUTES
// ==========================================

// GET Locations
router.get('/locations', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ADD Location
router.post('/locations', authenticateAdmin, async (req, res) => {
  try {
    const { name, capacity, type } = req.body;
    const result = await pool.query(
      'INSERT INTO locations (name, capacity, type) VALUES ($1, $2, $3) RETURNING *',
      [name, capacity, type]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE Location
router.delete('/locations/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM locations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE: Create Exam with Student Assignments
router.post('/exams', authenticateAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      module_code, module_name, group_name, 
      exam_date, start_time, end_time, 
      location, professor_name,
      student_ids 
    } = req.body;

    // --- DEBUG LOGS ---
    console.log(`\n--- 📝 Creating Exam: ${module_name} ---`);
    console.log(`📍 Location: ${location}`);
    console.log(`👥 Received Student IDs Count: ${student_ids ? student_ids.length : 'UNDEFINED'}`);
    
    await client.query('BEGIN');
    
    // 1. Create Exam Record
    const examRes = await client.query(
      `INSERT INTO exam_planning 
       (module_code, module_name, group_name, exam_date, start_time, end_time, location, professor_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [module_code, module_name, group_name, exam_date, start_time, end_time, location, professor_name]
    );
    const examId = examRes.rows[0].id;
    console.log(`✅ Exam Record Created (ID: ${examId})`);

    // 2. Insert Student Assignments
    if (student_ids && student_ids.length > 0) {
      // Build the bulk insert query
      const values = student_ids.map((_, i) => `($1, $${i + 2})`).join(',');
      const params = [examId, ...student_ids];
      
      console.log(`💾 Inserting ${student_ids.length} students into database...`);
      
      await client.query(
        `INSERT INTO exam_assignments (exam_id, cod_etu) VALUES ${values}
         ON CONFLICT (exam_id, cod_etu) DO NOTHING`, // Prevent duplicate errors
        params
      );
      console.log(`✅ Students Inserted Successfully.`);
    } else {
      console.warn(`⚠️ WARNING: No students were inserted! student_ids list was empty.`);
    }

    await client.query('COMMIT');
    res.status(201).json({ id: examId, message: 'Exam created successfully' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create exam error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    client.release();
  }
});

// NEW: Get Students specific to an exam instance (ROBUST - NO DUPLICATES)
router.get('/exams/:id/students', authenticateAdmin, async (req, res) => {
  try {
    // FIX: Use DISTINCT ON (ea.cod_etu) to strictly ensure 1 row per student ID
    const result = await pool.query(`
      SELECT DISTINCT ON (ea.cod_etu)
        ea.cod_etu, 
        COALESCE(s.lib_nom_pat_ind, ps.lib_nom_pat_ind) as lib_nom_pat_ind, 
        COALESCE(s.lib_pr1_ind, ps.lib_pr1_ind) as lib_pr1_ind, 
        s.cin_ind, 
        s.lib_etp
      FROM exam_assignments ea
      LEFT JOIN students s ON ea.cod_etu = s.cod_etu
      LEFT JOIN pedagogical_situation ps ON ea.cod_etu = ps.cod_etu
      WHERE ea.exam_id = $1
      ORDER BY ea.cod_etu, lib_nom_pat_ind
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get exam students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET Exams with Student Count (CORRECTED LIST VIEW)
router.get('/exams', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ep.*, COUNT(ea.cod_etu) as assigned_count 
      FROM exam_planning ep
      LEFT JOIN exam_assignments ea ON ep.id = ea.exam_id
      GROUP BY ep.id
      ORDER BY ep.exam_date DESC, ep.start_time ASC
    `);
    
    // Ensure assigned_count is a number (Postgres returns it as a string)
    const rows = result.rows.map(row => ({
      ...row,
      assigned_count: parseInt(row.assigned_count || 0)
    }));

    res.json(rows);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Exams with Student Count (CORRECTED LIST VIEW)
router.get('/exams', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ep.*, COUNT(ea.cod_etu) as assigned_count 
      FROM exam_planning ep
      LEFT JOIN exam_assignments ea ON ep.id = ea.exam_id
      GROUP BY ep.id
      ORDER BY ep.exam_date DESC, ep.start_time ASC
    `);
    
    // Ensure assigned_count is a number (Postgres returns it as a string)
    const rows = result.rows.map(row => ({
      ...row,
      assigned_count: parseInt(row.assigned_count || 0)
    }));

    res.json(rows);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- NEW ROUTE: Export Full Exam Planning with Student Details ---
router.get('/exams/export/assignments', authenticateAdmin, async (req, res) => {
  try {
    // FIX: Use DISTINCT ON to ensure we only get one name entry per student
    // This prevents the row explosion caused by joining raw pedagogical_situation
    const query = `
      WITH unique_names AS (
        SELECT DISTINCT ON (cod_etu) 
          cod_etu, 
          lib_nom_pat_ind, 
          lib_pr1_ind 
        FROM pedagogical_situation
      )
      SELECT 
        ea.cod_etu as "CNE",
        COALESCE(s.lib_nom_pat_ind, un.lib_nom_pat_ind) as "Nom",
        COALESCE(s.lib_pr1_ind, un.lib_pr1_ind) as "Prenom",
        ep.exam_date,
        ep.start_time,
        ep.group_name,
        ep.location,
        ep.module_name
      FROM exam_planning ep
      JOIN exam_assignments ea ON ep.id = ea.exam_id
      LEFT JOIN students s ON ea.cod_etu = s.cod_etu
      LEFT JOIN unique_names un ON ea.cod_etu = un.cod_etu
      ORDER BY ep.exam_date, ep.start_time, ep.module_name, "Nom"
    `;
    
    const result = await pool.query(query);
    
    // Generate CSV
    let csv = "CNE,Nom,Prenom,Date,Heure,Groupe,Lieu,Module\n";
    
    result.rows.forEach(row => {
      const date = row.exam_date ? new Date(row.exam_date).toLocaleDateString('fr-FR') : '';
      const time = row.start_time ? row.start_time.substring(0, 5) : '';
      
      const clean = (str) => str ? `"${str.toString().replace(/"/g, '""')}"` : '';
      
      csv += `${clean(row.CNE)},${clean(row.Nom)},${clean(row.Prenom)},${clean(date)},${clean(time)},${clean(row.group_name)},${clean(row.location)},${clean(row.module_name)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=planning_global_detaile_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- NEW ROUTE: Get Count of Student Conflicts (Overlapping Exams) ---
router.get('/exams/conflicts/count', authenticateAdmin, async (req, res) => {
  try {
    // This query finds students assigned to two different exams (ep1, ep2)
    // that happen on the same date and have overlapping time intervals.
    const query = `
      SELECT COUNT(DISTINCT ea1.cod_etu) as conflict_count
      FROM exam_assignments ea1
      JOIN exam_planning ep1 ON ea1.exam_id = ep1.id
      JOIN exam_assignments ea2 ON ea1.cod_etu = ea2.cod_etu
      JOIN exam_planning ep2 ON ea2.exam_id = ep2.id
      WHERE ep1.id < ep2.id -- Ensure we don't compare an exam to itself or count pairs twice
      AND ep1.exam_date = ep2.exam_date -- Same day
      AND (
        (ep1.start_time < ep2.end_time AND ep1.end_time > ep2.start_time) -- Overlapping times
      )
    `;
    
    const result = await pool.query(query);
    res.json({ count: parseInt(result.rows[0].conflict_count) });
    
  } catch (error) {
    console.error('Get exam conflicts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- NEW ROUTE: Get Detailed List of Student Conflicts ---
router.get('/exams/conflicts/details', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔍 Fetching exam conflicts details...');
    
    const query = `
      SELECT 
        ea1.cod_etu,
        COALESCE(
          ps1.lib_nom_pat_ind,
          s.lib_nom_pat_ind,
          'Nom inconnu'
        ) as nom,
        COALESCE(
          ps1.lib_pr1_ind,
          s.lib_pr1_ind,
          'Prénom inconnu'
        ) as prenom,
        ep1.module_name as module1,
        ep1.start_time as start1,
        ep1.end_time as end1,
        ep1.location as loc1,
        ep2.module_name as module2,
        ep2.start_time as start2,
        ep2.end_time as end2,
        ep2.location as loc2,
        ep1.exam_date
      FROM exam_assignments ea1
      JOIN exam_planning ep1 ON ea1.exam_id = ep1.id
      JOIN exam_assignments ea2 ON ea1.cod_etu = ea2.cod_etu AND ea1.exam_id != ea2.exam_id
      JOIN exam_planning ep2 ON ea2.exam_id = ep2.id
      LEFT JOIN (
        SELECT DISTINCT ON (cod_etu) 
          cod_etu, 
          lib_nom_pat_ind, 
          lib_pr1_ind
        FROM pedagogical_situation
        ORDER BY cod_etu, last_sync DESC
      ) ps1 ON ea1.cod_etu = ps1.cod_etu
      LEFT JOIN students s ON ea1.cod_etu = s.cod_etu
      WHERE ep1.id < ep2.id
        AND ep1.exam_date = ep2.exam_date
        AND ep1.start_time < ep2.end_time 
        AND ep1.end_time > ep2.start_time
      ORDER BY nom, prenom, ep1.exam_date
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} conflicts`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Get exam conflicts details error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des conflits',
      details: error.message 
    });
  }
});

// GET Notifications
router.get('/notifications', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    // Count unread
    const countRes = await pool.query(`SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE`);
    
    res.json({
      notifications: result.rows,
      unread_count: parseInt(countRes.rows[0].count)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MARK Notifications as Read
router.put('/notifications/read-all', authenticateAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE`);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// --- NEW ROUTE: Refresh Exam Participants (On-Demand) ---
router.post('/exams/refresh-participants', authenticateAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('🔄 Intelligent Refresh of Exam Participants started...');
    await client.query('BEGIN');

    // 1. Get all future exams
    const examsRes = await client.query(`
      SELECT id, module_code, module_name, group_name, exam_date, start_time, end_time, location
      FROM exam_planning 
      WHERE exam_date >= CURRENT_DATE
      ORDER BY module_code, exam_date, start_time, location
    `);
    const exams = examsRes.rows;

    console.log(`Found ${exams.length} future exams to refresh`);

    let stats = { updatedExams: 0, added: 0, removed: 0, distributionSets: 0, errors: [] };

    // 2. GROUP exams by distribution key (module_code + group_name + date + time)
    const distributionSets = {};
    exams.forEach(exam => {
      const key = `${exam.module_code}|${exam.group_name}|${exam.exam_date}|${exam.start_time}-${exam.end_time}`;
      if (!distributionSets[key]) {
        distributionSets[key] = {
          exams: [],
          module_code: exam.module_code,
          group_name: exam.group_name,
          date: exam.exam_date,
          time: `${exam.start_time}-${exam.end_time}`
        };
      }
      distributionSets[key].exams.push(exam);
    });

    console.log(`Identified ${Object.keys(distributionSets).length} distribution sets`);

    // 3. Process each distribution set
    for (const [setKey, distSet] of Object.entries(distributionSets)) {
      try {
        console.log(`\n📦 Processing Distribution Set: ${setKey}`);
        console.log(`   Contains ${distSet.exams.length} exam session(s)`);

        // Parse modules and groups
        const modules = distSet.module_code ? distSet.module_code.split('+').map(s => s.trim()) : [];
        let groups = [];
        if (distSet.group_name && distSet.group_name !== 'Tous') {
            groups = distSet.group_name.split('+').map(s => s.trim().replace(/\(.*\)$/, '').trim());
        }

        if (modules.length === 0) {
          console.log(`   ⚠️ Skipping: No modules found`);
          continue;
        }

        // 4. Build query to find ALL eligible students for this distribution set
        const params = [];
        let paramIndex = 1;
        
        const modConds = modules.map(m => {
            params.push(m);
            return `ps.cod_elp ILIKE $${paramIndex++}`;
        });

        let groupClause = '';
        if (groups.length > 0) {
            const groupConds = groups.map(g => {
                params.push(g);
                return `EXISTS (
                    SELECT 1 FROM grouping_rules gr
                    WHERE ps.cod_elp ILIKE gr.module_pattern
                    AND gr.group_name = $${paramIndex++}
                    AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
                    AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
                )`;
            });
            groupClause = `AND (${groupConds.join(' OR ')})`;
        }

        const eligibleQuery = `
          SELECT DISTINCT ps.cod_etu, ps.lib_nom_pat_ind, ps.lib_pr1_ind
          FROM pedagogical_situation ps
          WHERE ps.cod_elp IS NOT NULL 
            AND (${modConds.join(' OR ')}) 
            ${groupClause}
          ORDER BY ps.lib_nom_pat_ind, ps.lib_pr1_ind
        `;

        const eligibleRes = await client.query(eligibleQuery, params);
        const eligibleStudents = eligibleRes.rows;

        console.log(`   ✓ Found ${eligibleStudents.size} eligible students for entire set`);

        // 5. INTELLIGENT DISTRIBUTION LOGIC
        if (distSet.exams.length === 1) {
          // ============================================
          // CASE A: Single Exam Session
          // ============================================
          console.log(`   → Single exam mode: Assign all students to one session`);
          
          const exam = distSet.exams[0];
          const studentIds = eligibleStudents.map(s => s.cod_etu);
          
          await updateExamAssignments(client, exam.id, studentIds, stats);

        } else {
          // ============================================
          // CASE B: Multiple Exam Sessions (DISTRIBUTION SET)
          // ============================================
          console.log(`   → Distribution mode: Split ${eligibleStudents.length} students across ${distSet.exams.length} rooms`);

          // Get current room capacities from existing assignments
          const capacityQuery = await client.query(`
            SELECT 
              ep.id,
              ep.location,
              COUNT(ea.cod_etu) as current_count
            FROM exam_planning ep
            LEFT JOIN exam_assignments ea ON ep.id = ea.exam_id
            WHERE ep.id = ANY($1)
            GROUP BY ep.id, ep.location
            ORDER BY ep.location
          `, [distSet.exams.map(e => e.id)]);

          const roomCapacities = capacityQuery.rows;
          const totalCurrentAssigned = roomCapacities.reduce((sum, r) => sum + parseInt(r.current_count), 0);

          console.log(`   Current distribution:`);
          roomCapacities.forEach(r => {
            console.log(`     - ${r.location}: ${r.current_count} students`);
          });

          // Calculate target distribution (proportional based on current)
          let targetDistribution;
          
          if (totalCurrentAssigned > 0) {
            // Proportional redistribution based on existing ratios
            console.log(`   → Using proportional distribution based on existing ratios`);
            
            targetDistribution = roomCapacities.map(room => {
              const ratio = parseInt(room.current_count) / totalCurrentAssigned;
              const targetCount = Math.round(eligibleStudents.length * ratio);
              return {
                exam_id: room.id,
                location: room.location,
                target_count: targetCount
              };
            });
          } else {
            // Equal distribution if no prior assignments
            console.log(`   → Using equal distribution (no prior data)`);
            
            const baseCount = Math.floor(eligibleStudents.length / distSet.exams.length);
            const remainder = eligibleStudents.length % distSet.exams.length;
            
            targetDistribution = distSet.exams.map((exam, idx) => ({
              exam_id: exam.id,
              location: exam.location,
              target_count: baseCount + (idx < remainder ? 1 : 0)
            }));
          }

          // Adjust for rounding errors
          const totalTarget = targetDistribution.reduce((sum, t) => sum + t.target_count, 0);
          if (totalTarget !== eligibleStudents.length) {
            const diff = eligibleStudents.length - totalTarget;
            targetDistribution[0].target_count += diff; // Add difference to first room
          }

          console.log(`   Target distribution:`);
          targetDistribution.forEach(t => {
            console.log(`     - ${t.location}: ${t.target_count} students (target)`);
          });

          // Distribute students across rooms
          let studentIndex = 0;
          for (const target of targetDistribution) {
            const roomStudents = eligibleStudents.slice(studentIndex, studentIndex + target.target_count);
            const studentIds = roomStudents.map(s => s.cod_etu);
            
            await updateExamAssignments(client, target.exam_id, studentIds, stats);
            
            studentIndex += target.target_count;
          }

          stats.distributionSets++;
        }

      } catch (setError) {
        console.error(`   ❌ Error processing distribution set:`, setError.message);
        stats.errors.push({ 
          set: setKey, 
          error: setError.message 
        });
      }
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Intelligent Refresh Complete:');
    console.log(`   Updated Exams: ${stats.updatedExams}`);
    console.log(`   Distribution Sets Processed: ${stats.distributionSets}`);
    console.log(`   Students Added: ${stats.added}`);
    console.log(`   Students Removed: ${stats.removed}`);
    console.log(`   Errors: ${stats.errors.length}`);

    const message = stats.errors.length > 0 
      ? `Mise à jour terminée avec ${stats.errors.length} erreur(s) : ${stats.added} ajoutés, ${stats.removed} retirés, ${stats.distributionSets} groupes redistribués.`
      : `✅ Mise à jour réussie : ${stats.added} ajoutés, ${stats.removed} retirés, ${stats.distributionSets} groupes redistribués intelligemment.`;

    res.json({ 
      success: true, 
      updatedExams: stats.updatedExams,
      added: stats.added,
      removed: stats.removed,
      distributionSets: stats.distributionSets,
      errors: stats.errors,
      message: message
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Fatal Refresh Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de l\'actualisation', 
      details: error.message
    });
  } finally {
    client.release();
  }
});
// --- HELPER FUNCTION: Update Exam Assignments ---
async function updateExamAssignments(client, examId, newStudentIds, stats) {
  // Get current assignments
  const currentRes = await client.query(
    'SELECT cod_etu FROM exam_assignments WHERE exam_id = $1', 
    [examId]
  );
  const currentStudentIds = new Set(currentRes.rows.map(r => r.cod_etu));
  const newStudentSet = new Set(newStudentIds);

  // Calculate diff
  const toAdd = newStudentIds.filter(id => !currentStudentIds.has(id));
  const toRemove = [...currentStudentIds].filter(id => !newStudentSet.has(id));

  // Apply changes
  if (toAdd.length > 0) {
    const values = toAdd.map((_, i) => `($1, $${i + 2})`).join(',');
    await client.query(
      `INSERT INTO exam_assignments (exam_id, cod_etu) 
       VALUES ${values} 
       ON CONFLICT DO NOTHING`,
      [examId, ...toAdd]
    );
    stats.added += toAdd.length;
  }

  if (toRemove.length > 0 && newStudentIds.length > 0) {
    await client.query(
      `DELETE FROM exam_assignments 
       WHERE exam_id = $1 AND cod_etu = ANY($2)`,
      [examId, toRemove]
    );
    stats.removed += toRemove.length;
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    stats.updatedExams++;
  }
}



module.exports = router;