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

    // Create grades table (with full ELEMENT_PEDAGOGI data)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        cod_etu VARCHAR(20) NOT NULL,
        cod_anu INTEGER,
        cod_ses VARCHAR(20),
        cod_elp VARCHAR(20),
        lib_elp VARCHAR(200),
        cod_nel VARCHAR(20),
        cod_pel VARCHAR(20),
        lic_elp VARCHAR(200),
        lib_elp_arb VARCHAR(200),
        not_elp DECIMAL(5,2),
        cod_tre VARCHAR(20),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cod_etu, cod_elp, cod_anu, cod_ses)
      )
    `);

    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_cod_etu ON students(cod_etu);
      CREATE INDEX IF NOT EXISTS idx_students_cod_etp ON students(cod_etp);
      CREATE INDEX IF NOT EXISTS idx_students_cod_anu ON students(cod_anu);
      CREATE INDEX IF NOT EXISTS idx_grades_cod_etu ON grades(cod_etu);
      CREATE INDEX IF NOT EXISTS idx_grades_cod_anu ON grades(cod_anu);
      CREATE INDEX IF NOT EXISTS idx_grades_cod_ses ON grades(cod_ses);
    `);

    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();