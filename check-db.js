const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function checkDatabase() {
  try {
    // Check connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tables found:', tables.rows.map(r => r.table_name));
    
    // Check students count
    const studentsCount = await client.query('SELECT COUNT(*) FROM students');
    console.log('👥 Students in database:', studentsCount.rows[0].count);
    
    // Check sample data
    const sampleData = await client.query('SELECT cod_etu, lib_nom_pat_ind, lib_pr1_ind FROM students LIMIT 3');
    console.log('📄 Sample students:');
    sampleData.rows.forEach(student => {
      console.log(`  - ${student.cod_etu}: ${student.lib_nom_pat_ind} ${student.lib_pr1_ind}`);
    });
    
    // Check sync log
    const syncLog = await client.query('SELECT * FROM sync_log ORDER BY sync_timestamp DESC LIMIT 5');
    console.log('🔄 Recent sync activity:');
    syncLog.rows.forEach(log => {
      console.log(`  - ${log.sync_timestamp}: ${log.sync_status} (${log.records_processed} records)`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();