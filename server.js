const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// PostgreSQL connection
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to get academic year from semester code
function getAcademicYearFromSemester(semesterCode) {
  if (!semesterCode) return 0;
  
  const semesterMap = {
    'S1': 1, 'S2': 1,  // Année 1
    'S3': 2, 'S4': 2,  // Année 2
    'S5': 3, 'S6': 3,  // Année 3
    'S7': 4, 'S8': 4,  // Année 4
    'S9': 5, 'S10': 5, // Année 5
    'S11': 6, 'S12': 6 // Année 6
  };
  
  return semesterMap[semesterCode] || 0;
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the web interface at root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Student login (using CIN as username)
app.post('/auth/login', async (req, res) => {
  try {
    const { cin, password } = req.body;
    
    if (!cin || !password) {
      return res.status(400).json({ error: 'CIN and password are required' });
    }
    
    // Find student by CIN
    const result = await pool.query(
      'SELECT * FROM students WHERE cin_ind = $1',
      [cin]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const student = result.rows[0];
    
    // For demo purposes, we'll use a simple password check
    // In production, you should hash passwords properly
    const isValidPassword = password === student.cod_etu; // Using student code as password for demo
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        studentId: student.id,
        codEtu: student.cod_etu,
        cin: student.cin_ind
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      student: {
        id: student.id,
        cod_etu: student.cod_etu,
        nom: student.lib_nom_pat_ind,
        prenom: student.lib_pr1_ind,
        cin: student.cin_ind,
        etape: student.lib_etp
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current student info
app.get('/student/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [req.user.studentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = result.rows[0];
    
    res.json({
      student: {
        cod_etu: student.cod_etu,
        nom_complet: `${student.lib_nom_pat_ind} ${student.lib_pr1_ind}`,
        nom_arabe: `${student.lib_nom_ind_arb} ${student.lib_prn_ind_arb}`,
        cin: student.cin_ind,
        date_naissance: student.date_nai_ind,
        lieu_naissance: student.lib_vil_nai_etu,
        lieu_naissance_arabe: student.lib_vil_nai_etu_arb,
        sexe: student.cod_sex_etu,
        etape: student.lib_etp,
        licence_etape: student.lic_etp,
        annee_universitaire: student.cod_anu,
        diplome: student.cod_dip,
        nombre_inscriptions_cycle: student.nbr_ins_cyc,
        nombre_inscriptions_etape: student.nbr_ins_etp,
        nombre_inscriptions_diplome: student.nbr_ins_dip,
        derniere_mise_a_jour: student.updated_at
      }
    });
    
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current student grades with ELEMENT_PEDAGOGI integration
app.get('/student/grades', authenticateToken, async (req, res) => {
  try {
    const { year, session } = req.query;
    
    let query = `
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        g.not_elp,
        g.cod_tre,
        ep.cod_nel,
        ep.cod_pel,
        ep.lib_elp,
        ep.lic_elp,
        ep.lib_elp_arb
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
    `;
    
    let params = [req.user.studentId];
    let paramIndex = 2;
    
    if (year) {
      query += ` AND g.cod_anu = ${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    if (session) {
      query += ` AND g.cod_ses = ${paramIndex}`;
      params.push(session);
      paramIndex++;
    }
    
    query += ` ORDER BY g.cod_anu DESC, g.cod_ses, ep.cod_pel, ep.lib_elp`;
    
    const result = await pool.query(query, params);
    
    // Organize grades by academic year and semester
    const gradesByAcademicYear = {};
    
    result.rows.forEach(grade => {
      const studyYear = grade.cod_anu;
      const session = grade.cod_ses;
      const semester = grade.cod_pel; // S1, S2, S3, etc.
      const academicYear = getAcademicYearFromSemester(semester);
      
      // Skip if we can't determine academic year
      if (academicYear === 0) return;
      
      // Initialize structure
      if (!gradesByAcademicYear[studyYear]) {
        gradesByAcademicYear[studyYear] = {};
      }
      
      if (!gradesByAcademicYear[studyYear][session]) {
        gradesByAcademicYear[studyYear][session] = {};
      }
      
      if (!gradesByAcademicYear[studyYear][session][academicYear]) {
        gradesByAcademicYear[studyYear][session][academicYear] = {};
      }
      
      if (!gradesByAcademicYear[studyYear][session][academicYear][semester]) {
        gradesByAcademicYear[studyYear][session][academicYear][semester] = [];
      }
      
      gradesByAcademicYear[studyYear][session][academicYear][semester].push({
        cod_elp: grade.cod_elp,
        lib_elp: grade.lib_elp || 'Module non trouvé',
        lib_elp_arb: grade.lib_elp_arb || 'الوحدة غير موجودة',
        lic_elp: grade.lic_elp,
        cod_nel: grade.cod_nel,
        cod_pel: grade.cod_pel,
        not_elp: grade.not_elp,
        cod_tre: grade.cod_tre
      });
    });
    
    res.json({
      grades: gradesByAcademicYear,
      total_grades: result.rows.length
    });
    
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student grade statistics
app.get('/student/grade-stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        g.cod_anu,
        g.cod_ses,
        COUNT(*) as total_subjects,
        AVG(CASE WHEN g.not_elp IS NOT NULL THEN g.not_elp END) as average_grade,
        COUNT(CASE WHEN g.not_elp >= 10 THEN 1 END) as passed_subjects,
        COUNT(CASE WHEN g.not_elp < 10 THEN 1 END) as failed_subjects
      FROM grades g 
      WHERE g.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
      GROUP BY g.cod_anu, g.cod_ses
      ORDER BY g.cod_anu DESC, g.cod_ses
    `, [req.user.studentId]);
    
    res.json({
      statistics: result.rows.map(stat => ({
        academic_year: stat.cod_anu,
        session: stat.cod_ses,
        total_subjects: parseInt(stat.total_subjects),
        average_grade: stat.average_grade ? parseFloat(stat.average_grade).toFixed(2) : null,
        passed_subjects: parseInt(stat.passed_subjects),
        failed_subjects: parseInt(stat.failed_subjects)
      }))
    });
    
  } catch (error) {
    console.error('Get grade stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search students (admin endpoint)
app.get('/students/search', authenticateToken, async (req, res) => {
  try {
    const { cin, nom, prenom, etape, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM students WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (cin) {
      query += ` AND cin_ind ILIKE ${paramIndex}`;
      params.push(`%${cin}%`);
      paramIndex++;
    }
    
    if (nom) {
      query += ` AND lib_nom_pat_ind ILIKE ${paramIndex}`;
      params.push(`%${nom}%`);
      paramIndex++;
    }
    
    if (prenom) {
      query += ` AND lib_pr1_ind ILIKE ${paramIndex}`;
      params.push(`%${prenom}%`);
      paramIndex++;
    }
    
    if (etape) {
      query += ` AND cod_etp = ${paramIndex}`;
      params.push(etape);
      paramIndex++;
    }
    
    query += ` ORDER BY lib_nom_pat_ind, lib_pr1_ind LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      students: result.rows.map(student => ({
        cod_etu: student.cod_etu,
        nom_complet: `${student.lib_nom_pat_ind} ${student.lib_pr1_ind}`,
        cin: student.cin_ind,
        etape: student.lib_etp,
        annee: student.cod_anu
      })),
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sync status
app.get('/sync/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM sync_log 
      ORDER BY sync_timestamp DESC 
      LIMIT 10
    `);
    
    res.json({
      sync_history: result.rows,
      last_sync: result.rows[0]?.sync_timestamp || null
    });
    
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Statistics endpoint
app.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalStudents = await pool.query('SELECT COUNT(*) FROM students');
    const totalGrades = await pool.query('SELECT COUNT(*) FROM grades');
    const totalElements = await pool.query('SELECT COUNT(*) FROM element_pedagogi');
    const byEtape = await pool.query(`
      SELECT lib_etp, COUNT(*) as count 
      FROM students 
      GROUP BY lib_etp 
      ORDER BY count DESC
    `);
    const byYear = await pool.query(`
      SELECT cod_anu, COUNT(*) as count 
      FROM students 
      GROUP BY cod_anu 
      ORDER BY cod_anu DESC
    `);
    
    res.json({
      total_students: parseInt(totalStudents.rows[0].count),
      total_grades: parseInt(totalGrades.rows[0].count),
      total_elements: parseInt(totalElements.rows[0].count),
      by_etape: byEtape.rows,
      by_year: byYear.rows
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get element pedagogi data (for debugging)
app.get('/element-pedagogi', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(`
      SELECT * FROM element_pedagogi 
      ORDER BY cod_pel, lib_elp
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json({
      elements: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Get element pedagogi error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});