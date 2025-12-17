const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'students_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
});

async function checkLaureats() {
  try {
    console.log('🔌 Connecting to database...');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'laureats'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table "laureats" does not exist!');
      return;
    }

    // Count rows
    const countResult = await pool.query('SELECT COUNT(*) FROM laureats');
    const count = parseInt(countResult.rows[0].count);

    console.log(`📊 Total Laureats found: ${count}`);

    if (count > 0) {
      const sample = await pool.query('SELECT cod_etu, nom_pat_ind, prenom_ind, cod_dip, cod_anu FROM laureats LIMIT 3');
      console.log('\n📄 Sample Data:');
      console.table(sample.rows);
    } else {
      console.log('⚠️ The table is empty. Please run the sync service.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkLaureats();