const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function updateDatabase() {
  try {
    console.log('🔄 Updating database structure for proper semester handling...');
    
    // Add new columns to element_pedagogi table
    console.log('Adding new columns to element_pedagogi table...');
    await pool.query(`
      ALTER TABLE element_pedagogi 
      ADD COLUMN IF NOT EXISTS element_type VARCHAR(10),
      ADD COLUMN IF NOT EXISTS semester_number INTEGER
    `);
    console.log('✓ Added element_type and semester_number columns');
    
    // Create element_hierarchy table
    console.log('Creating element_hierarchy table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS element_hierarchy (
        id SERIAL PRIMARY KEY,
        cod_elp_pere VARCHAR(20) NOT NULL,
        cod_elp_fils VARCHAR(20) NOT NULL,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cod_elp_pere, cod_elp_fils)
      )
    `);
    console.log('✓ Created element_hierarchy table');
    
    // Add indexes for the new tables and columns
    console.log('Adding indexes for better performance...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_element_pedagogi_element_type ON element_pedagogi(element_type);
      CREATE INDEX IF NOT EXISTS idx_element_pedagogi_semester_number ON element_pedagogi(semester_number);
      CREATE INDEX IF NOT EXISTS idx_element_hierarchy_pere ON element_hierarchy(cod_elp_pere);
      CREATE INDEX IF NOT EXISTS idx_element_hierarchy_fils ON element_hierarchy(cod_elp_fils);
    `);
    console.log('✓ Added performance indexes');
    
    // Update existing element_pedagogi records with element_type and semester_number
    console.log('Updating existing element_pedagogi records...');
    
    // Update element types based on cod_nel
    await pool.query(`
      UPDATE element_pedagogi SET 
        element_type = CASE 
          WHEN cod_nel = 'MOD' THEN 'MODULE'
          WHEN cod_nel LIKE 'S%' OR cod_nel LIKE 'SM%' THEN 'SEMESTRE'
          ELSE 'MATIERE'
        END,
        semester_number = CASE 
          WHEN cod_pel ~ 'S(\d+)' THEN CAST(substring(cod_pel from 'S(\d+)') AS INTEGER)
          WHEN cod_nel ~ 'S(\d+)' THEN CAST(substring(cod_nel from 'S(\d+)') AS INTEGER)
          WHEN cod_nel ~ 'SM(\d+)' THEN CAST(substring(cod_nel from 'SM(\d+)') AS INTEGER)
          ELSE NULL
        END
      WHERE element_type IS NULL OR semester_number IS NULL
    `);
    console.log('✓ Updated element types and semester numbers');
    
    // Add comments to explain the new structure
    await pool.query(`
      COMMENT ON COLUMN element_pedagogi.element_type IS 'Type of element: SEMESTRE, MODULE, or MATIERE';
      COMMENT ON COLUMN element_pedagogi.semester_number IS 'Semester number (1-6) extracted from codes';
      COMMENT ON TABLE element_hierarchy IS 'Parent-child relationships between pedagogical elements';
    `);
    console.log('✓ Added database comments');
    
    // Check data integrity
    console.log('Checking data integrity...');
    
    const semesterCount = await pool.query(`
      SELECT COUNT(*) FROM element_pedagogi WHERE element_type = 'SEMESTRE'
    `);
    console.log(`📊 Found ${semesterCount.rows[0].count} semester elements`);
    
    const moduleCount = await pool.query(`
      SELECT COUNT(*) FROM element_pedagogi WHERE element_type = 'MODULE'
    `);
    console.log(`📊 Found ${moduleCount.rows[0].count} module elements`);
    
    const subjectCount = await pool.query(`
      SELECT COUNT(*) FROM element_pedagogi WHERE element_type = 'MATIERE'
    `);
    console.log(`📊 Found ${subjectCount.rows[0].count} subject elements`);
    
    const semesterNumbers = await pool.query(`
      SELECT semester_number, COUNT(*) as count 
      FROM element_pedagogi 
      WHERE semester_number IS NOT NULL 
      GROUP BY semester_number 
      ORDER BY semester_number
    `);
    
    console.log('📊 Semester distribution:');
    semesterNumbers.rows.forEach(row => {
      console.log(`   S${row.semester_number}: ${row.count} elements`);
    });
    
    // Check for grades without proper element info
    const orphanedGrades = await pool.query(`
      SELECT COUNT(*) FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE ep.cod_elp IS NULL
    `);
    
    if (parseInt(orphanedGrades.rows[0].count) > 0) {
      console.log(`⚠️  Warning: ${orphanedGrades.rows[0].count} grades have missing element_pedagogi records`);
    } else {
      console.log('✓ All grades have corresponding element_pedagogi records');
    }
    
    console.log('\n=====================================');
    console.log('✅ Database update completed successfully!');
    console.log('=====================================');
    console.log('New features added:');
    console.log('✓ Element type classification (SEMESTRE, MODULE, MATIERE)');
    console.log('✓ Semester number extraction (1-6)');
    console.log('✓ Element hierarchy table for parent-child relationships');
    console.log('✓ Performance indexes for faster queries');
    console.log('\nNext steps:');
    console.log('1. Run the updated sync service: npm run sync-manual');
    console.log('2. The web interface will now display grades properly organized by semesters');
    console.log('3. Grades will be grouped by session type: Automne (S1,S3,S5) and Printemps (S2,S4,S6)');
    
  } catch (error) {
    console.error('❌ Database update failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Verify you have sufficient privileges to alter tables');
    console.log('4. Run setup-database.js first if this is a fresh installation');
    
  } finally {
    await pool.end();
  }
}

// Run update if this file is executed directly
if (require.main === module) {
  updateDatabase();
}

module.exports = { updateDatabase };