// setup-laureats-table.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

const createLaureatsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS laureats (
        id SERIAL PRIMARY KEY,
        cod_etu VARCHAR(20) NOT NULL,
        nom_pat_ind VARCHAR(100),
        prenom_ind VARCHAR(100),
        cod_etp VARCHAR(20),
        cod_anu VARCHAR(4),
        cod_vrs_vet VARCHAR(10),
        cod_dip VARCHAR(20),
        cod_uti VARCHAR(50),
        dat_cre_iae TIMESTAMP,
        nbr_ins_cyc INTEGER,
        nbr_ins_etp INTEGER,
        nbr_ins_dip INTEGER,
        tem_dip_iae VARCHAR(1),
        cod_pay_nat VARCHAR(10),
        cod_etb VARCHAR(10),
        cod_nne_ind VARCHAR(50),
        dat_cre_ind TIMESTAMP,
        date_nai_ind DATE,
        cin_ind VARCHAR(20),
        sexe VARCHAR(1),
        lib_vil_nai_etu VARCHAR(100),
        nom_arabe VARCHAR(100),
        prenom_arabe VARCHAR(100),
        lieu_nai_arabe VARCHAR(100),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Create a unique constraint to prevent duplicates
        CONSTRAINT unique_laureat_record UNIQUE (cod_etu, cod_anu, cod_dip)
      );

      -- Create indexes for faster searching
      CREATE INDEX IF NOT EXISTS idx_laureats_cod_etu ON laureats(cod_etu);
      CREATE INDEX IF NOT EXISTS idx_laureats_cod_anu ON laureats(cod_anu);
      CREATE INDEX IF NOT EXISTS idx_laureats_cod_dip ON laureats(cod_dip);
      CREATE INDEX IF NOT EXISTS idx_laureats_cin ON laureats(cin_ind);
    `);
    
    console.log('✅ Laureats table created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    pool.end();
  }
};

createLaureatsTable();