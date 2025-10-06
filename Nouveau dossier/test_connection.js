// test-oracle-connection.js - Diagnostic script for Oracle connection issues
const oracledb = require('oracledb');
require('dotenv').config();

// Enhanced Oracle connection troubleshooting
async function diagnoseOracleConnection() {
  console.log('🔍 Oracle Connection Diagnostic Tool');
  console.log('=====================================\n');

  // 1. Check environment variables
  console.log('1. Checking environment variables...');
  const requiredVars = ['ORACLE_HOST', 'ORACLE_PORT', 'ORACLE_SID', 'ORACLE_USER', 'ORACLE_PASSWORD'];
  const missingVars = [];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.log(`❌ ${varName}: NOT SET`);
    } else {
      // Mask password for security
      const displayValue = varName === 'ORACLE_PASSWORD' ? '*'.repeat(value.length) : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  });

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('Please check your .env file and ensure all Oracle variables are set.');
    return;
  }

  // 2. Test different connection string formats
  console.log('\n2. Testing connection string formats...');
  
  const connectionConfigs = [
    {
      name: 'Standard Format',
      config: {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SID}`
      }
    },
    {
      name: 'TNS Format',
      config: {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${process.env.ORACLE_HOST})(PORT=${process.env.ORACLE_PORT}))(CONNECT_DATA=(SID=${process.env.ORACLE_SID})))`
      }
    },
    {
      name: 'Service Name Format',
      config: {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SID}`,
        connectTimeout: 60, // 60 seconds timeout
        callTimeout: 60
      }
    }
  ];

  for (const { name, config } of connectionConfigs) {
    console.log(`\nTesting ${name}:`);
    console.log(`Connection String: ${config.connectString}`);
    
    try {
      console.log('Attempting connection...');
      const connection = await oracledb.getConnection(config);
      console.log(`✅ ${name} - CONNECTION SUCCESSFUL!`);
      
      // Test a simple query
      try {
        const result = await connection.execute('SELECT SYSDATE FROM DUAL');
        console.log(`✅ Query test passed. Oracle time: ${result.rows[0][0]}`);
      } catch (queryError) {
        console.log(`⚠️  Connection successful but query failed: ${queryError.message}`);
      }
      
      await connection.close();
      console.log(`✅ Connection closed successfully`);
      break; // Success, no need to test other formats
      
    } catch (error) {
      console.log(`❌ ${name} failed: ${error.message}`);
      if (error.message.includes('ORA-12170')) {
        console.log('   → This is a connection timeout error');
      } else if (error.message.includes('ORA-12154')) {
        console.log('   → TNS could not resolve the connect identifier');
      } else if (error.message.includes('ORA-01017')) {
        console.log('   → Invalid username/password');
      } else if (error.message.includes('ORA-12505')) {
        console.log('   → TNS listener does not know of SID');
      }
    }
  }

  // 3. Network connectivity test
  console.log('\n3. Testing network connectivity...');
  await testNetworkConnectivity();

  // 4. Oracle client information
  console.log('\n4. Oracle Client Information...');
  try {
    console.log(`Oracle Client Version: ${oracledb.versionString}`);
    console.log(`Oracle Client Library: ${oracledb.oracleClientVersionString || 'Not available'}`);
  } catch (error) {
    console.log(`❌ Could not get Oracle client info: ${error.message}`);
  }

  // 5. Recommendations
  console.log('\n5. Troubleshooting Recommendations:');
  console.log('=====================================');
  console.log('📋 Common solutions for ORA-12170 (Connection timeout):');
  console.log('');
  console.log('🔹 Network Issues:');
  console.log('   • Check if the Oracle server is running');
  console.log('   • Verify the hostname/IP address is correct');
  console.log('   • Ensure port 1521 (or your Oracle port) is open');
  console.log('   • Check firewall settings on both client and server');
  console.log('   • Try pinging the Oracle server: ping ' + process.env.ORACLE_HOST);
  console.log('');
  console.log('🔹 Oracle Service Issues:');
  console.log('   • Verify Oracle listener is running on the server');
  console.log('   • Check if the SID/Service name is correct');
  console.log('   • Ensure the Oracle database instance is started');
  console.log('');
  console.log('🔹 Connection String Issues:');
  console.log('   • Try using IP address instead of hostname');
  console.log('   • Verify the port number (usually 1521)');
  console.log('   • Check if you need to use Service Name instead of SID');
  console.log('');
  console.log('🔹 Client Configuration:');
  console.log('   • Ensure Oracle Instant Client is properly installed');
  console.log('   • Check TNS_ADMIN environment variable if using tnsnames.ora');
  console.log('   • Try increasing connection timeout values');
  console.log('');
  console.log('🔹 University Network Specific:');
  console.log('   • Contact your IT department for Oracle server details');
  console.log('   • Check if VPN connection is required');
  console.log('   • Verify you have access permissions to the Oracle database');
  console.log('   • Ask for the correct connection parameters from the database administrator');
}

async function testNetworkConnectivity() {
  const net = require('net');
  const host = process.env.ORACLE_HOST;
  const port = parseInt(process.env.ORACLE_PORT) || 1521;

  return new Promise((resolve) => {
    console.log(`Testing TCP connection to ${host}:${port}...`);
    
    const socket = new net.Socket();
    const timeout = 10000; // 10 seconds

    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      console.log(`✅ TCP connection to ${host}:${port} successful`);
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log(`❌ TCP connection timeout to ${host}:${port}`);
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (error) => {
      console.log(`❌ TCP connection error to ${host}:${port}: ${error.message}`);
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Create a simplified sync service for testing without Oracle
async function createMockSyncService() {
  console.log('\n6. Creating mock sync service for development...');
  console.log('=====================================');

  const fs = require('fs').promises;
  
  const mockSyncContent = `
// mock-sync-service.js - Development version without Oracle dependency
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function mockSyncStudents() {
  console.log('🔄 Running mock sync for development...');
  
  try {
    // Create sample students data
    const sampleStudents = [
      {
        cod_etu: 'STU001',
        lib_nom_pat_ind: 'احمد محمد',
        lib_pr1_ind: 'علي',
        cin_ind: 'AB123456',
        cod_etp: 'DROIT',
        cod_anu: 2024,
        lib_etp: 'دبلوم الإجازة في القانون',
        lic_etp: 'Licence en Droit'
      },
      {
        cod_etu: 'STU002',
        lib_nom_pat_ind: 'فاطمة الزهراء',
        lib_pr1_ind: 'بنت محمد',
        cin_ind: 'CD789012',
        cod_etp: 'DROIT',
        cod_anu: 2024,
        lib_etp: 'دبلوم الإجازة في القانون',
        lic_etp: 'Licence en Droit'
      }
    ];

    // Insert sample students
    for (const student of sampleStudents) {
      await pool.query(\`
        INSERT INTO students (
          cod_etu, lib_nom_pat_ind, lib_pr1_ind, cin_ind, cod_etp, cod_anu, lib_etp, lic_etp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (cod_etu) DO UPDATE SET
          lib_nom_pat_ind = EXCLUDED.lib_nom_pat_ind,
          lib_pr1_ind = EXCLUDED.lib_pr1_ind,
          updated_at = CURRENT_TIMESTAMP
      \`, [
        student.cod_etu, student.lib_nom_pat_ind, student.lib_pr1_ind,
        student.cin_ind, student.cod_etp, student.cod_anu, student.lib_etp, student.lic_etp
      ]);
    }

    console.log('✓ Mock sync completed successfully');
    console.log('✓ Sample students and data inserted');
    console.log('✓ Your application should now work for development');
    
  } catch (error) {
    console.error('Mock sync failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  mockSyncStudents();
}

module.exports = { mockSyncStudents };
  `;

  try {
    await fs.writeFile('mock-sync-service.js', mockSyncContent);
    console.log('✅ Created mock-sync-service.js for development');
    console.log('');
    console.log('To use the mock sync service:');
    console.log('1. Run: node mock-sync-service.js');
    console.log('2. This will create sample data for development');
    console.log('3. Your web application will work without Oracle connection');
    console.log('');
    console.log('Note: Once Oracle connection is fixed, switch back to the original sync-service.js');
  } catch (error) {
    console.log('❌ Could not create mock sync service:', error.message);
  }
}

// Run diagnostics
if (require.main === module) {
  diagnoseOracleConnection()
    .then(() => createMockSyncService())
    .then(() => {
      console.log('\n🎯 Next Steps:');
      console.log('1. Contact your IT department for correct Oracle connection details');
      console.log('2. Use mock-sync-service.js for development until Oracle is available');
      console.log('3. Test the reclamations system we just created!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Diagnostic failed:', error);
      process.exit(1);
    });
}
`;

module.exports = { diagnoseOracleConnection };