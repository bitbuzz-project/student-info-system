// DIAGNOSTIC SCRIPT: Check Refresh Issues
// Run this to diagnose problems with the refresh endpoint

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function diagnose() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DIAGNOSTIC: Checking Refresh Prerequisites\n');
    console.log('=' .repeat(60));

    // 1. Check pedagogical_situation table
    console.log('\n1️⃣  Checking pedagogical_situation table...');
    const psCount = await client.query('SELECT COUNT(*) FROM pedagogical_situation');
    console.log(`   ✓ Total records: ${psCount.rows[0].count}`);
    
    const psWithSemester = await client.query('SELECT COUNT(*) FROM pedagogical_situation WHERE semester_number IS NOT NULL');
    console.log(`   ✓ With semester_number: ${psWithSemester.rows[0].count}`);
    
    const psSample = await client.query('SELECT cod_elp, lib_elp, semester_number, COUNT(*) as students FROM pedagogical_situation GROUP BY cod_elp, lib_elp, semester_number LIMIT 5');
    console.log(`   ✓ Sample modules:`);
    psSample.rows.forEach(r => {
      console.log(`     - ${r.cod_elp}: ${r.lib_elp} (S${r.semester_number || '?'}) - ${r.students} students`);
    });

    // 2. Check exam_planning table
    console.log('\n2️⃣  Checking exam_planning table...');
    const examCount = await client.query('SELECT COUNT(*) FROM exam_planning WHERE exam_date >= CURRENT_DATE');
    console.log(`   ✓ Future exams: ${examCount.rows[0].count}`);
    
    const examSample = await client.query(`
      SELECT 
        id, 
        module_code, 
        module_name, 
        group_name, 
        location,
        (SELECT COUNT(*) FROM exam_assignments WHERE exam_id = exam_planning.id) as assigned_count
      FROM exam_planning 
      WHERE exam_date >= CURRENT_DATE
      LIMIT 5
    `);
    console.log(`   ✓ Sample exams:`);
    examSample.rows.forEach(r => {
      console.log(`     - ${r.module_code}: ${r.module_name} (${r.group_name}) @ ${r.location} - ${r.assigned_count} students`);
    });

    // 3. Check grouping_rules table
    console.log('\n3️⃣  Checking grouping_rules table...');
    const rulesCount = await client.query('SELECT COUNT(*) FROM grouping_rules');
    console.log(`   ✓ Total rules: ${rulesCount.rows[0].count}`);
    
    const rulesSample = await client.query('SELECT module_pattern, group_name, range_start, range_end FROM grouping_rules LIMIT 5');
    console.log(`   ✓ Sample rules:`);
    rulesSample.rows.forEach(r => {
      console.log(`     - ${r.module_pattern} / ${r.group_name}: ${r.range_start} → ${r.range_end}`);
    });

    // 4. Test a sample query
    console.log('\n4️⃣  Testing sample eligible students query...');
    const testModule = examSample.rows[0]?.module_code;
    const testGroup = examSample.rows[0]?.group_name;
    
    if (testModule) {
      console.log(`   Testing module: ${testModule}, group: ${testGroup}`);
      
      try {
        let query = `
          SELECT DISTINCT 
            ps.cod_etu,
            ps.lib_nom_pat_ind,
            ps.lib_elp
          FROM pedagogical_situation ps
          WHERE TRIM(ps.cod_elp) ILIKE TRIM($1)
        `;
        
        const params = [testModule];
        
        if (testGroup && testGroup !== 'Tous') {
          const groups = testGroup.split('+').map(s => s.trim().replace(/\(.*\)$/, '').trim());
          const groupConds = groups.map((g, idx) => {
            params.push(g);
            return `EXISTS (
              SELECT 1 FROM grouping_rules gr
              WHERE TRIM(ps.cod_elp) ILIKE gr.module_pattern
              AND gr.group_name = $${idx + 2}
              AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
              AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
            )`;
          });
          query += ` AND (${groupConds.join(' OR ')})`;
        }
        
        query += ` ORDER BY ps.lib_nom_pat_ind LIMIT 10`;
        
        const testResult = await client.query(query, params);
        console.log(`   ✓ Found ${testResult.rowCount} students (showing first 10)`);
        testResult.rows.forEach(r => {
          console.log(`     - ${r.cod_etu}: ${r.lib_nom_pat_ind} (${r.lib_elp})`);
        });
      } catch (testError) {
        console.log(`   ❌ Query error: ${testError.message}`);
      }
    }

    // 5. Check for common issues
    console.log('\n5️⃣  Checking for common issues...');
    
    // Check for exams without module_code
    const noModuleCode = await client.query('SELECT COUNT(*) FROM exam_planning WHERE module_code IS NULL OR module_code = \'\'');
    if (parseInt(noModuleCode.rows[0].count) > 0) {
      console.log(`   ⚠️  WARNING: ${noModuleCode.rows[0].count} exams have empty module_code`);
    } else {
      console.log(`   ✓ All exams have module_code`);
    }
    
    // Check for students without proper names
    const noNames = await client.query('SELECT COUNT(*) FROM pedagogical_situation WHERE lib_nom_pat_ind IS NULL OR lib_nom_pat_ind = \'\'');
    if (parseInt(noNames.rows[0].count) > 0) {
      console.log(`   ⚠️  WARNING: ${noNames.rows[0].count} students have empty names`);
    } else {
      console.log(`   ✓ All students have names`);
    }
    
    // Check database encoding
    const encoding = await client.query('SHOW client_encoding');
    console.log(`   ✓ Database encoding: ${encoding.rows[0].client_encoding}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('\n❌ Diagnostic error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run diagnostic
diagnose();