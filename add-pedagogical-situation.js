// Create this as add-pedagogical-situation.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function addPedagogicalSituation() {
  try {
    console.log('🔄 Adding pedagogical situation table and functionality...');
    
    // Create pedagogical situation table
    console.log('Creating pedagogical_situation table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedagogical_situation (
        id SERIAL PRIMARY KEY,
        cod_etu VARCHAR(20) NOT NULL,
        lib_nom_pat_ind VARCHAR(100),
        lib_pr1_ind VARCHAR(100),
        daa_uni_con INTEGER,
        cod_elp VARCHAR(20) NOT NULL,
        lib_elp VARCHAR(200),
        eta_iae VARCHAR(10),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cod_etu, cod_elp, daa_uni_con)
      )
    `);
    console.log('✓ Created pedagogical_situation table');
    
    // Add indexes for better performance
    console.log('Adding indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ped_situation_cod_etu ON pedagogical_situation(cod_etu);
      CREATE INDEX IF NOT EXISTS idx_ped_situation_cod_elp ON pedagogical_situation(cod_elp);
      CREATE INDEX IF NOT EXISTS idx_ped_situation_daa_uni_con ON pedagogical_situation(daa_uni_con);
      CREATE INDEX IF NOT EXISTS idx_ped_situation_eta_iae ON pedagogical_situation(eta_iae);
      CREATE INDEX IF NOT EXISTS idx_ped_situation_composite ON pedagogical_situation(cod_etu, daa_uni_con);
    `);
    console.log('✓ Added performance indexes');
    
    // Add comments to explain the table
    await pool.query(`
      COMMENT ON TABLE pedagogical_situation IS 'Pedagogical situation data for students including contracted modules';
      COMMENT ON COLUMN pedagogical_situation.cod_etu IS 'Student code (APOGEE)';
      COMMENT ON COLUMN pedagogical_situation.lib_nom_pat_ind IS 'Student last name';
      COMMENT ON COLUMN pedagogical_situation.lib_pr1_ind IS 'Student first name';
      COMMENT ON COLUMN pedagogical_situation.daa_uni_con IS 'University contract year';
      COMMENT ON COLUMN pedagogical_situation.cod_elp IS 'Pedagogical element code';
      COMMENT ON COLUMN pedagogical_situation.lib_elp IS 'Module/subject name';
      COMMENT ON COLUMN pedagogical_situation.eta_iae IS 'Administrative inscription status (E=Enrolled, D=Disenrolled)';
    `);
    console.log('✓ Added table comments');
    
    // Update sync_log table to track pedagogical situation syncs
    await pool.query(`
      INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
      VALUES ('pedagogical_situation_setup', 0, 'success', 'Pedagogical situation table created and ready for sync')
      ON CONFLICT DO NOTHING
    `);
    console.log('✓ Updated sync log');
    
    // Check if we have any existing data
    const existingData = await pool.query('SELECT COUNT(*) FROM pedagogical_situation');
    console.log(`📊 Current pedagogical situation records: ${existingData.rows[0].count}`);
    
    console.log('\n=====================================');
    console.log('✅ Pedagogical situation setup completed!');
    console.log('=====================================');
    console.log('New features added:');
    console.log('✓ pedagogical_situation table with proper indexes');
    console.log('✓ Support for tracking student module contracts');
    console.log('✓ Year-based filtering and organization');
    console.log('✓ Administrative status tracking (Enrolled/Disenrolled)');
    console.log('\nNext steps:');
    console.log('1. Update your sync-service.js with the new sync function');
    console.log('2. Run the sync: npm run sync-manual');
    console.log('3. The new "Pedagogical Situation" page will be available in the student portal');
    console.log('4. Students can view their contracted modules by academic year');
    
    // Display table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pedagogical_situation'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'Nullable' : 'Not Null'}`);
    });
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Verify you have sufficient privileges to create tables');
    console.log('4. Make sure setup-database.js was run first');
    
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  addPedagogicalSituation();
}

module.exports = { addPedagogicalSituation };