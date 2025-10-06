// Create this as create-official-docs-table.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function createOfficialDocsTable() {
  try {
    console.log('🔄 Creating official documents table...');
    
    // Create official_documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS official_documents (
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
    console.log('✓ Created official_documents table');
    
    // Add indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_official_documents_cod_etu ON official_documents(cod_etu);
      CREATE INDEX IF NOT EXISTS idx_official_documents_cod_elp ON official_documents(cod_elp);
      CREATE INDEX IF NOT EXISTS idx_official_documents_cod_anu ON official_documents(cod_anu);
      CREATE INDEX IF NOT EXISTS idx_official_documents_cod_ses ON official_documents(cod_ses);
    `);
    console.log('✓ Added indexes for official_documents table');
    
    // Add comments
    await pool.query(`
      COMMENT ON TABLE official_documents IS 'Final grades for official transcript generation';
      COMMENT ON COLUMN official_documents.cod_etu IS 'Student code';
      COMMENT ON COLUMN official_documents.cod_anu IS 'Academic year';
      COMMENT ON COLUMN official_documents.cod_ses IS 'Session code';
      COMMENT ON COLUMN official_documents.cod_elp IS 'Element code';
      COMMENT ON COLUMN official_documents.not_elp IS 'Final grade';
      COMMENT ON COLUMN official_documents.cod_tre IS 'Result code';
    `);
    console.log('✓ Added table comments');
    
    console.log('\n=====================================');
    console.log('✅ Official documents table created successfully!');
    console.log('=====================================');
    console.log('Next steps:');
    console.log('1. Update your sync-service.js to include official documents sync');
    console.log('2. Run the sync: npm run sync-manual');
    console.log('3. The official documents page will now work properly');
    
  } catch (error) {
    console.error('❌ Failed to create official documents table:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  createOfficialDocsTable();
}

module.exports = { createOfficialDocsTable };