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
// Add these endpoints to your server.js file

// Official Documents endpoint - Returns final grades from RESULTAT_ELP
// Add this to your server.js file to fix the official documents endpoint
// This is a temporary solution that uses the existing grades table

// Official Documents endpoint - Returns grades organized for official documents
app.get('/student/official-documents', authenticateToken, async (req, res) => {
  try {
    const { semester } = req.query;
    
    // Base query to get grades (using existing grades table)
    let query = `
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        COALESCE(g.not_epr, g.not_elp) as not_elp,
        g.cod_tre,
        ep.lib_elp,
        ep.lib_elp_arb,
        ep.element_type,
        ep.semester_number,
        ep.cod_pel,
        ep.cod_nel
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
    `;
    
    let params = [req.user.studentId];
    let paramIndex = 2;
    
    if (semester) {
      query += ` AND ep.semester_number = $${paramIndex}`;
      params.push(semester);
      paramIndex++;
    }
    
    query += ` ORDER BY g.cod_anu DESC, g.cod_ses, ep.semester_number, ep.lib_elp`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json({
        documents: {},
        available_semesters: [],
        total_semesters: 0
      });
    }
    
    // Organize grades by semester for official documents
    const documentsBySemester = {};
    const availableSemesters = new Set();
    
    result.rows.forEach(grade => {
      const semesterNumber = grade.semester_number;
      if (!semesterNumber) return;
      
      const semesterKey = `S${semesterNumber}`;
      availableSemesters.add(semesterKey);
      
      if (!documentsBySemester[semesterKey]) {
        documentsBySemester[semesterKey] = {
          subjects: [],
          statistics: {
            total_subjects: 0,
            passed_subjects: 0,
            failed_subjects: 0,
            absent_subjects: 0,
            average_grade: null
          }
        };
      }
      
      // Calculate if passed
      const gradeValue = grade.not_elp;
      const isPassed = gradeValue !== null && parseFloat(gradeValue) >= 10;
      
      documentsBySemester[semesterKey].subjects.push({
        cod_elp: grade.cod_elp,
        lib_elp: grade.lib_elp || 'Module non trouvé',
        lib_elp_arb: grade.lib_elp_arb || grade.lib_elp || 'الوحدة غير موجودة',
        not_elp: grade.not_elp,
        cod_tre: grade.cod_tre,
        final_session: grade.cod_ses === '1' ? 1 : 2,
        is_passed: isPassed,
        element_type: grade.element_type
      });
      
      // Update statistics
      const stats = documentsBySemester[semesterKey].statistics;
      stats.total_subjects++;
      
      if (gradeValue !== null) {
        if (parseFloat(gradeValue) >= 10) {
          stats.passed_subjects++;
        } else {
          stats.failed_subjects++;
        }
      } else {
        stats.absent_subjects++;
      }
    });
    
    // Calculate averages
    Object.keys(documentsBySemester).forEach(semesterKey => {
      const semester = documentsBySemester[semesterKey];
      const validGrades = semester.subjects.filter(s => s.not_elp !== null);
      
      if (validGrades.length > 0) {
        const sum = validGrades.reduce((acc, s) => acc + parseFloat(s.not_elp), 0);
        semester.statistics.average_grade = (sum / validGrades.length).toFixed(2);
      }
    });
    
    res.json({
      documents: documentsBySemester,
      available_semesters: Array.from(availableSemesters).sort(),
      total_semesters: availableSemesters.size
    });
    
  } catch (error) {
    console.error('Get official documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PDF Generation endpoint for transcripts
app.get('/student/transcript/:semester/pdf', authenticateToken, async (req, res) => {
  try {
    const { semester } = req.params;
    
    // Get student info
    const studentResult = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [req.user.studentId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    // Get semester grades
    const gradesResult = await pool.query(`
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        COALESCE(g.not_epr, g.not_elp) as not_elp,
        g.cod_tre,
        ep.lib_elp,
        ep.lib_elp_arb,
        ep.element_type,
        ep.semester_number
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = $1 AND ep.semester_number = $2
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.lib_elp
    `, [student.cod_etu, semester]);
    
    if (gradesResult.rows.length === 0) {
      return res.status(404).json({ error: 'No grades found for this semester' });
    }
    
    // Simple PDF generation without external libraries
    // Generate HTML that can be converted to PDF by browser
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relevé de Notes - S${semester}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            direction: ltr;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border-radius: 10px;
          }
          .student-info { 
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
          }
          .grades-table { 
            width: 100%; 
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .grades-table th, .grades-table td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left; 
          }
          .grades-table th { 
            background-color: #3498db; 
            color: white;
            font-weight: bold;
          }
          .grades-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            padding: 20px;
            border-top: 2px solid #3498db;
            color: #666;
          }
          .stamp {
            float: right;
            width: 100px;
            height: 100px;
            border: 2px solid #3498db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #3498db;
          }
          @media print { 
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RELEVÉ DE NOTES OFFICIEL</h1>
          <h2>كشف النقط الرسمي</h2>
          <p>Faculté des Sciences Juridiques et Politiques - Université Hassan 1er - Settat</p>
          <p>كلية العلوم القانونية والسياسية - جامعة الحسن الأول - سطات</p>
        </div>
        
        <div class="student-info">
          <h3>معلومات الطالب / Informations Étudiant</h3>
          <p><strong>الاسم الكامل / Nom complet:</strong> ${student.lib_nom_pat_ind} ${student.lib_pr1_ind}</p>
          <p><strong>رقم الطالب / Code Étudiant:</strong> ${student.cod_etu}</p>
          <p><strong>التخصص / Spécialité:</strong> ${student.lib_etp || 'N/A'}</p>
          <p><strong>السداسي / Semestre:</strong> S${semester}</p>
          <p><strong>تاريخ الإصدار / Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <table class="grades-table">
          <thead>
            <tr>
              <th>رمز المادة<br>Code</th>
              <th>اسم المادة<br>Module</th>
              <th>النقطة<br>Note</th>
              <th>النتيجة<br>Résultat</th>
              <th>الدورة<br>Session</th>
            </tr>
          </thead>
          <tbody>
            ${gradesResult.rows.map(grade => `
              <tr>
                <td>${grade.cod_elp || ''}</td>
                <td>${grade.lib_elp || 'Module non trouvé'}</td>
                <td style="text-align: center; font-weight: bold; color: ${grade.not_elp !== null ? (parseFloat(grade.not_elp) >= 10 ? '#27ae60' : '#e74c3c') : '#95a5a6'};">
                  ${grade.not_elp !== null ? parseFloat(grade.not_elp).toFixed(2) : 'ABS'}
                </td>
                <td>${grade.cod_tre || '-'}</td>
                <td>${grade.cod_ses === '1' ? 'Normale' : 'Rattrapage'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <div class="stamp">
            CACHET<br>
            UNIVERSITÉ<br>
            HASSAN 1ER
          </div>
          <p>هذا الكشف رسمي ومُصدق من النظام الأكاديمي للجامعة</p>
          <p>Ce relevé est officiel et certifié par le système académique de l'université</p>
          <p style="font-size: 12px; color: #999;">
            Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimer</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Fermer</button>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Print transcript endpoint
app.get('/student/transcript/:semester/print', authenticateToken, async (req, res) => {
  try {
    const { semester } = req.params;
    
    // Get the same data as PDF endpoint
    const studentResult = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [req.user.studentId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    const gradesResult = await pool.query(`
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        COALESCE(g.not_epr, g.not_elp) as not_elp,
        g.cod_tre,
        ep.lib_elp,
        ep.lib_elp_arb,
        ep.element_type,
        ep.semester_number
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = $1 AND ep.semester_number = $2
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.lib_elp
    `, [student.cod_etu, semester]);
    
    // Generate print-friendly HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relevé de Notes - S${semester}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            direction: ltr;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border-radius: 10px;
          }
          .student-info { 
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
          }
          .grades-table { 
            width: 100%; 
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .grades-table th, .grades-table td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left; 
          }
          .grades-table th { 
            background-color: #3498db; 
            color: white;
            font-weight: bold;
          }
          .grades-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            padding: 20px;
            border-top: 2px solid #3498db;
            color: #666;
          }
          @media print { 
            .no-print { display: none; } 
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RELEVÉ DE NOTES OFFICIEL</h1>
          <h2>كشف النقط الرسمي</h2>
          <p>Faculté des Sciences Juridiques et Politiques - Université Hassan 1er - Settat</p>
        </div>
        
        <div class="student-info">
          <p><strong>Nom:</strong> ${student.lib_nom_pat_ind} ${student.lib_pr1_ind}</p>
          <p><strong>Code Étudiant:</strong> ${student.cod_etu}</p>
          <p><strong>Semestre:</strong> S${semester}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <table class="grades-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Module</th>
              <th>Note</th>
              <th>Résultat</th>
            </tr>
          </thead>
          <tbody>
            ${gradesResult.rows.map(grade => `
              <tr>
                <td>${grade.cod_elp || ''}</td>
                <td>${grade.lib_elp || ''}</td>
                <td style="text-align: center; font-weight: bold;">
                  ${grade.not_elp !== null ? parseFloat(grade.not_elp).toFixed(2) : 'ABS'}
                </td>
                <td>${grade.cod_tre || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Ce relevé est officiel et certifié par le système académique</p>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()">Imprimer</button>
          <button onclick="window.close()">Fermer</button>
        </div>
        
        <script>
          // Auto-print when page loads
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(printHTML);
    
  } catch (error) {
    console.error('Print transcript error:', error);
    res.status(500).json({ error: 'Failed to generate print view' });
  }
});

// PDF Generation endpoint for transcripts
app.get('/student/transcript/:semester/pdf', authenticateToken, async (req, res) => {
  try {
    const { semester } = req.params;
    
    // Get student info
    const studentResult = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [req.user.studentId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    // Get semester grades
    const gradesResult = await pool.query(`
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        g.not_elp,
        g.cod_tre,
        ep.lib_elp,
        ep.lib_elp_arb,
        ep.element_type,
        ep.semester_number
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = $1 AND ep.semester_number = $2
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.lib_elp
    `, [student.cod_etu, semester]);
    
    if (gradesResult.rows.length === 0) {
      return res.status(404).json({ error: 'No grades found for this semester' });
    }
    
    // Create PDF using jsPDF (server-side)
    const PDFDocument = require('jspdf');
    const doc = new PDFDocument();
    
    // Set up PDF content
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFontSize(20);
    doc.text('RELEVÉ DE NOTES OFFICIEL', pageWidth/2, 30, { align: 'center' });
    doc.setFontSize(16);
    doc.text('كشف النقط الرسمي', pageWidth/2, 45, { align: 'center' });
    
    // Student info
    doc.setFontSize(12);
    doc.text(`Nom: ${student.lib_nom_pat_ind} ${student.lib_pr1_ind}`, 20, 70);
    doc.text(`Code Étudiant: ${student.cod_etu}`, 20, 85);
    doc.text(`Semestre: S${semester}`, 20, 100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 115);
    
    // Grades table
    let y = 140;
    doc.setFontSize(10);
    doc.text('Code', 20, y);
    doc.text('Module', 50, y);
    doc.text('Note', 140, y);
    doc.text('Résultat', 170, y);
    
    y += 10;
    doc.line(20, y, pageWidth - 20, y);
    y += 5;
    
    gradesResult.rows.forEach(grade => {
      doc.text(grade.cod_elp || '', 20, y);
      doc.text((grade.lib_elp || '').substring(0, 30), 50, y);
      doc.text(grade.not_elp !== null ? grade.not_elp.toString() : 'ABS', 140, y);
      doc.text(grade.cod_tre || '', 170, y);
      y += 15;
    });
    
    // Generate PDF buffer
    const pdfBuffer = doc.output();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="transcript_S${semester}_${student.cod_etu}.pdf"`);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Print transcript endpoint
app.get('/student/transcript/:semester/print', authenticateToken, async (req, res) => {
  try {
    const { semester } = req.params;
    
    // Get the same data as PDF endpoint
    const studentResult = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [req.user.studentId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    const gradesResult = await pool.query(`
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        g.not_elp,
        g.cod_tre,
        ep.lib_elp,
        ep.lib_elp_arb,
        ep.element_type,
        ep.semester_number
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = $1 AND ep.semester_number = $2
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.lib_elp
    `, [student.cod_etu, semester]);
    
    // Generate print-friendly HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relevé de Notes - S${semester}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .student-info { margin-bottom: 20px; }
          .grades-table { width: 100%; border-collapse: collapse; }
          .grades-table th, .grades-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .grades-table th { background-color: #f2f2f2; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RELEVÉ DE NOTES OFFICIEL</h1>
          <h2>كشف النقط الرسمي</h2>
          <p>Faculté des Sciences Juridiques et Politiques - Settat</p>
        </div>
        
        <div class="student-info">
          <p><strong>Nom:</strong> ${student.lib_nom_pat_ind} ${student.lib_pr1_ind}</p>
          <p><strong>Code Étudiant:</strong> ${student.cod_etu}</p>
          <p><strong>Semestre:</strong> S${semester}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <table class="grades-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Module</th>
              <th>Note</th>
              <th>Résultat</th>
            </tr>
          </thead>
          <tbody>
            ${gradesResult.rows.map(grade => `
              <tr>
                <td>${grade.cod_elp || ''}</td>
                <td>${grade.lib_elp || ''}</td>
                <td>${grade.not_elp !== null ? grade.not_elp : 'ABS'}</td>
                <td>${grade.cod_tre || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="no-print" style="margin-top: 20px;">
          <button onclick="window.print()">Imprimer</button>
          <button onclick="window.close()">Fermer</button>
        </div>
        
        <script>
          // Auto-print when page loads
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(printHTML);
    
  } catch (error) {
    console.error('Print transcript error:', error);
    res.status(500).json({ error: 'Failed to generate print view' });
  }
});

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
// Get current student grades from RESULTAT_EPR (current year grades)
app.get('/student/grades', authenticateToken, async (req, res) => {
  try {
    const { year, session } = req.query;
    
    // Updated query to use the new column names and prioritize not_epr
    let query = `
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        COALESCE(g.not_epr, g.not_elp) as not_elp,
        g.cod_tre,
        ep.cod_nel,
        ep.cod_pel,
        ep.lib_elp,
        ep.lic_elp,
        ep.lib_elp_arb,
        ep.element_type,
        ep.semester_number,
        eh.cod_elp_pere,
        parent_ep.lib_elp as parent_lib_elp,
        parent_ep.cod_pel as parent_cod_pel,
        parent_ep.semester_number as parent_semester_number
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      LEFT JOIN element_hierarchy eh ON g.cod_elp = eh.cod_elp_fils
      LEFT JOIN element_pedagogi parent_ep ON eh.cod_elp_pere = parent_ep.cod_elp
      WHERE g.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
    `;
    
    let params = [req.user.studentId];
    let paramIndex = 2;
    
    if (year) {
      query += ` AND g.cod_anu = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }
    
    if (session) {
      query += ` AND g.cod_ses = $${paramIndex}`;
      params.push(session);
      paramIndex++;
    }
    
    query += ` ORDER BY g.cod_anu DESC, g.cod_ses, ep.semester_number, ep.lib_elp`;
    
    const result = await pool.query(query, params);
    
    // Rest of the function stays the same...
    // [Keep all the existing logic for organizing grades by structure]
    
    // Helper function to determine session type based on semester
    const getSessionType = (semesterNumber) => {
      if (!semesterNumber) return 'unknown';
      // S1, S3, S5 = Automne, S2, S4, S6 = Printemps
      return (semesterNumber % 2 === 1) ? 'automne' : 'printemps';
    };
    
    // Helper function to get academic year from semester
    const getAcademicYear = (semesterNumber) => {
      if (!semesterNumber) return 0;
      return Math.ceil(semesterNumber / 2);
    };
    
    // Organize grades by academic year, session type, and semester
    const gradesByStructure = {};
    let hasArabicNames = false;
    
    result.rows.forEach(grade => {
      const studyYear = grade.cod_anu;
      const sessionCode = grade.cod_ses;
      
      // Determine semester number - try multiple sources
      let semesterNumber = grade.semester_number || grade.parent_semester_number;
      
      // If no semester number found, try to extract from codes
      if (!semesterNumber) {
        const semMatch = (grade.cod_pel || grade.parent_cod_pel || grade.cod_elp || '').match(/S(\d+)/);
        if (semMatch) {
          semesterNumber = parseInt(semMatch[1]);
        }
      }
      
      // Skip if we can't determine semester
      if (!semesterNumber) {
        console.warn(`Cannot determine semester for grade: ${grade.cod_elp} - ${grade.lib_elp}`);
        return;
      }
      
      const sessionType = getSessionType(semesterNumber);
      const academicYear = getAcademicYear(semesterNumber);
      const semesterCode = `S${semesterNumber}`;
      
      // Check for Arabic names
      if (grade.lib_elp_arb && grade.lib_elp_arb.trim() !== '') {
        hasArabicNames = true;
      }
      
      // Initialize structure
      if (!gradesByStructure[studyYear]) {
        gradesByStructure[studyYear] = {};
      }
      
      if (!gradesByStructure[studyYear][sessionCode]) {
        gradesByStructure[studyYear][sessionCode] = {};
      }
      
      if (!gradesByStructure[studyYear][sessionCode][sessionType]) {
        gradesByStructure[studyYear][sessionCode][sessionType] = {};
      }
      
      if (!gradesByStructure[studyYear][sessionCode][sessionType][academicYear]) {
        gradesByStructure[studyYear][sessionCode][sessionType][academicYear] = {};
      }
      
      if (!gradesByStructure[studyYear][sessionCode][sessionType][academicYear][semesterCode]) {
        gradesByStructure[studyYear][sessionCode][sessionType][academicYear][semesterCode] = [];
      }
      
      // Determine if this is a module or a subject
      const isModule = grade.element_type === 'MODULE' || grade.cod_nel === 'MOD';
      const parentInfo = grade.parent_lib_elp ? {
        cod_elp: grade.cod_elp_pere,
        lib_elp: grade.parent_lib_elp,
        cod_pel: grade.parent_cod_pel
      } : null;
      
      gradesByStructure[studyYear][sessionCode][sessionType][academicYear][semesterCode].push({
        cod_elp: grade.cod_elp,
        lib_elp: grade.lib_elp || 'Module non trouvé',
        lib_elp_arb: grade.lib_elp_arb || grade.lib_elp || 'الوحدة غير موجودة',
        lic_elp: grade.lic_elp,
        cod_nel: grade.cod_nel,
        cod_pel: grade.cod_pel,
        not_elp: grade.not_elp,
        cod_tre: grade.cod_tre,
        element_type: grade.element_type,
        is_module: isModule,
        parent_info: parentInfo,
        semester_number: semesterNumber,
        session_type: sessionType,
        academic_year: academicYear
      });
    });
    
    res.json({
      grades: gradesByStructure,
      total_grades: result.rows.length,
      has_arabic_names: hasArabicNames,
      structure_info: {
        sessions: {
          'automne': 'Session d\'Automne (S1, S3, S5)',
          'printemps': 'Session de Printemps (S2, S4, S6)'
        }
      }
    });
    
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get official documents/transcripts from RESULTAT_ELP (final consolidated grades)


// Get student grade statistics
app.get('/student/grade-stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        g.cod_anu,
        g.cod_ses,
        ep.semester_number,
        CASE 
          WHEN ep.semester_number % 2 = 1 THEN 'automne'
          WHEN ep.semester_number % 2 = 0 THEN 'printemps'
          ELSE 'unknown'
        END as session_type,
        CEIL(ep.semester_number::float / 2) as academic_year,
        COUNT(*) as total_subjects,
        AVG(CASE WHEN g.not_elp IS NOT NULL THEN g.not_elp END) as average_grade,
        COUNT(CASE WHEN g.not_elp >= 10 THEN 1 END) as passed_subjects,
        COUNT(CASE WHEN g.not_elp < 10 THEN 1 END) as failed_subjects,
        COUNT(CASE WHEN g.not_elp IS NULL THEN 1 END) as absent_subjects
      FROM grades g 
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      LEFT JOIN element_hierarchy eh ON g.cod_elp = eh.cod_elp_fils
      LEFT JOIN element_pedagogi parent_ep ON eh.cod_elp_pere = parent_ep.cod_elp
      WHERE g.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
      AND (ep.semester_number IS NOT NULL OR parent_ep.semester_number IS NOT NULL)
      GROUP BY g.cod_anu, g.cod_ses, ep.semester_number
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.semester_number
    `, [req.user.studentId]);
    
    res.json({
      statistics: result.rows.map(stat => ({
        academic_year: stat.cod_anu,
        session: stat.cod_ses,
        semester_number: stat.semester_number,
        session_type: stat.session_type,
        logical_academic_year: stat.academic_year,
        total_subjects: parseInt(stat.total_subjects),
        average_grade: stat.average_grade ? parseFloat(stat.average_grade).toFixed(2) : null,
        passed_subjects: parseInt(stat.passed_subjects),
        failed_subjects: parseInt(stat.failed_subjects),
        absent_subjects: parseInt(stat.absent_subjects)
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


// Add these admin authentication routes to your server.js file

// Admin credentials (in production, store these securely in environment variables)
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

// Admin login endpoint
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check admin credentials
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Generate admin JWT token
      const adminToken = jwt.sign(
        { 
          username: username,
          isAdmin: true,
          loginTime: new Date().toISOString()
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' } // Admin sessions expire in 8 hours
      );
      
      // Log admin login
      console.log(`Admin login: ${username} at ${new Date().toISOString()}`);
      
      res.json({
        success: true,
        token: adminToken,
        message: 'Admin login successful',
        expiresIn: '8h'
      });
      
    } else {
      // Log failed login attempt
      console.log(`Failed admin login attempt: ${username} at ${new Date().toISOString()}`);
      
      res.status(401).json({ 
        error: 'Invalid admin credentials',
        message: 'Please check your username and password'
      });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout endpoint
app.post('/admin/logout', authenticateAdmin, (req, res) => {
  // In a real application, you might want to blacklist the token
  console.log(`Admin logout: ${req.admin.username} at ${new Date().toISOString()}`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Verify admin token endpoint
app.get('/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ 
    valid: true, 
    admin: {
      username: req.admin.username,
      loginTime: req.admin.loginTime
    }
  });
});

// Update all existing admin routes to use authentication
// Replace the existing admin routes with these authenticated versions:

// Serve admin dashboard (no auth needed for the HTML file)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin - Get system statistics (with auth)
app.get('/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalStudents = await pool.query('SELECT COUNT(*) FROM students');
    const totalGrades = await pool.query('SELECT COUNT(*) FROM grades');
    const totalElements = await pool.query('SELECT COUNT(*) FROM element_pedagogi');
    
    // Get last sync time
    const lastSyncQuery = await pool.query(`
      SELECT sync_timestamp FROM sync_log 
      ORDER BY sync_timestamp DESC 
      LIMIT 1
    `);
    
    const lastSync = lastSyncQuery.rows[0]?.sync_timestamp || null;
    
    res.json({
      total_students: parseInt(totalStudents.rows[0].count),
      total_grades: parseInt(totalGrades.rows[0].count),
      total_elements: parseInt(totalElements.rows[0].count),
      last_sync: lastSync
    });
    
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin - Get sync status (with auth)
app.get('/admin/sync-status', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sync_type, records_processed, sync_status, error_message, sync_timestamp
      FROM sync_log 
      ORDER BY sync_timestamp DESC 
      LIMIT 1
    `);
    
    res.json({
      last_sync: result.rows[0] || null,
      sync_history: result.rows
    });
    
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin - Get data overview (with auth)
app.get('/admin/data-overview', authenticateAdmin, async (req, res) => {
  try {
    // Get students by year
    const students2023 = await pool.query('SELECT COUNT(*) FROM students WHERE cod_anu = 2023');
    const students2024 = await pool.query('SELECT COUNT(*) FROM students WHERE cod_anu = 2024');
    
    // Get grades by year
    const grades2023 = await pool.query('SELECT COUNT(*) FROM grades WHERE cod_anu = 2023');
    const grades2024 = await pool.query('SELECT COUNT(*) FROM grades WHERE cod_anu = 2024');
    
    // Get unique programs
    const uniquePrograms = await pool.query('SELECT COUNT(DISTINCT lib_etp) FROM students WHERE lib_etp IS NOT NULL');
    
    // Get recent activity
    const recentStudents = await pool.query(`
      SELECT COUNT(*) FROM students 
      WHERE last_sync >= NOW() - INTERVAL '24 hours'
    `);
    
    const recentGrades = await pool.query(`
      SELECT COUNT(*) FROM grades 
      WHERE last_sync >= NOW() - INTERVAL '24 hours'
    `);
    
    res.json({
      students_2023: parseInt(students2023.rows[0].count),
      students_2024: parseInt(students2024.rows[0].count),
      grades_2023: parseInt(grades2023.rows[0].count),
      grades_2024: parseInt(grades2024.rows[0].count),
      unique_programs: parseInt(uniquePrograms.rows[0].count),
      recent_students: parseInt(recentStudents.rows[0].count),
      recent_grades: parseInt(recentGrades.rows[0].count)
    });
    
  } catch (error) {
    console.error('Error getting data overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin - Get sync logs (with auth)
app.get('/admin/sync-logs', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await pool.query(`
      SELECT sync_type, records_processed, sync_status, error_message, sync_timestamp
      FROM sync_log 
      ORDER BY sync_timestamp DESC 
      LIMIT $1
    `, [limit]);
    
    res.json({
      logs: result.rows
    });
    
  } catch (error) {
    console.error('Error getting sync logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin - Search students (with auth)
app.get('/admin/search-students', authenticateAdmin, async (req, res) => {
  try {
    const { cin, nom, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        cod_etu, 
        lib_nom_pat_ind || ' ' || lib_pr1_ind as nom_complet,
        cin_ind as cin,
        lib_etp as etape,
        cod_anu as annee,
        last_sync
      FROM students 
      WHERE 1=1
    `;
    
    let params = [];
    let paramIndex = 1;
    
    if (cin) {
      query += ` AND cin_ind ILIKE $${paramIndex}`;
      params.push(`%${cin}%`);
      paramIndex++;
    }
    
    if (nom) {
      query += ` AND (lib_nom_pat_ind ILIKE $${paramIndex} OR lib_pr1_ind ILIKE $${paramIndex})`;
      params.push(`%${nom}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY lib_nom_pat_ind, lib_pr1_ind LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    res.json({
      students: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin - Manual sync trigger (with auth)
app.post('/admin/manual-sync', authenticateAdmin, async (req, res) => {
  try {
    // Import the sync function
    const { syncStudents } = require('./sync-service');
    
    // Log who started the sync
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
        // Log the error
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
    
    // Log the error
    await pool.query(`
      INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
      VALUES ('manual_sync', 0, 'error', $1)
    `, [`Failed to start sync (by ${req.admin.username}): ${error.message}`]);
    
    res.status(500).json({ error: 'Failed to start manual sync' });
  }
});

// Admin - Get detailed student info (with auth)
app.get('/admin/student/:codEtu', authenticateAdmin, async (req, res) => {
  try {
    const { codEtu } = req.params;
    
    // Get student info
    const studentResult = await pool.query(`
      SELECT * FROM students WHERE cod_etu = $1
    `, [codEtu]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    // Get student grades
    const gradesResult = await pool.query(`
      SELECT 
        g.cod_anu,
        g.cod_ses,
        g.cod_elp,
        g.not_elp,
        g.cod_tre,
        ep.lib_elp,
        ep.lib_elp_arb,
        ep.cod_pel
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE g.cod_etu = $1
      ORDER BY g.cod_anu DESC, g.cod_ses, ep.cod_pel, ep.lib_elp
    `, [codEtu]);
    
    // Get grade statistics
    const statsResult = await pool.query(`
      SELECT 
        cod_anu,
        cod_ses,
        COUNT(*) as total_subjects,
        AVG(CASE WHEN not_elp IS NOT NULL THEN not_elp END) as average_grade,
        COUNT(CASE WHEN not_elp >= 10 THEN 1 END) as passed_subjects,
        COUNT(CASE WHEN not_elp < 10 THEN 1 END) as failed_subjects
      FROM grades 
      WHERE cod_etu = $1
      GROUP BY cod_anu, cod_ses
      ORDER BY cod_anu DESC, cod_ses
    `, [codEtu]);
    
    res.json({
      student: student,
      grades: gradesResult.rows,
      statistics: statsResult.rows
    });
    
  } catch (error) {
    console.error('Error getting student details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import and use admin routes
const adminRoutes = require('./admin-routes');
app.use('/admin', adminRoutes);

// Admin - Get database health check (with auth)
app.get('/admin/health-check', authenticateAdmin, async (req, res) => {
  try {
    const checks = {
      postgresql: false,
      tables: {
        students: false,
        grades: false,
        element_pedagogi: false,
        sync_log: false
      },
      data_integrity: {
        orphaned_grades: 0,
        missing_elements: 0,
        duplicate_students: 0
      }
    };
    
    // Check PostgreSQL connection
    try {
      await pool.query('SELECT 1');
      checks.postgresql = true;
    } catch (error) {
      console.error('PostgreSQL check failed:', error);
    }
    
    // Check tables exist and have data
    const tables = ['students', 'grades', 'element_pedagogi', 'sync_log'];
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        checks.tables[table] = parseInt(result.rows[0].count) > 0;
      } catch (error) {
        console.error(`Table check failed for ${table}:`, error);
      }
    }
    
    // Check data integrity
    try {
      // Orphaned grades (grades without students)
      const orphanedGrades = await pool.query(`
        SELECT COUNT(*) FROM grades g
        LEFT JOIN students s ON g.cod_etu = s.cod_etu
        WHERE s.cod_etu IS NULL
      `);
      checks.data_integrity.orphaned_grades = parseInt(orphanedGrades.rows[0].count);
      
      // Missing elements (grades without element_pedagogi)
      const missingElements = await pool.query(`
        SELECT COUNT(*) FROM grades g
        LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
        WHERE ep.cod_elp IS NULL
      `);
      checks.data_integrity.missing_elements = parseInt(missingElements.rows[0].count);
      
      // Duplicate students
      const duplicateStudents = await pool.query(`
        SELECT COUNT(*) FROM (
          SELECT cod_etu, COUNT(*) 
          FROM students 
          GROUP BY cod_etu 
          HAVING COUNT(*) > 1
        ) duplicates
      `);
      checks.data_integrity.duplicate_students = parseInt(duplicateStudents.rows[0].count);
      
    } catch (error) {
      console.error('Data integrity check failed:', error);
    }
    
    res.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      checks: checks,
      checked_by: req.admin.username
    });
    
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Admin - Get sync statistics (with auth)
app.get('/admin/sync-statistics', authenticateAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Get sync history for the last N days
    const syncHistory = await pool.query(`
      SELECT 
        DATE(sync_timestamp) as sync_date,
        sync_type,
        COUNT(*) as sync_count,
        SUM(records_processed) as total_records,
        COUNT(CASE WHEN sync_status = 'success' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as failed_syncs
      FROM sync_log
      WHERE sync_timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(sync_timestamp), sync_type
      ORDER BY sync_date DESC, sync_type
    `);
    
    // Get sync performance metrics
    const performanceMetrics = await pool.query(`
      SELECT 
        sync_type,
        AVG(records_processed) as avg_records_per_sync,
        MAX(records_processed) as max_records_per_sync,
        MIN(records_processed) as min_records_per_sync
      FROM sync_log
      WHERE sync_status = 'success' 
        AND sync_timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY sync_type
    `);
    
    res.json({
      sync_history: syncHistory.rows,
      performance_metrics: performanceMetrics.rows,
      period_days: days
    });
    
  } catch (error) {
    console.error('Error getting sync statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student pedagogical situation
app.get('/student/pedagogical-situation', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;

    let query = `
      SELECT
        ps.cod_etu,
        ps.lib_nom_pat_ind,
        ps.lib_pr1_ind,
        ps.daa_uni_con,
        ps.cod_elp,
        ps.lib_elp,
        ps.eta_iae,
        ps.academic_level,
        ps.is_yearly_element,
        ep.element_type,
        ep.semester_number,
        ep.cod_pel,
        ep.cod_nel,
        ps.last_sync
      FROM pedagogical_situation ps
      LEFT JOIN element_pedagogi ep ON ps.cod_elp = ep.cod_elp
      WHERE ps.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
    `;

    let params = [req.user.studentId];
    let paramIndex = 2;

    if (year) {
      query += ` AND ps.daa_uni_con = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }

    query += ` ORDER BY ps.daa_uni_con DESC, ps.academic_level, ps.lib_elp`;

    const result = await pool.query(query, params);

    // Organize data by year and then by academic level or semester
    const organizedData = {};
    let availableYears = new Set();

    result.rows.forEach(row => {
      const year = row.daa_uni_con;
      availableYears.add(year);

      if (!organizedData[year]) {
        organizedData[year] = {
          yearly_elements: {}, // For 1A, 2A, 3A, etc.
          semester_elements: {} // For S1, S2, S3, etc.
        };
      }

      if (row.is_yearly_element) {
        const academicLevel = row.academic_level || 'Unknown';
        if (!organizedData[year].yearly_elements[academicLevel]) {
          organizedData[year].yearly_elements[academicLevel] = [];
        }
        organizedData[year].yearly_elements[academicLevel].push({
          cod_elp: row.cod_elp,
          lib_elp: row.lib_elp,
          eta_iae: row.eta_iae,
          academic_level: row.academic_level,
          is_yearly_element: row.is_yearly_element,
          element_type: row.element_type,
          cod_pel: row.cod_pel,
          cod_nel: row.cod_nel,
          last_sync: row.last_sync
        });
      } else {
        const semester = row.semester_number ? `S${row.semester_number}` : 'Unknown';
        if (!organizedData[year].semester_elements[semester]) {
          organizedData[year].semester_elements[semester] = [];
        }
        organizedData[year].semester_elements[semester].push({
          cod_elp: row.cod_elp,
          lib_elp: row.lib_elp,
          eta_iae: row.eta_iae,
          academic_level: row.academic_level,
          is_yearly_element: row.is_yearly_element,
          element_type: row.element_type,
          semester_number: row.semester_number,
          cod_pel: row.cod_pel,
          cod_nel: row.cod_nel,
          last_sync: row.last_sync
        });
      }
    });

    res.json({
      pedagogical_situation: organizedData,
      total_modules: result.rows.length,
      available_years: Array.from(availableYears).sort((a, b) => b - a),
      student_info: result.rows.length > 0 ? {
        cod_etu: result.rows[0].cod_etu,
        nom_complet: `${result.rows[0].lib_nom_pat_ind} ${result.rows[0].lib_pr1_ind}`
      } : null
    });

  } catch (error) {
    console.error('Get pedagogical situation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pedagogical situation statistics
app.get('/student/pedagogical-stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ps.daa_uni_con,
        COUNT(*) as total_modules,
        COUNT(CASE WHEN ps.eta_iae = 'E' THEN 1 END) as enrolled_modules,
        COUNT(CASE WHEN ep.element_type = 'MODULE' THEN 1 END) as modules,
        COUNT(CASE WHEN ep.element_type = 'MATIERE' THEN 1 END) as subjects,
        COUNT(DISTINCT ep.semester_number) as semesters
      FROM pedagogical_situation ps
      LEFT JOIN element_pedagogi ep ON ps.cod_elp = ep.cod_elp
      WHERE ps.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
      GROUP BY ps.daa_uni_con
      ORDER BY ps.daa_uni_con DESC
    `, [req.user.studentId]);

    res.json({
      statistics: result.rows.map(stat => ({
        year: stat.daa_uni_con,
        total_modules: parseInt(stat.total_modules),
        enrolled_modules: parseInt(stat.enrolled_modules),
        modules: parseInt(stat.modules),
        subjects: parseInt(stat.subjects),
        semesters: parseInt(stat.semesters)
      }))
    });

  } catch (error) {
    console.error('Get pedagogical stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pedagogical situation statistics
app.get('/student/pedagogical-stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.daa_uni_con,
        COUNT(*) as total_modules,
        COUNT(CASE WHEN ps.eta_iae = 'E' THEN 1 END) as enrolled_modules,
        COUNT(CASE WHEN ep.element_type = 'MODULE' THEN 1 END) as modules,
        COUNT(CASE WHEN ep.element_type = 'MATIERE' THEN 1 END) as subjects,
        COUNT(DISTINCT ep.semester_number) as semesters
      FROM pedagogical_situation ps
      LEFT JOIN element_pedagogi ep ON ps.cod_elp = ep.cod_elp
      WHERE ps.cod_etu = (
        SELECT cod_etu FROM students WHERE id = $1
      )
      GROUP BY ps.daa_uni_con
      ORDER BY ps.daa_uni_con DESC
    `, [req.user.studentId]);
    
    res.json({
      statistics: result.rows.map(stat => ({
        year: stat.daa_uni_con,
        total_modules: parseInt(stat.total_modules),
        enrolled_modules: parseInt(stat.enrolled_modules),
        modules: parseInt(stat.modules),
        subjects: parseInt(stat.subjects),
        semesters: parseInt(stat.semesters)
      }))
    });
    
  } catch (error) {
    console.error('Get pedagogical stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});