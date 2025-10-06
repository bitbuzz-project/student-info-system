// migrate-pedagogical-situation.js
// Create this as a NEW file in your root directory

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

// Helper function to classify pedagogical elements
function classifyPedagogicalElement(cod_elp, lib_elp) {
  const codElpUpper = (cod_elp || '').toUpperCase();
  const libElpLower = (lib_elp || '').toLowerCase();
  
  let academicLevel = null;
  let isYearlyElement = false;
  
  // Check for yearly patterns in code
  if (codElpUpper.includes('1A') || codElpUpper.includes('0A1')) {
    academicLevel = '1A';
    isYearlyElement = true;
  } else if (codElpUpper.includes('2A') || codElpUpper.includes('0A2')) {
    academicLevel = '2A';
    isYearlyElement = true;
  } else if (codElpUpper.includes('3A') || codElpUpper.includes('0A3')) {
    academicLevel = '3A';
    isYearlyElement = true;
  } else if (codElpUpper.includes('4A') || codElpUpper.includes('0A4')) {
    academicLevel = '4A';
    isYearlyElement = true;
  } else if (codElpUpper.includes('5A') || codElpUpper.includes('0A5')) {
    academicLevel = '5A';
    isYearlyElement = true;
  }
  
  // Check for yearly patterns in description
  if (!isYearlyElement) {
    if (libElpLower.includes('premiere année') || libElpLower.includes('1ère année') || libElpLower.includes('first year')) {
      academicLevel = '1A';
      isYearlyElement = true;
    } else if (libElpLower.includes('deuxième année') || libElpLower.includes('2ème année') || libElpLower.includes('second year')) {
      academicLevel = '2A';
      isYearlyElement = true;
    } else if (libElpLower.includes('troisième année') || libElpLower.includes('3ème année') || libElpLower.includes('third year')) {
      academicLevel = '3A';
      isYearlyElement = true;
    } else if (libElpLower.includes('quatrième année') || libElpLower.includes('4ème année') || libElpLower.includes('fourth year')) {
      academicLevel = '4A';
      isYearlyElement = true;
    } else if (libElpLower.includes('cinquième année') || libElpLower.includes('5ème année') || libElpLower.includes('fifth year')) {
      academicLevel = '5A';
      isYearlyElement = true;
    }
  }
  
  // Check for VET patterns (common in many universities)
  if (!isYearlyElement && codElpUpper.includes('VET')) {
    if (codElpUpper.includes('1A') || libElpLower.includes('1') || libElpLower.includes('première')) {
      academicLevel = '1A';
      isYearlyElement = true;
    } else if (codElpUpper.includes('2A') || libElpLower.includes('2') || libElpLower.includes('deuxième')) {
      academicLevel = '2A';
      isYearlyElement = true;
    } else if (codElpUpper.includes('3A') || libElpLower.includes('3') || libElpLower.includes('troisième')) {
      academicLevel = '3A';
      isYearlyElement = true;
    }
  }
  
  // Check for semester patterns (only if not already classified as yearly)
  if (!isYearlyElement) {
    const semesterMatch = codElpUpper.match(/S(\d+)/);
    if (semesterMatch) {
      const semesterNum = parseInt(semesterMatch[1]);
      if (semesterNum >= 1 && semesterNum <= 12) {
        academicLevel = `S${semesterNum}`;
        isYearlyElement = false;
      }
    }
  }
  
  // If still no classification, check for other patterns
  if (!academicLevel) {
    // Check for license patterns
    if (libElpLower.includes('licence') || libElpLower.includes('l1') || libElpLower.includes('l2') || libElpLower.includes('l3')) {
      if (libElpLower.includes('l1') || libElpLower.includes('1')) {
        academicLevel = '1A';
      } else if (libElpLower.includes('l2') || libElpLower.includes('2')) {
        academicLevel = '2A';
      } else if (libElpLower.includes('l3') || libElpLower.includes('3')) {
        academicLevel = '3A';
      }
      isYearlyElement = true;
    }
    
    // Check for master patterns
    if (libElpLower.includes('master') || libElpLower.includes('m1') || libElpLower.includes('m2')) {
      if (libElpLower.includes('m1') || libElpLower.includes('1')) {
        academicLevel = '4A';
      } else if (libElpLower.includes('m2') || libElpLower.includes('2')) {
        academicLevel = '5A';
      }
      isYearlyElement = true;
    }
  }
  
  return {
    academicLevel: academicLevel || 'Unknown',
    isYearlyElement
  };
}

async function migratePedagogicalSituation() {
  try {
    console.log('🔄 Starting pedagogical situation migration...');
    console.log('=====================================\n');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pedagogical_situation'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Table pedagogical_situation does not exist!');
      console.log('Please run the sync first to create the table.');
      return;
    }
    
    console.log('✅ Table pedagogical_situation exists');
    
    // Add new columns if they don't exist
    console.log('🔄 Adding new columns...');
    await pool.query(`
      ALTER TABLE pedagogical_situation 
      ADD COLUMN IF NOT EXISTS academic_level VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_yearly_element BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ New columns added successfully');
    
    // Get all existing records
    console.log('🔄 Fetching existing records...');
    const existingRecords = await pool.query('SELECT id, cod_elp, lib_elp FROM pedagogical_situation');
    console.log(`📊 Found ${existingRecords.rows.length} records to process`);
    
    if (existingRecords.rows.length === 0) {
      console.log('⚠️  No records to process. Table is empty.');
      return;
    }
    
    // Update existing records
    console.log('🔄 Classifying and updating records...');
    
    let processedCount = 0;
    let yearlyCount = 0;
    let semesterCount = 0;
    let unknownCount = 0;
    
    const batchSize = 100;
    for (let i = 0; i < existingRecords.rows.length; i += batchSize) {
      const batch = existingRecords.rows.slice(i, i + batchSize);
      
      for (const record of batch) {
        const { academicLevel, isYearlyElement } = classifyPedagogicalElement(record.cod_elp, record.lib_elp);
        
        await pool.query(`
          UPDATE pedagogical_situation 
          SET academic_level = $1, is_yearly_element = $2 
          WHERE id = $3
        `, [academicLevel, isYearlyElement, record.id]);
        
        // Count classifications
        if (isYearlyElement) {
          yearlyCount++;
        } else {
          semesterCount++;
        }
        
        if (academicLevel === 'Unknown') {
          unknownCount++;
        }
        
        processedCount++;
      }
      
      // Progress indicator
      const progress = Math.round((i + batch.length) / existingRecords.rows.length * 100);
      console.log(`Progress: ${progress}% (${processedCount}/${existingRecords.rows.length})`);
    }
    
    console.log(`✅ Updated ${processedCount} existing records`);
    
    // Add indexes for better performance
    console.log('🔄 Adding performance indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pedagogical_situation_academic_level ON pedagogical_situation(academic_level);
      CREATE INDEX IF NOT EXISTS idx_pedagogical_situation_is_yearly ON pedagogical_situation(is_yearly_element);
      CREATE INDEX IF NOT EXISTS idx_pedagogical_situation_year_level ON pedagogical_situation(daa_uni_con, academic_level);
    `);
    console.log('✅ Added performance indexes');
    
    // Show detailed statistics
    console.log('\n📊 Classification Results:');
    console.log('=====================================');
    
    const stats = await pool.query(`
      SELECT 
        is_yearly_element,
        academic_level,
        COUNT(*) as count
      FROM pedagogical_situation 
      GROUP BY is_yearly_element, academic_level
      ORDER BY is_yearly_element DESC, academic_level
    `);
    
    console.log('\n📈 Detailed breakdown:');
    stats.rows.forEach(row => {
      const type = row.is_yearly_element ? 'Yearly  ' : 'Semester';
      console.log(`   ${type} - ${row.academic_level.padEnd(10)}: ${row.count.toString().padStart(4)} records`);
    });
    
    console.log('\n📋 Summary:');
    console.log(`   Total processed: ${processedCount}`);
    console.log(`   Yearly elements: ${yearlyCount}`);
    console.log(`   Semester elements: ${semesterCount}`);
    console.log(`   Unknown classification: ${unknownCount}`);
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migratePedagogicalSituation()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migratePedagogicalSituation };