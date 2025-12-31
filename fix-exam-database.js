const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function fixDatabase() {
  try {
    console.log('🔧 Checking database schema...');

    // 1. Ensure pedagogical_situation exists (Schema check)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedagogical_situation (
        id SERIAL PRIMARY KEY,
        cod_etu VARCHAR(50),
        cod_elp VARCHAR(50),
        lib_nom_pat_ind VARCHAR(100),
        lib_pr1_ind VARCHAR(100),
        cod_cmp VARCHAR(50),
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "pedagogical_situation" checked.');

    // 2. Ensure grouping_rules exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grouping_rules (
        id SERIAL PRIMARY KEY,
        module_pattern VARCHAR(50) NOT NULL,
        group_name VARCHAR(50) NOT NULL,
        range_start VARCHAR(10) NOT NULL,
        range_end VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "grouping_rules" checked.');

    // 3. Ensure exam_planning exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exam_planning (
        id SERIAL PRIMARY KEY,
        module_code VARCHAR(50),
        module_name VARCHAR(255),
        group_name VARCHAR(100),
        exam_date DATE,
        start_time TIME,
        end_time TIME,
        location VARCHAR(100),
        professor_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "exam_planning" checked.');

    console.log('🎉 Database fix completed. Restart your server.');
  } catch (error) {
    console.error('❌ Database Fix Failed:', error);
  } finally {
    await pool.end();
  }
}

fixDatabase();