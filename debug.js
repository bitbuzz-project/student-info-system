const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function debugMissingElements() {
  try {
    console.log('🔍 Analyzing missing element_pedagogi data...\n');
    
    // Get missing elements with counts
    const missingElements = await pool.query(`
      SELECT 
        g.cod_elp,
        COUNT(*) as grade_count,
        MIN(g.cod_anu) as first_year,
        MAX(g.cod_anu) as last_year,
        COUNT(DISTINCT g.cod_etu) as student_count
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE ep.cod_elp IS NULL
      GROUP BY g.cod_elp
      ORDER BY grade_count DESC
      LIMIT 20
    `);
    
    console.log('📋 Top 20 missing elements:');
    console.log('Code      | Grades | Students | Years    | Description');
    console.log('----------|--------|----------|----------|------------');
    
    missingElements.rows.forEach(row => {
      console.log(`${row.cod_elp.padEnd(9)} | ${String(row.grade_count).padEnd(6)} | ${String(row.student_count).padEnd(8)} | ${row.first_year}-${row.last_year} | Missing`);
    });
    
    // Check element patterns
    const elementPatterns = await pool.query(`
      SELECT 
        SUBSTRING(g.cod_elp FROM 1 FOR 2) as prefix,
        COUNT(*) as count
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE ep.cod_elp IS NULL
      GROUP BY SUBSTRING(g.cod_elp FROM 1 FOR 2)
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Missing elements by prefix:');
    elementPatterns.rows.forEach(row => {
      console.log(`   ${row.prefix}*: ${row.count} grades`);
    });
    
    // Check years distribution
    const yearDistribution = await pool.query(`
      SELECT 
        g.cod_anu,
        COUNT(*) as missing_count
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE ep.cod_elp IS NULL
      GROUP BY g.cod_anu
      ORDER BY g.cod_anu DESC
    `);
    
    console.log('\n📅 Missing elements by year:');
    yearDistribution.rows.forEach(row => {
      console.log(`   ${row.cod_anu}: ${row.missing_count} grades without element info`);
    });
    
    // Check existing elements
    const existingElements = await pool.query(`
      SELECT COUNT(*) as total_elements FROM element_pedagogi
    `);
    
    const existingGrades = await pool.query(`
      SELECT COUNT(*) as total_grades FROM grades
    `);
    
    const linkedGrades = await pool.query(`
      SELECT COUNT(*) as linked_grades
      FROM grades g
      JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
    `);
    
    console.log('\n📈 Summary:');
    console.log(`   Total elements in element_pedagogi: ${existingElements.rows[0].total_elements}`);
    console.log(`   Total grades: ${existingGrades.rows[0].total_grades}`);
    console.log(`   Grades with element info: ${linkedGrades.rows[0].linked_grades}`);
    console.log(`   Grades missing element info: ${parseInt(existingGrades.rows[0].total_grades) - parseInt(linkedGrades.rows[0].linked_grades)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugMissingElements();