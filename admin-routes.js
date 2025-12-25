/*
type: uploaded file
fileName: bitbuzz-project/student-info-system/student-info-system-b858bf5862393e4426ceab7c444160e120be74d4/admin-routes.js
fullContent:
*/
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

// --- CONSTANTES ---
// Année universitaire cible : 2025 = 2025/2026
const CURRENT_ACADEMIC_YEAR = 2025; 

// ==========================================
// 1. AUTO-INITIALIZATION
// ==========================================
async function initHRDatabase() {
  try {
    // A. Create ADMINS table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        role VARCHAR(20) NOT NULL, -- 'SUPER_ADMIN' or 'RH_MANAGER'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // B. Create EMPLOYEES table (Matches your CSV structure)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        ppr VARCHAR(50) UNIQUE,           -- Main ID
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

    // C. Create Default Accounts
    const saltRounds = 10;
    
    // Super Admin
    const adminExists = await pool.query("SELECT 1 FROM admins WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
        const adminHash = await bcrypt.hash('admin123', saltRounds);
        await pool.query(`
        INSERT INTO admins (username, password_hash, full_name, role)
        VALUES ('admin', $1, 'Administrateur Principal', 'SUPER_ADMIN')
        `, [adminHash]);
        console.log('✅ Default Super Admin created (admin/admin123)');
    }

    // RH Manager
    const rhExists = await pool.query("SELECT 1 FROM admins WHERE username = 'rh'");
    if (rhExists.rows.length === 0) {
        const rhHash = await bcrypt.hash('rh123', saltRounds);
        await pool.query(`
        INSERT INTO admins (username, password_hash, full_name, role)
        VALUES ('rh', $1, 'Responsable RH', 'RH_MANAGER')
        `, [rhHash]);
        console.log('✅ Default RH Manager created (rh/rh123)');
    }

    console.log('✅ HR Database initialized.');

  } catch (error) {
    console.error('❌ Error initializing HR database:', error);
  }
}

// Run initialization immediately
initHRDatabase();


// ==========================================
// 2. MIDDLEWARE
// ==========================================

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid admin token' });
    }
    req.admin = decoded;
    next();
  });
};

const requireRH = (req, res, next) => {
  const role = req.admin?.role;
  if (role === 'SUPER_ADMIN' || role === 'RH_MANAGER') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: HR privileges required' });
  }
};


// ==========================================
// 3. AUTHENTICATION ROUTES
// ==========================================

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // STRATEGY: Try Database Login First
    const dbResult = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    
    if (dbResult.rows.length > 0) {
        // Found in DB
        const admin = dbResult.rows[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        
        if (match) {
            const adminToken = jwt.sign(
                { 
                  id: admin.id,
                  username: admin.username,
                  role: admin.role, // Important!
                  isAdmin: true,
                  loginTime: new Date().toISOString()
                },
                process.env.JWT_SECRET,
                { expiresIn: '12h' }
            );
            
            return res.json({
                success: true,
                token: adminToken,
                user: {
                  username: admin.username,
                  role: admin.role,
                  fullName: admin.full_name
                }
            });
        }
    }

    // FALLBACK: Hardcoded Credentials
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const adminToken = jwt.sign(
        { 
          username: username,
          role: 'SUPER_ADMIN',
          isAdmin: true,
          loginTime: new Date().toISOString()
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      return res.json({
        success: true,
        token: adminToken,
        user: {
          username: username,
          role: 'SUPER_ADMIN'
        }
      });
    }

    res.status(401).json({ error: 'Invalid admin credentials' });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout
router.post('/logout', authenticateAdmin, (req, res) => {
  console.log(`Admin logout: ${req.admin.username}`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Verify admin token
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({ 
    valid: true, 
    admin: {
      username: req.admin.username,
      role: req.admin.role || 'admin',
      loginTime: req.admin.loginTime
    }
  });
});


// ==========================================
// 4. GROUP & PEDAGOGICAL ROUTES (STRICT)
// ==========================================

// Get all grouping rules with statistics
// SOURCE: pedagogical_situation ONLY
router.get('/groups/rules', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        gr.*,
        (
          SELECT COUNT(DISTINCT ps.cod_etu)
          FROM pedagogical_situation ps
          WHERE 
            ps.cod_elp ILIKE gr.module_pattern
            AND ps.daa_uni_con = $1  -- Année 2025/2026 uniquement
            AND ps.cod_elp NOT LIKE '%CC' -- Exclusion des contrôles continus
            AND ps.lib_nom_pat_ind >= gr.range_start -- Filtre sur le nom (directement dans ps)
            AND ps.lib_nom_pat_ind <= (gr.range_end || 'ZZZZZZ')
        ) as student_count
      FROM grouping_rules gr
      ORDER BY gr.module_pattern, gr.group_name
    `;
    const result = await pool.query(query, [CURRENT_ACADEMIC_YEAR]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get grouping rules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unique students for a specific grouping rule (Display List)
// SOURCE: pedagogical_situation + students (pour le CIN)
router.get('/groups/rules/:id/students', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const ruleResult = await pool.query('SELECT * FROM grouping_rules WHERE id = $1', [id]);
    
    if (ruleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const rule = ruleResult.rows[0];

    // Pour l'affichage liste, on joint 'students' juste pour avoir le CIN et d'autres détails si besoin
    const studentsQuery = `
      SELECT DISTINCT ps.cod_etu, ps.lib_nom_pat_ind, ps.lib_pr1_ind, s.cin_ind, s.lib_etp
      FROM pedagogical_situation ps
      LEFT JOIN students s ON ps.cod_etu = s.cod_etu
      WHERE 
        ps.cod_elp ILIKE $1
        AND ps.daa_uni_con = $4  -- Année 2025/2026
        AND ps.cod_elp NOT LIKE '%CC'
        AND ps.lib_nom_pat_ind >= $2
        AND ps.lib_nom_pat_ind <= ($3 || 'ZZZZZZ')
      ORDER BY ps.lib_nom_pat_ind, ps.lib_pr1_ind
    `;

    const studentsResult = await pool.query(studentsQuery, [
      rule.module_pattern, 
      rule.range_start, 
      rule.range_end,
      CURRENT_ACADEMIC_YEAR
    ]);

    res.json(studentsResult.rows);

  } catch (error) {
    console.error('Get rule students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET BREAKDOWN: Distribution par Code Module et Groupe
// SOURCE: pedagogical_situation ONLY
router.get('/groups/stats/breakdown', authenticateAdmin, async (req, res) => {
  try {
    const { pattern } = req.query;
    if (!pattern) return res.status(400).json({ error: 'Pattern required' });

    // 1. Total par Code Module (Exclut CC et filtre Année 2025)
    const totalsQuery = `
      SELECT 
        ps.cod_elp, 
        MAX(ps.lib_elp) as lib_elp,
        COUNT(DISTINCT ps.cod_etu) as total_count
      FROM pedagogical_situation ps
      WHERE ps.cod_elp ILIKE $1
      AND ps.cod_elp NOT LIKE '%CC'
      AND ps.daa_uni_con = $2
      GROUP BY ps.cod_elp
    `;
    
    // 2. Répartition par Groupe (Basé sur les noms dans pedagogical_situation)
    const groupsQuery = `
      SELECT 
        ps.cod_elp,
        gr.group_name,
        COUNT(DISTINCT ps.cod_etu) as group_count
      FROM pedagogical_situation ps
      JOIN grouping_rules gr ON gr.module_pattern = $1
      WHERE ps.cod_elp ILIKE $1
      AND ps.cod_elp NOT LIKE '%CC'
      AND ps.daa_uni_con = $2
      AND ps.lib_nom_pat_ind >= gr.range_start 
      AND ps.lib_nom_pat_ind <= (gr.range_end || 'ZZZZZZ')
      GROUP BY ps.cod_elp, gr.group_name
    `;

    const [totalsResult, groupsResult] = await Promise.all([
      pool.query(totalsQuery, [pattern, CURRENT_ACADEMIC_YEAR]),
      pool.query(groupsQuery, [pattern, CURRENT_ACADEMIC_YEAR])
    ]);

    // 3. Fusion des données
    const map = {};
    
    totalsResult.rows.forEach(row => {
      map[row.cod_elp] = {
        cod_elp: row.cod_elp,
        lib_elp: row.lib_elp,
        total: parseInt(row.total_count),
        groups: []
      };
    });

    groupsResult.rows.forEach(row => {
      if (map[row.cod_elp]) {
        map[row.cod_elp].groups.push({
          name: row.group_name,
          count: parseInt(row.group_count)
        });
      }
    });

    // Tri alphabétique des groupes
    Object.values(map).forEach(m => {
        m.groups.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Retourne un tableau trié
    const finalResult = Object.values(map).sort((a, b) => a.cod_elp.localeCompare(b.cod_elp));

    res.json(finalResult);

  } catch (error) {
    console.error('Stats breakdown error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FULL EXPORT: Module Pattern | Code | Name | Group | Count
// SOURCE: pedagogical_situation ONLY
// ROUTE: /groups/stats/full-export
router.get('/groups/stats/full-export', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        gr.module_pattern,
        ps.cod_elp,
        MAX(ps.lib_elp) as lib_elp,
        gr.group_name,
        COUNT(DISTINCT ps.cod_etu) as student_count
      FROM grouping_rules gr
      JOIN pedagogical_situation ps ON ps.cod_elp ILIKE gr.module_pattern
      WHERE ps.cod_elp NOT LIKE '%CC'
      AND ps.daa_uni_con = $1 -- Année 2025/2026
      AND ps.lib_nom_pat_ind >= gr.range_start 
      AND ps.lib_nom_pat_ind <= (gr.range_end || 'ZZZZZZ')
      GROUP BY gr.module_pattern, ps.cod_elp, gr.group_name
      ORDER BY gr.module_pattern, ps.cod_elp, gr.group_name
    `;

    const result = await pool.query(query, [CURRENT_ACADEMIC_YEAR]);
    res.json(result.rows);
  } catch (error) {
    console.error('Full stats export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Add a new grouping rule
router.post('/groups/rules', authenticateAdmin, async (req, res) => {
  try {
    const { module_pattern, group_name, range_start, range_end } = req.body;

    if (!module_pattern || !group_name || !range_start || !range_end) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await pool.query(
      `INSERT INTO grouping_rules (module_pattern, group_name, range_start, range_end)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [module_pattern.toUpperCase(), group_name, range_start.toUpperCase(), range_end.toUpperCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add grouping rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a grouping rule
router.delete('/groups/rules/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM grouping_rules WHERE id = $1', [id]);
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete grouping rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
      pool.query(`
        SELECT sync_timestamp FROM sync_log 
        ORDER BY sync_timestamp DESC 
        LIMIT 1
      `),
      pool.query(`
        SELECT COUNT(*) as recent_students FROM students 
        WHERE last_sync >= NOW() - INTERVAL '7 days'
      `),
      pool.query(`
        SELECT COUNT(*) as recent_grades FROM grades 
        WHERE last_sync >= NOW() - INTERVAL '7 days'
      `)
    ]);

    const [
      totalStudents, totalGrades, totalElements, 
      totalYears, totalPrograms, lastSync,
      recentStudents, recentGrades
    ] = stats;

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
      pool.query(`
        SELECT cod_anu, COUNT(*) as count 
        FROM students 
        GROUP BY cod_anu 
        ORDER BY cod_anu DESC
      `),
      pool.query(`
        SELECT lib_etp, COUNT(*) as count 
        FROM students 
        WHERE lib_etp IS NOT NULL
        GROUP BY lib_etp 
        ORDER BY count DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT cod_anu, COUNT(*) as count 
        FROM grades 
        GROUP BY cod_anu 
        ORDER BY cod_anu DESC
      `)
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

router.get('/students/search', authenticateAdmin, async (req, res) => {
  try {
    const { 
      search = '', 
      program = '', 
      year = '', 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(
        lib_nom_pat_ind ILIKE $${paramIndex} OR 
        lib_pr1_ind ILIKE $${paramIndex} OR
        cod_etu ILIKE $${paramIndex} OR
        cin_ind ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (program) {
      whereConditions.push(`lib_etp = $${paramIndex}`);
      params.push(program);
      paramIndex++;
    }
    
    if (year) {
      whereConditions.push(`cod_anu = $${paramIndex}`);
      params.push(year);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const countQuery = `SELECT COUNT(*) FROM students ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const dataQuery = `
      SELECT 
        id, cod_etu, 
        lib_nom_pat_ind || ' ' || lib_pr1_ind as full_name,
        cin_ind, lib_etp, cod_anu, last_sync,
        CASE 
          WHEN last_sync >= NOW() - INTERVAL '24 hours' THEN 'recent'
          WHEN last_sync >= NOW() - INTERVAL '7 days' THEN 'week'
          ELSE 'old'
        END as sync_status
      FROM students 
      ${whereClause}
      ORDER BY last_sync DESC, lib_nom_pat_ind, lib_pr1_ind
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataResult = await pool.query(dataQuery, [...params, limit, offset]);
    
    res.json({
      students: dataResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount / limit),
        total_count: totalCount,
        per_page: parseInt(limit),
        has_next: offset + parseInt(limit) < totalCount,
        has_prev: page > 1
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
    
    const studentResult = await pool.query(`
      SELECT * FROM students WHERE id = $1
    `, [id]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    const gradesResult = await pool.query(`
      SELECT 
        g.cod_anu, g.cod_ses, g.cod_elp, g.not_elp, g.cod_tre,
        ep.lib_elp, ep.lib_elp_arb, ep.element_type, ep.semester_number,
        g.last_sync as grade_last_sync
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = $1
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.semester_number, ep.lib_elp
    `, [student.cod_etu]);
    
    const statsResult = await pool.query(`
      SELECT 
        cod_anu, cod_ses,
        COUNT(*) as total_subjects,
        COUNT(CASE WHEN not_elp >= 10 THEN 1 END) as passed_subjects,
        COUNT(CASE WHEN not_elp < 10 THEN 1 END) as failed_subjects,
        COUNT(CASE WHEN not_elp IS NULL THEN 1 END) as absent_subjects,
        AVG(CASE WHEN not_elp IS NOT NULL THEN not_elp END) as average_grade
      FROM grades 
      WHERE cod_etu = $1
      GROUP BY cod_anu, cod_ses
      ORDER BY cod_anu DESC, cod_ses
    `, [student.cod_etu]);
    
    res.json({
      student: student,
      grades: gradesResult.rows,
      statistics: statsResult.rows.map(stat => ({
        ...stat,
        average_grade: stat.average_grade ? parseFloat(stat.average_grade).toFixed(2) : null
      }))
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
      SELECT 
        sync_type, records_processed, sync_status, 
        error_message, sync_timestamp
      FROM sync_log 
      ORDER BY sync_timestamp DESC 
      LIMIT $1
    `, [limit]);
    
    const lastSync = result.rows[0] || null;
    const recentSyncs = result.rows;
    
    const syncStats = await pool.query(`
      SELECT 
        sync_type,
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN sync_status = 'success' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as failed_syncs,
        MAX(sync_timestamp) as last_sync_time
      FROM sync_log 
      WHERE sync_timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY sync_type
      ORDER BY last_sync_time DESC
    `);
    
    res.json({
      last_sync: lastSync,
      recent_syncs: recentSyncs,
      sync_statistics: syncStats.rows
    });
    
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sync/manual', authenticateAdmin, async (req, res) => {
  try {
    const { syncStudents } = require('./sync-service');
    
    console.log(`Manual sync requested by admin: ${req.admin.username}`);
    
    await pool.query(`
      INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
      VALUES ('manual_trigger', 0, 'started', $1)
    `, [`Manual sync initiated by admin: ${req.admin.username}`]);
    
    syncStudents()
      .then(() => console.log(`Manual sync completed successfully`))
      .catch((error) => {
        console.error('Manual sync failed:', error);
        pool.query(`
          INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
          VALUES ('manual_sync', 0, 'error', $1)
        `, [`Sync failed: ${error.message}`]);
      });
    
    res.json({ 
      success: true, 
      message: 'Manual sync started.',
      initiated_by: req.admin.username
    });
    
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
    const healthChecks = {
      database: { postgresql: true },
      sync_health: { last_sync: null }
    };
    
    const syncInfo = await pool.query(`SELECT sync_timestamp FROM sync_log ORDER BY sync_timestamp DESC LIMIT 1`);
    if(syncInfo.rows.length > 0) {
      healthChecks.sync_health.last_sync = syncInfo.rows[0].sync_timestamp;
    }
    
    res.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      health_checks: healthChecks
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.get('/student-card-requests', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        scr.id,
        scr.status,
        scr.created_at,
        s.cod_etu,
        s.lib_nom_pat_ind,
        s.lib_pr1_ind,
        s.cin_ind
      FROM student_card_requests scr
      JOIN students s ON scr.cod_etu = s.cod_etu
      ORDER BY scr.created_at DESC
    `);

    res.json({
      requests: result.rows
    });

  } catch (error) {
    console.error('Get student card requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/system/stats', authenticateAdmin, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    
    const syncStats = await pool.query(`
      SELECT 
        DATE(sync_timestamp) as sync_date,
        sync_type,
        COUNT(*) as sync_count,
        SUM(records_processed) as total_records
      FROM sync_log
      WHERE sync_timestamp >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(sync_timestamp), sync_type
      ORDER BY sync_date DESC, sync_type
    `);
    
    res.json({
      sync_history: syncStats.rows,
      period_days: parseInt(period)
    });
    
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
    let params = [];
    let paramIndex = 1;

    if (year) {
      query += ` AND cod_anu = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }

    if (diploma) {
      query += ` AND cod_dip = $${paramIndex}`;
      params.push(diploma);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        cod_etu ILIKE $${paramIndex} OR 
        cin_ind ILIKE $${paramIndex} OR 
        nom_pat_ind ILIKE $${paramIndex} OR 
        prenom_ind ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (multiDiploma === 'true') {
      query += ` AND cod_etu IN (
        SELECT cod_etu 
        FROM laureats 
        GROUP BY cod_etu 
        HAVING COUNT(DISTINCT cod_dip) > 1
      )`;
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    
    query += ` ORDER BY cod_anu DESC, nom_pat_ind LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);

    res.json({
      laureats: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });

  } catch (error) {
    console.error('Get laureats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/laureats/stats', authenticateAdmin, async (req, res) => {
  try {
    const byYear = await pool.query(`
      SELECT cod_anu, COUNT(*) as count 
      FROM laureats 
      GROUP BY cod_anu 
      ORDER BY cod_anu DESC
    `);

    const byDiploma = await pool.query(`
      SELECT cod_dip, MIN(lib_dip) as lib_dip, COUNT(*) as count 
      FROM laureats 
      GROUP BY cod_dip 
      ORDER BY count DESC
    `);

    const multiDiploma = await pool.query(`
      SELECT COUNT(*) as count FROM (
        SELECT cod_etu 
        FROM laureats 
        GROUP BY cod_etu 
        HAVING COUNT(DISTINCT cod_dip) > 1
      ) as multi
    `);

    res.json({
      byYear: byYear.rows,
      byDiploma: byDiploma.rows,
      multiDiplomaCount: parseInt(multiDiploma.rows[0].count)
    });
  } catch (error) {
    console.error('Get laureats stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/laureats/student/:codEtu', authenticateAdmin, async (req, res) => {
  try {
    const { codEtu } = req.params;
    const result = await pool.query(`
      SELECT * FROM laureats
      WHERE cod_etu = $1
      ORDER BY cod_anu DESC
    `, [codEtu]);

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

// Helper: Parse Date smartly (US vs FR vs ISO)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  let s = dateStr.trim().replace(/"/g, ''); 
  
  // Reject non-date text
  if (!/^[\d\/\-\.]+$/.test(s)) return null;

  // 1. ISO Format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // 2. Year only
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;

  // 3. Complex formats (DD/MM/YYYY or MM/DD/YYYY)
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      let year, month, day;

      // Identify Year (usually > 1900)
      if (p2 > 1900) { 
          // Format XX/XX/YYYY
          year = p2;
          // Disambiguate Month/Day
          if (p1 > 12) { month = p0; day = p1; } // p1 > 12 implies it's Day => US Format
          else { day = p0; month = p1; }         // Default to FR Format
      } else if (p0 > 1900) {
          // Format YYYY/MM/DD
          year = p0; month = p1; day = p2;
      } else {
          return null; // Unknown format
      }

      // Validate bounds
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;

      // Return ISO string
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  return null;
};

// Helper: Split CSV respecting quotes
const splitCSV = (str, delimiter) => {
  const regex = new RegExp(`(?:^|${delimiter})(\"(?:[^\"]+|\"\")*\"|[^${delimiter}]*)`, 'g');
  let match;
  const result = [];
  while ((match = regex.exec(str))) {
      let val = match[1];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      result.push(val.trim());
  }
  return result;
};


// IMPORT EMPLOYEES (CSV/Excel)
router.post('/employees/import', authenticateAdmin, requireRH, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  let successCount = 0;
  let errorCount = 0;
  const errorsDetails = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);
    
    // Skip header row (start from i=1)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Detect Delimiter
      const delimiter = line.includes(';') ? ';' : ',';
      
      // Use Robust Splitter
      const cols = splitCSV(line, delimiter);

      // Skip invalid lines
      if (cols.length < 3) continue; 
      
      // Map columns based on your specific CSV structure
      // 0:CDETAB, 1:CDANN, 2:PPR, 3:NOMF, 4:PRNOMF, 5:SEXE, 6:DatNais, 7:Lieu
      // 8:EMAIL, 9:grade, 10:TPERS, 11:DatRec, 12:DatService, 13:DatENS, 14:Dept, 15:Dip, 16:Spec

      const ppr = cols[2];
      if (!ppr) continue; 

      const emp = {
        etablissement: cols[0],
        ppr: cols[2],
        nom: cols[3],
        prenom: cols[4],
        sexe: cols[5],
        date_naissance: parseDate(cols[6]),
        lieu_naissance: cols[7],
        email: cols[8],
        grade: cols[9],
        type: cols[10], // TPERS
        date_recrutement: parseDate(cols[11]),
        date_mise_en_service: parseDate(cols[12]),
        departement: cols[14], // Uses correct key 'departement'
        diplome: cols[15],
        specialite: cols[16]
      };

      try {
        await pool.query(`
          INSERT INTO employees (
            etablissement, ppr, nom, prenom, sexe, date_naissance, lieu_naissance, 
            email, grade, type, date_recrutement, date_mise_en_service, 
            departement, diplome, specialite
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (ppr) DO UPDATE SET
            nom = EXCLUDED.nom,
            prenom = EXCLUDED.prenom,
            grade = EXCLUDED.grade,
            type = EXCLUDED.type,
            email = EXCLUDED.email,
            departement = EXCLUDED.departement,
            diplome = EXCLUDED.diplome,
            specialite = EXCLUDED.specialite,
            date_recrutement = EXCLUDED.date_recrutement
        `, [
          emp.etablissement, emp.ppr, emp.nom, emp.prenom, emp.sexe, 
          emp.date_naissance, emp.lieu_naissance, emp.email, emp.grade, 
          emp.type, emp.date_recrutement, emp.date_mise_en_service,
          emp.departement, emp.diplome, emp.specialite
        ]);
        successCount++;
      } catch (err) {
        console.error(`Row ${i} Error:`, err.message);
        errorCount++;
        if (errorsDetails.length < 10) errorsDetails.push(`Ligne ${i}: ${err.message}`);
      }
    }

    fs.unlinkSync(filePath); // Cleanup file
    res.json({ message: 'Import processed', success: successCount, errors: errorCount, details: errorsDetails });

  } catch (error) {
    console.error('Import error:', error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// GET ALL EMPLOYEES
router.get('/employees', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = 'SELECT * FROM employees WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      query += ` AND (nom ILIKE $${paramIndex} OR prenom ILIKE $${paramIndex} OR ppr ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ADD NEW EMPLOYEE
router.post('/employees', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { ppr, nom, prenom, email, phone, type, department, grade, date_embauche, status } = req.body;

    if (!ppr || !nom || !prenom || !type) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // Mapping 'department' from frontend to 'departement' in DB
    const result = await pool.query(
      `INSERT INTO employees 
       (ppr, nom, prenom, email, phone, type, departement, grade, date_recrutement, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [ppr, nom, prenom, email, phone, type, department, grade, date_embauche, status || 'ACTIF']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce PPR existe déjà.' });
    }
    console.error('Add employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE EMPLOYEE
router.put('/employees/:id', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, phone, type, department, grade, status, date_embauche, diplome, specialite } = req.body;

    const result = await pool.query(
      `UPDATE employees 
       SET nom = $1, prenom = $2, email = $3, phone = $4, type = $5, 
           departement = $6, grade = $7, status = $8, date_recrutement = $9,
           diplome = $10, specialite = $11
       WHERE id = $12
       RETURNING *`,
      [nom, prenom, email, phone, type, department, grade, status, date_embauche, diplome, specialite, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE EMPLOYEE
router.delete('/employees/:id', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ message: 'Employé supprimé avec succès' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET EMPLOYEE STATISTICS
router.get('/employees/stats', authenticateAdmin, requireRH, async (req, res) => {
  try {
    const totalQuery = pool.query('SELECT COUNT(*) as count FROM employees');
    const typeQuery = pool.query('SELECT type, COUNT(*) as count FROM employees GROUP BY type');
    const activeQuery = pool.query("SELECT COUNT(*) as count FROM employees WHERE status = 'ACTIF'");
    const deptQuery = pool.query('SELECT COUNT(DISTINCT departement) as count FROM employees');

    const [total, byType, active, depts] = await Promise.all([
        totalQuery, typeQuery, activeQuery, deptQuery
    ]);

    // Format type stats (e.g., { PROF: 10, ADMINISTRATIF: 5 })
    const typeStats = byType.rows.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
    }, {});

    res.json({
      total: parseInt(total.rows[0].count),
      professors: typeStats['PROF'] || 0,
      admins: typeStats['Administratif'] || 0,
      active: parseInt(active.rows[0].count),
      departments: parseInt(depts.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting employee stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;