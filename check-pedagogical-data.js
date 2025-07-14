// Create this as check-pedagogical-data.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function checkPedagogicalData() {
  try {
    console.log('🔍 Checking pedagogical situation data...\n');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pedagogical_situation'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Table pedagogical_situation does not exist!');
      console.log('Run: node add-pedagogical-situation.js');
      return;
    }
    
    console.log('✅ Table pedagogical_situation exists');
    
    // Check total records
    const totalRecords = await pool.query('SELECT COUNT(*) FROM pedagogical_situation');
    console.log(`📊 Total records: ${totalRecords.rows[0].count}`);
    
    if (parseInt(totalRecords.rows[0].count) === 0) {
      console.log('⚠️  No data in pedagogical_situation table!');
      console.log('You need to run the sync first.');
      console.log('Make sure to:');
      console.log('1. Add the syncPedagogicalSituation function to sync-service.js');
      console.log('2. Call it in the main syncStudents function');
      console.log('3. Run: npm run sync-manual');
      return;
    }
    
    // Check data distribution by year
    const yearDistribution = await pool.query(`
      SELECT daa_uni_con, COUNT(*) as count 
      FROM pedagogical_situation 
      GROUP BY daa_uni_con 
      ORDER BY daa_uni_con DESC
    `);
    
    console.log('\n📅 Data by year:');
    yearDistribution.rows.forEach(row => {
      console.log(`   ${row.daa_uni_con}: ${row.count} records`);
    });
    
    // Check sample data
    const sampleData = await pool.query(`
      SELECT cod_etu, lib_nom_pat_ind, lib_pr1_ind, daa_uni_con, cod_elp, lib_elp, eta_iae
      FROM pedagogical_situation 
      LIMIT 5
    `);
    
    console.log('\n📄 Sample data:');
    sampleData.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.cod_etu} - ${row.lib_nom_pat_ind} ${row.lib_pr1_ind}`);
      console.log(`      Year: ${row.daa_uni_con}, Module: ${row.cod_elp} - ${row.lib_elp}`);
      console.log(`      Status: ${row.eta_iae}\n`);
    });
    
    // Check students with pedagogical data
    const studentsWithPedData = await pool.query(`
      SELECT COUNT(DISTINCT ps.cod_etu) as students_count
      FROM pedagogical_situation ps
      JOIN students s ON ps.cod_etu = s.cod_etu
    `);
    
    console.log(`👥 Students with pedagogical data: ${studentsWithPedData.rows[0].students_count}`);
    
    // Check if current logged-in student has data (test with first student)
    const testStudent = await pool.query(`
      SELECT s.id, s.cod_etu, COUNT(ps.id) as ped_records
      FROM students s
      LEFT JOIN pedagogical_situation ps ON s.cod_etu = ps.cod_etu
      GROUP BY s.id, s.cod_etu
      ORDER BY ped_records DESC
      LIMIT 5
    `);
    
    console.log('\n🧪 Test students (top 5 with most pedagogical records):');
    testStudent.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Student ID: ${row.id}, Code: ${row.cod_etu}, Records: ${row.ped_records}`);
    });
    
    // Check element_pedagogi integration
    const withElementInfo = await pool.query(`
      SELECT 
        COUNT(ps.id) as total_ped_records,
        COUNT(ep.id) as with_element_info,
        COUNT(ps.id) - COUNT(ep.id) as missing_element_info
      FROM pedagogical_situation ps
      LEFT JOIN element_pedagogi ep ON ps.cod_elp = ep.cod_elp
    `);
    
    const result = withElementInfo.rows[0];
    console.log('\n🔗 Element pedagogi integration:');
    console.log(`   Total pedagogical records: ${result.total_ped_records}`);
    console.log(`   With element info: ${result.with_element_info}`);
    console.log(`   Missing element info: ${result.missing_element_info}`);
    
    if (parseInt(result.missing_element_info) > 0) {
      console.log('⚠️  Some pedagogical records are missing element_pedagogi data');
      console.log('This is normal if element_pedagogi doesn\'t have all modules');
    }
    
    console.log('\n✅ Pedagogical data check completed!');
    
  } catch (error) {
    console.error('❌ Error checking pedagogical data:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
  }
}

checkPedagogicalData();