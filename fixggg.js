// run-migration.js
// Script to add assigned_group column to exam_assignments table

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Add assigned_group column...\n');
    
    // Step 1: Add the column
    console.log('Step 1: Adding assigned_group column to exam_assignments...');
    await client.query(`
      ALTER TABLE exam_assignments 
      ADD COLUMN IF NOT EXISTS assigned_group VARCHAR(50);
    `);
    console.log('✅ Column added successfully!\n');
    
    // Step 2: Create index for performance
    console.log('Step 2: Creating index on assigned_group...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_assignments_group 
      ON exam_assignments(assigned_group);
    `);
    console.log('✅ Index created successfully!\n');
    
    // Step 3: Verify the column exists
    console.log('Step 3: Verifying column...');
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_assignments' 
        AND column_name = 'assigned_group';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verified:');
      console.log('   Column Name:', result.rows[0].column_name);
      console.log('   Data Type:', result.rows[0].data_type);
      console.log('   Max Length:', result.rows[0].character_maximum_length);
      console.log('   Nullable:', result.rows[0].is_nullable);
      console.log('\n');
    } else {
      console.log('⚠️  Warning: Column not found after creation!');
    }
    
    // Step 4: Check current data
    console.log('Step 4: Checking existing assignments...');
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(assigned_group) as with_group,
        COUNT(*) - COUNT(assigned_group) as without_group
      FROM exam_assignments;
    `);
    
    console.log('✅ Current state:');
    console.log('   Total assignments:', countResult.rows[0].total);
    console.log('   With group:', countResult.rows[0].with_group);
    console.log('   Without group:', countResult.rows[0].without_group);
    console.log('\n');
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy the updated admin-routes.js');
    console.log('   2. Restart your server: pm2 restart your-app');
    console.log('   3. Click "Sync Listes" to populate groups');
    console.log('   4. Export CSV to verify groups appear correctly');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed!');
    console.error(error);
    process.exit(1);
  });