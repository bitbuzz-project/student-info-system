// Create a new file: verify-and-fix-elements.js
// This script helps identify and fix remaining missing elements

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function verifyAndFixElements() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting element verification and fix process...\n');
    
    // 1. Check current missing elements
    console.log('📊 Step 1: Checking missing elements...');
    const missingQuery = await client.query(`
      SELECT 
        g.cod_elp,
        COUNT(*) as grade_count,
        COUNT(DISTINCT g.cod_etu) as student_count,
        MIN(g.cod_anu) as first_year,
        MAX(g.cod_anu) as last_year,
        STRING_AGG(DISTINCT g.cod_ses, ', ') as sessions
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE ep.cod_elp IS NULL
      GROUP BY g.cod_elp
      ORDER BY grade_count DESC
      LIMIT 100
    `);
    
    console.log(`   Found ${missingQuery.rows.length} unique missing elements`);
    
    if (missingQuery.rows.length === 0) {
      console.log('✅ No missing elements found! All grades have element info.');
      return;
    }
    
    // Show top 10 most impactful missing elements
    console.log('\n📋 Top 10 most impactful missing elements:');
    missingQuery.rows.slice(0, 10).forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.cod_elp}`);
      console.log(`      - ${row.grade_count} grades, ${row.student_count} students`);
      console.log(`      - Years: ${row.first_year}-${row.last_year}, Sessions: ${row.sessions}`);
    });
    
    // 2. Attempt to create placeholder elements for missing codes
    console.log('\n🔧 Step 2: Creating placeholder elements...');
    await client.query('BEGIN');
    
    let fixedCount = 0;
    
    for (const missing of missingQuery.rows) {
      const cod_elp = missing.cod_elp;
      
      // Try to extract semester info from the code
      let semesterNumber = null;
      let effectiveNel = null;
      let elementType = 'MATIERE';
      
      // Pattern 1: Direct S number (e.g., S1, S2)
      const sMatch = cod_elp.match(/S(\d{1,2})/i);
      if (sMatch) {
        semesterNumber = parseInt(sMatch[1]);
        effectiveNel = semesterNumber;
      }
      
      // Pattern 2: SM pattern (e.g., SM01, SM02)
      const smMatch = cod_elp.match(/SM(\d{1,2})/i);
      if (smMatch) {
        semesterNumber = parseInt(smMatch[1]);
        effectiveNel = semesterNumber;
      }
      
      // Pattern 3: Contains semester indicator in middle (e.g., JL1S1M01)
      if (!semesterNumber) {
        const complexMatch = cod_elp.match(/(\d)[Ss](\d)/);
        if (complexMatch) {
          semesterNumber = parseInt(complexMatch[2]);
          effectiveNel = semesterNumber;
        }
      }
      
      // Determine element type from code patterns
      if (cod_elp.includes('MOD') || cod_elp.includes('M0')) {
        elementType = 'MODULE';
      } else if (cod_elp.includes('UE') || cod_elp.includes('SM')) {
        elementType = 'SEMESTRE';
      }
      
      const syntheticName = `Element ${cod_elp} (auto-created)`;
      
      try {
        await client.query(`
          INSERT INTO element_pedagogi (
            cod_elp, cod_cmp, lib_elp, lic_elp, lib_elp_arb,
            element_type, semester_number, effective_nel, 
            last_sync, created_at, updated_at
          ) VALUES (
            $1, 'FJP', $2, $2, $2, $3, $4, $5, 
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (cod_elp) DO NOTHING
        `, [cod_elp, syntheticName, elementType, semesterNumber, effectiveNel]);
        
        fixedCount++;
        
        if (fixedCount % 10 === 0) {
          console.log(`   Progress: Fixed ${fixedCount}/${missingQuery.rows.length} elements...`);
        }
      } catch (err) {
        console.error(`   ❌ Failed to fix ${cod_elp}: ${err.message}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Created ${fixedCount} placeholder elements`);
    
    // 3. Verify the fix
    console.log('\n📊 Step 3: Verifying fix...');
    const verifyQuery = await client.query(`
      SELECT COUNT(*) as missing_count
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE ep.cod_elp IS NULL
    `);
    
    const stillMissing = parseInt(verifyQuery.rows[0].missing_count);
    
    if (stillMissing === 0) {
      console.log('✅ SUCCESS! All grades now have element information!');
    } else {
      console.log(`⚠️  Still ${stillMissing} grades without element info`);
      console.log('   These may require manual intervention or are from different COD_CMP');
      
      // Show what's still missing
      const remainingQuery = await client.query(`
        SELECT 
          g.cod_elp,
          COUNT(*) as count
        FROM grades g
        LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
        WHERE ep.cod_elp IS NULL
        GROUP BY g.cod_elp
        ORDER BY count DESC
        LIMIT 20
      `);
      
      console.log('\n   Top remaining missing elements:');
      remainingQuery.rows.forEach(row => {
        console.log(`      - ${row.cod_elp} (${row.count} grades)`);
      });
    }
    
    // 4. Statistics
    console.log('\n📊 Final Statistics:');
    const statsQuery = await client.query(`
      SELECT 
        COUNT(DISTINCT g.cod_elp) as total_unique_elements,
        COUNT(g.id) as total_grades,
        COUNT(DISTINCT CASE WHEN ep.cod_elp IS NOT NULL THEN g.cod_elp END) as elements_with_info,
        COUNT(DISTINCT CASE WHEN ep.cod_elp IS NULL THEN g.cod_elp END) as elements_without_info
      FROM grades g
      LEFT JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
    `);
    
    const stats = statsQuery.rows[0];
    console.log(`   Total unique elements in grades: ${stats.total_unique_elements}`);
    console.log(`   Elements with info: ${stats.elements_with_info}`);
    console.log(`   Elements without info: ${stats.elements_without_info}`);
    console.log(`   Coverage: ${((stats.elements_with_info / stats.total_unique_elements) * 100).toFixed(2)}%`);
    
    console.log('\n✅ Verification and fix process completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  verifyAndFixElements()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyAndFixElements };