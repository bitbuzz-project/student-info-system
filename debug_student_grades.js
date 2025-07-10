const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function debugStudentGrades() {
  try {
    console.log('🔍 Debugging student grades...\n');
    
    // Get total grades count
    const totalGrades = await pool.query('SELECT COUNT(*) FROM grades');
    console.log(`📊 Total grades in database: ${totalGrades.rows[0].count}`);
    
    // Get grades distribution by year
    const gradesByYear = await pool.query(`
      SELECT cod_anu, COUNT(*) as count 
      FROM grades 
      GROUP BY cod_anu 
      ORDER BY cod_anu DESC
    `);
    
    console.log('\n📅 Grades by year:');
    gradesByYear.rows.forEach(row => {
      console.log(`   ${row.cod_anu}: ${row.count} grades`);
    });
    
    // Get sample students with grades
    const studentsWithGrades = await pool.query(`
      SELECT DISTINCT g.cod_etu, s.lib_nom_pat_ind, s.lib_pr1_ind, COUNT(g.id) as grade_count
      FROM grades g
      LEFT JOIN students s ON g.cod_etu = s.cod_etu
      GROUP BY g.cod_etu, s.lib_nom_pat_ind, s.lib_pr1_ind
      ORDER BY grade_count DESC
      LIMIT 10
    `);
    
    console.log('\n🎓 Top 10 students with most grades:');
    studentsWithGrades.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.cod_etu}: ${row.lib_nom_pat_ind || 'Unknown'} ${row.lib_pr1_ind || ''} - ${row.grade_count} grades`);
    });
    
    // Check for orphaned grades (grades without students)
    const orphanedGrades = await pool.query(`
      SELECT g.cod_etu, COUNT(*) as count
      FROM grades g
      LEFT JOIN students s ON g.cod_etu = s.cod_etu
      WHERE s.cod_etu IS NULL
      GROUP BY g.cod_etu
      ORDER BY count DESC
      LIMIT 5
    `);
    
    if (orphanedGrades.rows.length > 0) {
      console.log('\n⚠️  Orphaned grades (grades without matching students):');
      orphanedGrades.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.cod_etu}: ${row.count} grades`);
      });
    }
    
    // Test the API query that the web interface uses
    console.log('\n🔍 Testing API query structure...');
    
    // Get first student with grades
    const firstStudent = await pool.query(`
      SELECT s.id, s.cod_etu, s.lib_nom_pat_ind, COUNT(g.id) as grade_count
      FROM students s
      JOIN grades g ON s.cod_etu = g.cod_etu
      GROUP BY s.id, s.cod_etu, s.lib_nom_pat_ind
      ORDER BY grade_count DESC
      LIMIT 1
    `);
    
    if (firstStudent.rows.length > 0) {
      const student = firstStudent.rows[0];
      console.log(`\n📝 Testing with student: ${student.cod_etu} (${student.lib_nom_pat_ind})`);
      
      // Test the exact query used in the API
      const apiQuery = `
        SELECT 
          cod_anu,
          cod_ses,
          cod_elp,
          lib_elp,
          not_elp,
          cod_tre
        FROM grades 
        WHERE cod_etu = (
          SELECT cod_etu FROM students WHERE id = $1
        )
        ORDER BY cod_anu DESC, cod_ses, lib_elp
      `;
      
      const apiResult = await pool.query(apiQuery, [student.id]);
      console.log(`   API query returned: ${apiResult.rows.length} grades`);
      
      if (apiResult.rows.length > 0) {
        console.log('   Sample grades:');
        apiResult.rows.slice(0, 5).forEach((grade, index) => {
          console.log(`     ${index + 1}. ${grade.cod_elp} - ${grade.lib_elp} - ${grade.not_elp} (${grade.cod_anu}/${grade.cod_ses})`);
        });
        
        // Group by year and session like the web interface does
        const gradesByYear = {};
        apiResult.rows.forEach(grade => {
          const year = grade.cod_anu;
          const session = grade.cod_ses;
          
          if (!gradesByYear[year]) {
            gradesByYear[year] = {};
          }
          
          if (!gradesByYear[year][session]) {
            gradesByYear[year][session] = [];
          }
          
          gradesByYear[year][session].push(grade);
        });
        
        console.log('\n📊 Grades grouped by year/session:');
        Object.keys(gradesByYear).forEach(year => {
          console.log(`   Year ${year}:`);
          Object.keys(gradesByYear[year]).forEach(session => {
            console.log(`     Session ${session}: ${gradesByYear[year][session].length} grades`);
          });
        });
      }
      
      // Test grade statistics query
      const statsQuery = `
        SELECT 
          cod_anu,
          cod_ses,
          COUNT(*) as total_subjects,
          AVG(CASE WHEN not_elp IS NOT NULL THEN not_elp END) as average_grade,
          COUNT(CASE WHEN not_elp >= 10 THEN 1 END) as passed_subjects,
          COUNT(CASE WHEN not_elp < 10 THEN 1 END) as failed_subjects
        FROM grades 
        WHERE cod_etu = (
          SELECT cod_etu FROM students WHERE id = $1
        )
        GROUP BY cod_anu, cod_ses
        ORDER BY cod_anu DESC, cod_ses
      `;
      
      const statsResult = await pool.query(statsQuery, [student.id]);
      console.log(`\n📊 Grade statistics query returned: ${statsResult.rows.length} records`);
      
      if (statsResult.rows.length > 0) {
        console.log('   Statistics:');
        statsResult.rows.forEach((stat, index) => {
          console.log(`     ${index + 1}. ${stat.cod_anu}/${stat.cod_ses}: ${stat.total_subjects} subjects, avg: ${stat.average_grade?.toFixed(2) || 'N/A'}`);
        });
      }
    }
    
    // Check sync status
    const syncStatus = await pool.query(`
      SELECT sync_type, records_processed, sync_status, sync_timestamp
      FROM sync_log
      ORDER BY sync_timestamp DESC
      LIMIT 5
    `);
    
    console.log('\n🔄 Recent sync history:');
    syncStatus.rows.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.sync_type}: ${log.records_processed} records - ${log.sync_status} (${log.sync_timestamp})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugStudentGrades();