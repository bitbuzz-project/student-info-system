// Create this as add-registration-indexes.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function addRegistrationIndexes() {
  try {
    console.log('🔄 Adding indexes for student registration management...');
    
    // Add indexes for registration queries
    console.log('Adding registration-specific indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_nbr_ins_cyc ON students(nbr_ins_cyc);
      CREATE INDEX IF NOT EXISTS idx_students_dat_cre_iae ON students(dat_cre_iae);
      CREATE INDEX IF NOT EXISTS idx_students_cod_uti ON students(cod_uti);
      CREATE INDEX IF NOT EXISTS idx_students_registration_composite ON students(nbr_ins_cyc, dat_cre_iae, cod_anu);
      CREATE INDEX IF NOT EXISTS idx_students_program_registration ON students(lib_etp, nbr_ins_cyc, dat_cre_iae);
    `);
    console.log('✓ Added registration indexes');
    
    // Add comments to explain the new indexes
    await pool.query(`
      COMMENT ON INDEX idx_students_nbr_ins_cyc IS 'Index for filtering new registrations (NBR_INS_CYC = 1)';
      COMMENT ON INDEX idx_students_dat_cre_iae IS 'Index for registration date queries and sorting';
      COMMENT ON INDEX idx_students_cod_uti IS 'Index for filtering by user who created the registration';
      COMMENT ON INDEX idx_students_registration_composite IS 'Composite index for registration dashboard queries';
      COMMENT ON INDEX idx_students_program_registration IS 'Index for program-specific registration analytics';
    `);
    console.log('✓ Added index comments');
    
    // Update sync_log table to track registration sync
    await pool.query(`
      INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
      VALUES ('registration_indexes_setup', 0, 'success', 'Registration management indexes created successfully')
      ON CONFLICT DO NOTHING
    `);
    console.log('✓ Updated sync log');
    
    // Verify indexes were created
    const indexCheck = await pool.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'students' 
        AND (indexname LIKE '%registration%' OR indexname LIKE '%nbr_ins_cyc%' OR indexname LIKE '%dat_cre_iae%')
      ORDER BY indexname
    `);
    
    console.log('\n=====================================');
    console.log('✅ Registration indexes setup completed!');
    console.log('=====================================');
    console.log('New indexes created:');
    indexCheck.rows.forEach(index => {
      console.log(`✓ ${index.indexname}`);
    });
    
    console.log('\nNew features enabled:');
    console.log('✓ Fast filtering of new registrations (NBR_INS_CYC = 1)');
    console.log('✓ Efficient registration date range queries');
    console.log('✓ Quick user-based registration filtering');
    console.log('✓ Optimized registration dashboard analytics');
    
    console.log('\nNext steps:');
    console.log('1. Run the updated sync: npm run sync-manual');
    console.log('2. Access the "Student Registrations" page in admin dashboard');
    console.log('3. Monitor new student registrations by date, user, and program');
    
    // Show sample query performance
    console.log('\n📊 Sample queries now optimized:');
    console.log('- New registrations today');
    console.log('- Registration trends by date');
    console.log('- User-specific registration counts');
    console.log('- Program-wise registration analytics');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Verify you have sufficient privileges to create indexes');
    console.log('4. Make sure setup-database.js was run first');
    
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  addRegistrationIndexes();
}

module.exports = { addRegistrationIndexes };