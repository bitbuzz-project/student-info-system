const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function createImportTable() {
  const client = await pool.connect();
  try {
    console.log('⏳ Creating exam_results_import table...');

    const query = `
      CREATE TABLE IF NOT EXISTS exam_results_import (
          id SERIAL PRIMARY KEY,
          cod_etu VARCHAR(50) NOT NULL,
          cod_elp VARCHAR(50) NOT NULL,
          not_elp DECIMAL(5, 2),
          is_absent BOOLEAN DEFAULT FALSE,
          cod_anu INTEGER,
          imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(cod_etu, cod_elp, cod_anu)
      );
    `;

    await client.query(query);
    
    // Optional: Create indexes for faster lookups during planning
    await client.query('CREATE INDEX IF NOT EXISTS idx_eri_etu_elp ON exam_results_import(cod_etu, cod_elp)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eri_fail_criteria ON exam_results_import(not_elp, is_absent)');

    console.log('✅ Table "exam_results_import" created successfully.');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createImportTable();