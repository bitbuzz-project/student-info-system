// auto-fix-semesters.js
// Automatically fixes semester assignments using existing database information
// No manual editing needed!

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function autoFixSemesters() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 AUTO-FIX SEMESTERS USING DATABASE INFO\n');
    console.log('This uses information from official_documents and grades tables');
    console.log('to automatically detect and fix semester assignments.\n');
    
    console.log('Step 1: Analyzing existing data...');
    
    // Use the database information to detect semesters
    const updateQuery = `
      WITH student_module_usage AS (
        -- Get semester info from official_documents (most reliable)
        SELECT 
          od.cod_elp,
          CASE
            -- Master patterns
            WHEN od.cod_elp ~ '^JMD?S1' THEN 1
            WHEN od.cod_elp ~ '^JMD?S2' THEN 2
            WHEN od.cod_elp ~ '^JMD?S3' THEN 3
            WHEN od.cod_elp ~ '^JMD?S4' THEN 4
            
            -- Licence d'Excellence patterns
            WHEN od.cod_elp ~ '^JLDN1' THEN 1
            WHEN od.cod_elp ~ '^JLDN2' THEN 2
            WHEN od.cod_elp ~ '^JLDN3' THEN 3
            WHEN od.cod_elp ~ '^JLDN4' THEN 4
            WHEN od.cod_elp ~ '^JLDN5' THEN 5
            WHEN od.cod_elp ~ '^JLDN6' THEN 6
            
            -- Standard Licence
            WHEN od.cod_elp ~ '^JL[^D].*S1' THEN 1
            WHEN od.cod_elp ~ '^JL[^D].*S2' THEN 2
            WHEN od.cod_elp ~ '^JL[^D].*S3' THEN 3
            WHEN od.cod_elp ~ '^JL[^D].*S4' THEN 4
            WHEN od.cod_elp ~ '^JL[^D].*S5' THEN 5
            WHEN od.cod_elp ~ '^JL[^D].*S6' THEN 6
            
            -- Year-based patterns
            WHEN od.cod_elp ~ '^JL1S1' THEN 1
            WHEN od.cod_elp ~ '^JL1S2' THEN 2
            WHEN od.cod_elp ~ '^JL2S3' THEN 3
            WHEN od.cod_elp ~ '^JL2S4' THEN 4
            WHEN od.cod_elp ~ '^JL3S5' THEN 5
            WHEN od.cod_elp ~ '^JL3S6' THEN 6
            
            -- Generic fallback
            WHEN od.cod_elp ~ 'S1[^0-9]' OR od.cod_elp ~ 'S1$' THEN 1
            WHEN od.cod_elp ~ 'S2[^0-9]' OR od.cod_elp ~ 'S2$' THEN 2
            WHEN od.cod_elp ~ 'S3[^0-9]' OR od.cod_elp ~ 'S3$' THEN 3
            WHEN od.cod_elp ~ 'S4[^0-9]' OR od.cod_elp ~ 'S4$' THEN 4
            WHEN od.cod_elp ~ 'S5[^0-9]' OR od.cod_elp ~ 'S5$' THEN 5
            WHEN od.cod_elp ~ 'S6[^0-9]' OR od.cod_elp ~ 'S6$' THEN 6
            WHEN od.cod_elp ~ 'S7[^0-9]' OR od.cod_elp ~ 'S7$' THEN 7
            WHEN od.cod_elp ~ 'S8[^0-9]' OR od.cod_elp ~ 'S8$' THEN 8
            ELSE NULL
          END as detected_semester,
          COUNT(DISTINCT od.cod_etu) as student_count
        FROM official_documents od
        WHERE od.cod_elp IS NOT NULL
        GROUP BY od.cod_elp
      ),
      grade_module_usage AS (
        -- Also from grades table
        SELECT 
          g.cod_elp,
          CASE
            WHEN g.cod_elp ~ '^JMD?S1' THEN 1
            WHEN g.cod_elp ~ '^JMD?S2' THEN 2
            WHEN g.cod_elp ~ '^JMD?S3' THEN 3
            WHEN g.cod_elp ~ '^JMD?S4' THEN 4
            WHEN g.cod_elp ~ '^JLDN1' THEN 1
            WHEN g.cod_elp ~ '^JLDN2' THEN 2
            WHEN g.cod_elp ~ '^JLDN3' THEN 3
            WHEN g.cod_elp ~ '^JLDN4' THEN 4
            WHEN g.cod_elp ~ '^JLDN5' THEN 5
            WHEN g.cod_elp ~ '^JLDN6' THEN 6
            WHEN g.cod_elp ~ '^JL[^D].*S1' THEN 1
            WHEN g.cod_elp ~ '^JL[^D].*S2' THEN 2
            WHEN g.cod_elp ~ '^JL[^D].*S3' THEN 3
            WHEN g.cod_elp ~ '^JL[^D].*S4' THEN 4
            WHEN g.cod_elp ~ '^JL[^D].*S5' THEN 5
            WHEN g.cod_elp ~ '^JL[^D].*S6' THEN 6
            WHEN g.cod_elp ~ 'S1[^0-9]' OR g.cod_elp ~ 'S1$' THEN 1
            WHEN g.cod_elp ~ 'S2[^0-9]' OR g.cod_elp ~ 'S2$' THEN 2
            WHEN g.cod_elp ~ 'S3[^0-9]' OR g.cod_elp ~ 'S3$' THEN 3
            WHEN g.cod_elp ~ 'S4[^0-9]' OR g.cod_elp ~ 'S4$' THEN 4
            WHEN g.cod_elp ~ 'S5[^0-9]' OR g.cod_elp ~ 'S5$' THEN 5
            WHEN g.cod_elp ~ 'S6[^0-9]' OR g.cod_elp ~ 'S6$' THEN 6
            ELSE NULL
          END as detected_semester,
          COUNT(DISTINCT g.cod_etu) as student_count
        FROM grades g
        WHERE g.cod_elp IS NOT NULL
        GROUP BY g.cod_elp
      ),
      combined AS (
        SELECT 
          COALESCE(smu.cod_elp, gmu.cod_elp) as cod_elp,
          COALESCE(smu.detected_semester, gmu.detected_semester) as detected_semester
        FROM student_module_usage smu
        FULL OUTER JOIN grade_module_usage gmu ON smu.cod_elp = gmu.cod_elp
        WHERE COALESCE(smu.detected_semester, gmu.detected_semester) IS NOT NULL
      )
      UPDATE element_pedagogi ep
      SET 
        semester_number = c.detected_semester,
        effective_nel = c.detected_semester,
        updated_at = CURRENT_TIMESTAMP
      FROM combined c
      WHERE ep.cod_elp = c.cod_elp
        AND (ep.semester_number IS DISTINCT FROM c.detected_semester 
             OR ep.effective_nel IS DISTINCT FROM c.detected_semester)
      RETURNING ep.cod_elp, ep.semester_number
    `;
    
    console.log('Step 2: Applying automatic fixes...');
    const result = await client.query(updateQuery);
    
    console.log(`✅ Updated ${result.rowCount} modules!\n`);
    
    // Verification
    console.log('Step 3: Verifying results...\n');
    
    const verifyQuery = await client.query(`
      SELECT 
        CASE 
          WHEN cod_elp ~ '^JMD' THEN 'Master'
          WHEN cod_elp ~ '^JLDN' THEN 'Licence Excellence'
          WHEN cod_elp ~ '^JL' THEN 'Licence Standard'
          ELSE 'Other'
        END as program,
        semester_number,
        COUNT(*) as count
      FROM element_pedagogi
      WHERE semester_number IS NOT NULL
      GROUP BY 
        CASE 
          WHEN cod_elp ~ '^JMD' THEN 'Master'
          WHEN cod_elp ~ '^JLDN' THEN 'Licence Excellence'
          WHEN cod_elp ~ '^JL' THEN 'Licence Standard'
          ELSE 'Other'
        END,
        semester_number
      ORDER BY program, semester_number
    `);
    
    console.log('📊 Modules by Program and Semester:');
    console.log('───────────────────────────────────');
    verifyQuery.rows.forEach(row => {
      console.log(`${row.program.padEnd(25)} S${row.semester_number}: ${row.count} modules`);
    });
    
    // Check for remaining issues
    const issuesQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM grades g
      INNER JOIN element_pedagogi ep ON g.cod_elp = ep.cod_elp
      WHERE ep.semester_number IS NULL
    `);
    
    const remainingIssues = parseInt(issuesQuery.rows[0].count);
    
    console.log('\n📋 Final Status:');
    console.log('───────────────────────────────────');
    if (remainingIssues === 0) {
      console.log('✅ All modules with grades now have semester assignments!');
    } else {
      console.log(`⚠️  ${remainingIssues} grades still have modules without semesters`);
      console.log('   These may need manual review.');
    }
    
    // Sample of what was fixed
    console.log('\n📝 Sample of Fixed Modules:');
    console.log('───────────────────────────────────');
    const sampleQuery = await client.query(`
      SELECT 
        cod_elp,
        lib_elp,
        semester_number,
        CASE 
          WHEN cod_elp ~ '^JMD' THEN 'Master'
          WHEN cod_elp ~ '^JLDN' THEN 'Licence Excellence'
          ELSE 'Licence'
        END as program
      FROM element_pedagogi
      WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'
      ORDER BY semester_number, cod_elp
      LIMIT 20
    `);
    
    sampleQuery.rows.forEach(row => {
      console.log(`${row.cod_elp.padEnd(15)} S${row.semester_number} [${row.program}]`);
      console.log(`  "${row.lib_elp}"`);
    });
    
    if (result.rowCount > 20) {
      console.log(`  ... and ${result.rowCount - 20} more`);
    }
    
    console.log('\n✅ Auto-fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  autoFixSemesters()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { autoFixSemesters };