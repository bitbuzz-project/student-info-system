const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

// PostgreSQL connection (using same config as your server.js)
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

// Admin credentials (you can change these in your .env file)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
    if (err || !admin.isAdmin) {
      return res.status(403).json({ error: 'Invalid admin token' });
    }
    req.admin = admin;
    next();
  });
};

// ===== AUTHENTICATION ROUTES =====

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const adminToken = jwt.sign(
        { 
          username: username,
          isAdmin: true,
          loginTime: new Date().toISOString()
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      console.log(`Admin login: ${username} at ${new Date().toISOString()}`);
      
      res.json({
        success: true,
        token: adminToken,
        message: 'Admin login successful',
        expiresIn: '8h',
        user: {
          username: username,
          role: 'admin'
        }
      });
    } else {
      console.log(`Failed admin login attempt: ${username} at ${new Date().toISOString()}`);
      res.status(401).json({ 
        error: 'Invalid admin credentials'
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout
router.post('/logout', authenticateAdmin, (req, res) => {
  console.log(`Admin logout: ${req.admin.username} at ${new Date().toISOString()}`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Verify admin token
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({ 
    valid: true, 
    admin: {
      username: req.admin.username,
      loginTime: req.admin.loginTime,
      role: 'admin'
    }
  });
});

// ===== DASHBOARD & STATS ROUTES =====

// Get main dashboard statistics
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

// Get data overview by year and program
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

// ===== STUDENT MANAGEMENT ROUTES =====

// Search students with pagination
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
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM students ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get paginated results
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

// Get detailed student information
router.get('/students/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get student info
    const studentResult = await pool.query(`
      SELECT * FROM students WHERE id = $1
    `, [id]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    // Get student grades with element info
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
    
    // Get grade statistics
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

// ===== SYNC MANAGEMENT ROUTES =====

// Get sync status and history
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
    
    // Get sync statistics
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

// Trigger manual sync
router.post('/sync/manual', authenticateAdmin, async (req, res) => {
  try {
    // Import the sync function
    const { syncStudents } = require('./sync-service');
    
    console.log(`Manual sync requested by admin: ${req.admin.username} at ${new Date().toISOString()}`);
    
    // Log the sync request
    await pool.query(`
      INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
      VALUES ('manual_trigger', 0, 'started', $1)
    `, [`Manual sync initiated by admin: ${req.admin.username}`]);
    
    // Run sync asynchronously
    syncStudents()
      .then(() => {
        console.log(`Manual sync completed successfully (initiated by ${req.admin.username})`);
      })
      .catch((error) => {
        console.error('Manual sync failed:', error);
        pool.query(`
          INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
          VALUES ('manual_sync', 0, 'error', $1)
        `, [`Sync failed (initiated by ${req.admin.username}): ${error.message}`]);
      });
    
    res.json({ 
      success: true, 
      message: 'Manual sync started. Check sync logs for progress.',
      initiated_by: req.admin.username
    });
    
  } catch (error) {
    console.error('Error starting manual sync:', error);
    
    await pool.query(`
      INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
      VALUES ('manual_sync', 0, 'error', $1)
    `, [`Failed to start sync (by ${req.admin.username}): ${error.message}`]);
    
    res.status(500).json({ error: 'Failed to start manual sync' });
  }
});

// ===== SYSTEM HEALTH ROUTES =====

// Database health check
router.get('/system/health', authenticateAdmin, async (req, res) => {
  try {
    const healthChecks = {
      database: {
        postgresql: false,
        tables_exist: false,
        recent_activity: false
      },
      data_integrity: {
        orphaned_grades: 0,
        missing_elements: 0,
        duplicate_students: 0
      },
      sync_health: {
        last_sync: null,
        sync_frequency: 'unknown'
      }
    };
    
    // Check PostgreSQL connection
    try {
      await pool.query('SELECT 1');
      healthChecks.database.postgresql = true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }
    
    // Check if main tables exist and have data
    try {
      const tables = await pool.query(`
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.tables t2 
                WHERE t2.table_name = tables.table_name) as exists,
               CASE tables.table_name
                 WHEN 'students' THEN (SELECT COUNT(*) FROM students)
                 WHEN 'grades' THEN (SELECT COUNT(*) FROM grades)
                 WHEN 'element_pedagogi' THEN (SELECT COUNT(*) FROM element_pedagogi)
                 WHEN 'sync_log' THEN (SELECT COUNT(*) FROM sync_log)
               END as record_count
        FROM (VALUES ('students'), ('grades'), ('element_pedagogi'), ('sync_log')) as tables(table_name)
      `);
      
      healthChecks.database.tables_exist = tables.rows.every(row => 
        row.exists > 0 && row.record_count > 0
      );
    } catch (error) {
      console.error('Table check failed:', error);
    }
    
    // Check recent activity
    try {
      const recentActivity = await pool.query(`
        SELECT COUNT(*) as recent_updates
        FROM students 
        WHERE last_sync >= NOW() - INTERVAL '7 days'
      `);
      healthChecks.database.recent_activity = 
        parseInt(recentActivity.rows[0].recent_updates) > 0;
    } catch (error) {
      console.error('Recent activity check failed:', error);
    }
    
    // Check data integrity
    try {
      const integrityChecks = await Promise.all([
        // Orphaned grades
        pool.query(`
          SELECT COUNT(*) FROM grades g
          LEFT JOIN students s ON g.cod_etu = s.cod_etu
          WHERE s.cod_etu IS NULL
        `),
        // Missing elements
        pool.query(`
          SELECT COUNT(*) FROM grades g
          LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
          WHERE ep.cod_elp IS NULL
        `),
        // Duplicate students
        pool.query(`
          SELECT COUNT(*) FROM (
            SELECT cod_etu, COUNT(*) 
            FROM students 
            GROUP BY cod_etu 
            HAVING COUNT(*) > 1
          ) duplicates
        `)
      ]);
      
      healthChecks.data_integrity.orphaned_grades = 
        parseInt(integrityChecks[0].rows[0].count);
      healthChecks.data_integrity.missing_elements = 
        parseInt(integrityChecks[1].rows[0].count);
      healthChecks.data_integrity.duplicate_students = 
        parseInt(integrityChecks[2].rows[0].count);
    } catch (error) {
      console.error('Data integrity check failed:', error);
    }
    
    // Check sync health
    try {
      const syncInfo = await pool.query(`
        SELECT 
          sync_timestamp,
          sync_status,
          EXTRACT(EPOCH FROM (NOW() - sync_timestamp))/3600 as hours_since_sync
        FROM sync_log 
        WHERE sync_type IN ('students', 'grades')
        ORDER BY sync_timestamp DESC 
        LIMIT 1
      `);
      
      if (syncInfo.rows.length > 0) {
        const lastSync = syncInfo.rows[0];
        healthChecks.sync_health.last_sync = lastSync.sync_timestamp;
        
        const hoursSince = parseFloat(lastSync.hours_since_sync);
        if (hoursSince < 24) {
          healthChecks.sync_health.sync_frequency = 'daily';
        } else if (hoursSince < 168) {
          healthChecks.sync_health.sync_frequency = 'weekly';
        } else {
          healthChecks.sync_health.sync_frequency = 'outdated';
        }
      }
    } catch (error) {
      console.error('Sync health check failed:', error);
    }
    
    res.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      checked_by: req.admin.username,
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
// Get system statistics
router.get('/system/stats', authenticateAdmin, async (req, res) => {
  try {
    const { period = 30 } = req.query; // days
    
    // Get sync statistics for the period
    const syncStats = await pool.query(`
      SELECT 
        DATE(sync_timestamp) as sync_date,
        sync_type,
        COUNT(*) as sync_count,
        SUM(records_processed) as total_records,
        COUNT(CASE WHEN sync_status = 'success' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as failed_syncs
      FROM sync_log
      WHERE sync_timestamp >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(sync_timestamp), sync_type
      ORDER BY sync_date DESC, sync_type
    `);
    
    // Get performance metrics
    const performanceStats = await pool.query(`
      SELECT 
        sync_type,
        AVG(records_processed) as avg_records_per_sync,
        MAX(records_processed) as max_records_per_sync,
        MIN(records_processed) as min_records_per_sync,
        COUNT(*) as total_syncs
      FROM sync_log
      WHERE sync_status = 'success' 
        AND sync_timestamp >= NOW() - INTERVAL '${period} days'
        AND records_processed > 0
      GROUP BY sync_type
    `);
    
    res.json({
      sync_history: syncStats.rows,
      performance_metrics: performanceStats.rows.map(row => ({
        ...row,
        avg_records_per_sync: parseFloat(row.avg_records_per_sync).toFixed(2)
      })),
      period_days: parseInt(period)
    });
    
  } catch (error) {
    console.error('Error getting system statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;