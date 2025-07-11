const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Create students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        cod_etu VARCHAR(20) UNIQUE NOT NULL,
        lib_nom_pat_ind VARCHAR(100),
        lib_pr1_ind VARCHAR(100),
        cod_etp VARCHAR(20),
        cod_anu INTEGER,
        cod_vrs_vet VARCHAR(20),
        cod_dip VARCHAR(20),
        cod_uti VARCHAR(20),
        dat_cre_iae TIMESTAMP,
        nbr_ins_cyc INTEGER,
        nbr_ins_etp INTEGER,
        nbr_ins_dip INTEGER,
        tem_dip_iae VARCHAR(1),
        cod_pay_nat VARCHAR(10),
        cod_etb VARCHAR(20),
        cod_nne_ind VARCHAR(20),
        dat_cre_ind TIMESTAMP,
        dat_mod_ind TIMESTAMP,
        date_nai_ind DATE,
        daa_ent_etb INTEGER,
        lib_nom_usu_ind VARCHAR(100),
        lib_pr2_ind VARCHAR(100),
        lib_pr3_ind VARCHAR(100),
        cod_sex_etu VARCHAR(1),
        lib_vil_nai_etu VARCHAR(100),
        cod_dep_pay_nai VARCHAR(10),
        daa_ens_sup INTEGER,
        daa_etb INTEGER,
        lib_nom_ind_arb VARCHAR(100),
        lib_prn_ind_arb VARCHAR(100),
        cin_ind VARCHAR(20),
        lib_vil_nai_etu_arb VARCHAR(100),
        lib_etp VARCHAR(200),
        lic_etp VARCHAR(200),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Students table created');

    // Create element_pedagogi table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS element_pedagogi (
        id SERIAL PRIMARY KEY,
        cod_elp VARCHAR(20) UNIQUE NOT NULL,
        cod_cmp VARCHAR(20),
        cod_nel VARCHAR(20),
        cod_pel VARCHAR(20),
        lib_elp VARCHAR(200),
        lic_elp VARCHAR(200),
        lib_elp_arb VARCHAR(200),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Element pedagogi table created');

    // Create grades table (simplified - element info will be joined from element_pedagogi)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        cod_etu VARCHAR(20) NOT NULL,
        cod_anu INTEGER,
        cod_ses VARCHAR(20),
        cod_elp VARCHAR(20),
        not_elp DECIMAL(5,2),
        cod_tre VARCHAR(20),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cod_etu, cod_elp, cod_anu, cod_ses)
      )
    `);
    console.log('✓ Grades table created');

    // Create sync log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50),
        records_processed INTEGER,
        sync_status VARCHAR(20),
        error_message TEXT,
        sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Sync log table created');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_cod_etu ON students(cod_etu);
      CREATE INDEX IF NOT EXISTS idx_students_cod_etp ON students(cod_etp);
      CREATE INDEX IF NOT EXISTS idx_students_cod_anu ON students(cod_anu);
      CREATE INDEX IF NOT EXISTS idx_students_cin_ind ON students(cin_ind);
      
      CREATE INDEX IF NOT EXISTS idx_element_pedagogi_cod_elp ON element_pedagogi(cod_elp);
      CREATE INDEX IF NOT EXISTS idx_element_pedagogi_cod_pel ON element_pedagogi(cod_pel);
      CREATE INDEX IF NOT EXISTS idx_element_pedagogi_cod_nel ON element_pedagogi(cod_nel);
      
      CREATE INDEX IF NOT EXISTS idx_grades_cod_etu ON grades(cod_etu);
      CREATE INDEX IF NOT EXISTS idx_grades_cod_elp ON grades(cod_elp);
      CREATE INDEX IF NOT EXISTS idx_grades_cod_anu ON grades(cod_anu);
      CREATE INDEX IF NOT EXISTS idx_grades_cod_ses ON grades(cod_ses);
      
      CREATE INDEX IF NOT EXISTS idx_sync_log_sync_type ON sync_log(sync_type);
      CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(sync_timestamp);
    `);
    console.log('✓ Database indexes created');

    // Add foreign key-like constraints (informational)
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add comment to indicate relationship between grades and element_pedagogi
        COMMENT ON COLUMN grades.cod_elp IS 'References element_pedagogi.cod_elp';
        COMMENT ON COLUMN grades.cod_etu IS 'References students.cod_etu';
        
        -- Add comment to explain table purposes
        COMMENT ON TABLE students IS 'Student information synced from Oracle INDIVIDU and INS_ADM_ETP tables';
        COMMENT ON TABLE element_pedagogi IS 'Course/module information synced from Oracle ELEMENT_PEDAGOGI table';
        COMMENT ON TABLE grades IS 'Student grades synced from Oracle RESULTAT_ELP table';
        COMMENT ON TABLE sync_log IS 'Log of synchronization operations';
      END $$;
    `);
    console.log('✓ Database comments added');

    console.log('\n=====================================');
    console.log('✓ Database setup completed successfully!');
    console.log('=====================================');
    console.log('\n=====================================');
    console.log('✓ Database setup completed successfully!');
    console.log('=====================================');
    console.log('Tables created:');
    console.log('  - students (student information)');
    console.log('  - element_pedagogi (course/module information)');
    console.log('  - grades (student grades)');
    console.log('  - sync_log (synchronization logs)');
    console.log('\nIndexes created for optimal performance');
    console.log('\nNext steps:');
    console.log('1. Configure your .env file with Oracle and PostgreSQL credentials');
    console.log('2. Run the sync service: npm run sync-manual');
    console.log('3. Start the API server: npm start');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Verify database connection permissions');
    console.log('4. Make sure the database exists');
    
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };