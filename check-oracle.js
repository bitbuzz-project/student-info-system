const oracledb = require('oracledb');
require('dotenv').config();

// Force thick mode for older Oracle versions
oracledb.initOracleClient();

// Oracle connection config
const oracleConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SID}`
};

async function checkOracleStructure() {
  let connection;
  
  try {
    console.log('Connecting to Oracle...');
    connection = await oracledb.getConnection(oracleConfig);
    console.log('✓ Oracle connection successful');
    
    // Check RESULTAT_ELP table structure
    console.log('\n=== RESULTAT_ELP Table Structure ===');
    const resultColumns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS 
      WHERE TABLE_NAME = 'RESULTAT_ELP'
      ORDER BY COLUMN_ID
    `);
    
    console.log('Columns in RESULTAT_ELP:');
    resultColumns.rows.forEach(row => {
      console.log(`  - ${row[0]} (${row[1]}) - ${row[3] === 'Y' ? 'Nullable' : 'Not Null'}`);
    });
    
    // Check ELEMENT_PEDAGOGI table structure
    console.log('\n=== ELEMENT_PEDAGOGI Table Structure ===');
    const elementColumns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS 
      WHERE TABLE_NAME = 'ELEMENT_PEDAGOGI'
      ORDER BY COLUMN_ID
    `);
    
    console.log('Columns in ELEMENT_PEDAGOGI:');
    elementColumns.rows.forEach(row => {
      console.log(`  - ${row[0]} (${row[1]}) - ${row[3] === 'Y' ? 'Nullable' : 'Not Null'}`);
    });
    
    // Check INDIVIDU table structure
    console.log('\n=== INDIVIDU Table Structure ===');
    const individuColumns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM USER_TAB_COLUMNS 
      WHERE TABLE_NAME = 'INDIVIDU'
      ORDER BY COLUMN_ID
    `);
    
    console.log('Columns in INDIVIDU:');
    individuColumns.rows.forEach(row => {
      console.log(`  - ${row[0]} (${row[1]}) - ${row[3] === 'Y' ? 'Nullable' : 'Not Null'}`);
    });
    
    // Try to find the actual column names that might be similar
    console.log('\n=== Looking for similar column names ===');
    const similarColumns = await connection.execute(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM USER_TAB_COLUMNS 
      WHERE TABLE_NAME IN ('RESULTAT_ELP', 'ELEMENT_PEDAGOGI', 'INDIVIDU')
      AND (COLUMN_NAME LIKE '%ELP%' OR COLUMN_NAME LIKE '%COD%' OR COLUMN_NAME LIKE '%NOT%')
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    
    console.log('Similar columns found:');
    similarColumns.rows.forEach(row => {
      console.log(`  - ${row[0]}.${row[1]}`);
    });
    
    // Test a simple select to see what's actually in RESULTAT_ELP
    console.log('\n=== Sample data from RESULTAT_ELP ===');
    try {
      const sampleData = await connection.execute(`
        SELECT * FROM RESULTAT_ELP WHERE ROWNUM <= 3
      `);
      
      console.log('Sample columns:', sampleData.metaData.map(col => col.name));
      console.log('Sample data (first 3 rows):');
      sampleData.rows.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, row);
      });
      
    } catch (error) {
      console.log('Error getting sample data:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

checkOracleStructure();