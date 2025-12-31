const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function setup() {
  try {
    console.log('Checking database...');
    
    // Create the assignments table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exam_assignments (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER REFERENCES exam_planning(id) ON DELETE CASCADE,
        cod_etu VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exam_id, cod_etu)
      )
    `);
    console.log('✅ Table "exam_assignments" is ready.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    pool.end();
  }
}

setup();