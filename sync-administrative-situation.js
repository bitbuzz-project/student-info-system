const oracledb = require('oracledb');
const { Pool } = require('pg');
const winston = require('winston');
require('dotenv').config();

// Force thick mode for older Oracle versions
try {
  oracledb.initOracleClient();
} catch (err) {
  console.error('Oracle Client init error:', err);
}

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.colorize({ all: true })
    }),
    new winston.transports.File({ 
      filename: 'sync-administrative-situation.log',
      format: winston.format.json()
    })
  ]
});

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

// Oracle connection config
const oracleConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SID}`
};

// ==========================================
// ADMINISTRATIVE SITUATION QUERY
// ==========================================
const ADMINISTRATIVE_SITUATION_QUERY = `
  SELECT 
    i.COD_ETU,
    iae.COD_ANU,
    iae.COD_ETP,
    etp.LIB_ETP,
    etp.LIC_ETP,
    iae.COD_VRS_VET,
    iae.ETA_IAE,
    iae.TEM_IAE_PRM,
    iae.DAT_CRE_IAE,
    iae.DAT_MOD_IAE,
    iae.NBR_INS_CYC,
    iae.NBR_INS_ETP,
    iae.NBR_INS_DIP,
    iae.TEM_DIP_IAE,
    iae.COD_UTI,
    d.LIB_DIP
  FROM INS_ADM_ETP iae
  JOIN INDIVIDU i ON iae.COD_IND = i.COD_IND
  JOIN ETAPE etp ON iae.COD_ETP = etp.COD_ETP
  LEFT JOIN DIPLOME d ON iae.COD_DIP = d.COD_DIP
  WHERE iae.COD_CMP = 'FJP'
    AND iae.ETA_IAE = 'E'
  ORDER BY i.COD_ETU, iae.COD_ANU DESC
`;

// ==========================================
// SYNC ADMINISTRATIVE SITUATION FUNCTION
// ==========================================
async function syncAdministrativeSituation(oracleConnection, pgClient) {
  logger.info('=====================================');
  logger.info('📋 SYNCING ADMINISTRATIVE SITUATION...');
  logger.info('=====================================');
  
  // Create table if not exists
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS administrative_situation (
      id SERIAL PRIMARY KEY,
      cod_etu VARCHAR(20) NOT NULL,
      cod_anu INTEGER,
      cod_etp VARCHAR(20),
      lib_etp VARCHAR(200),
      lic_etp VARCHAR(200),
      cod_vrs_vet VARCHAR(20),
      eta_iae VARCHAR(10),
      tem_iae_prm VARCHAR(10),
      dat_cre_iae DATE,
      dat_mod_iae DATE,
      nbr_ins_cyc INTEGER,
      nbr_ins_etp INTEGER,
      nbr_ins_dip INTEGER,
      tem_dip_iae VARCHAR(10),
      cod_uti VARCHAR(20),
      lib_dip VARCHAR(200),
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_etu, cod_anu, cod_etp)
    )
  `);
  
  logger.info('Fetching data from Oracle...');
  const result = await oracleConnection.execute(
    ADMINISTRATIVE_SITUATION_QUERY,
    [],
    { outFormat: oracledb.OUT_FORMAT_ARRAY }
  );
  
  const rows = result.rows;
  logger.info(`Retrieved ${rows.length} records from Oracle`);
  
  if (rows.length === 0) {
    logger.warn('⚠️  No records found in Oracle database');
    return;
  }
  
  // Insert/Update records in PostgreSQL
  await pgClient.query('BEGIN');
  
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const row of rows) {
    try {
      const result = await pgClient.query(`
        INSERT INTO administrative_situation (
          cod_etu, cod_anu, cod_etp, lib_etp, lic_etp, cod_vrs_vet, eta_iae,
          tem_iae_prm, dat_cre_iae, dat_mod_iae, nbr_ins_cyc, nbr_ins_etp,
          nbr_ins_dip, tem_dip_iae, cod_uti, lib_dip, last_sync
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
        ON CONFLICT (cod_etu, cod_anu, cod_etp) DO UPDATE SET
          lib_etp = EXCLUDED.lib_etp,
          lic_etp = EXCLUDED.lic_etp,
          cod_vrs_vet = EXCLUDED.cod_vrs_vet,
          eta_iae = EXCLUDED.eta_iae,
          tem_iae_prm = EXCLUDED.tem_iae_prm,
          dat_cre_iae = EXCLUDED.dat_cre_iae,
          dat_mod_iae = EXCLUDED.dat_mod_iae,
          nbr_ins_cyc = EXCLUDED.nbr_ins_cyc,
          nbr_ins_etp = EXCLUDED.nbr_ins_etp,
          nbr_ins_dip = EXCLUDED.nbr_ins_dip,
          tem_dip_iae = EXCLUDED.tem_dip_iae,
          cod_uti = EXCLUDED.cod_uti,
          lib_dip = EXCLUDED.lib_dip,
          last_sync = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `, row);
      
      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
      
      if ((insertedCount + updatedCount) % 100 === 0) {
        logger.info(`Processed ${insertedCount + updatedCount} records...`);
      }
      
    } catch (error) {
      errorCount++;
      logger.error(`Error processing record for student ${row[0]}: ${error.message}`);
    }
  }
  
  await pgClient.query('COMMIT');
  
  logger.info('=====================================');
  logger.info(`✓ Administrative situation sync completed:`);
  logger.info(`   - Total records: ${rows.length}`);
  logger.info(`   - Inserted: ${insertedCount}`);
  logger.info(`   - Updated: ${updatedCount}`);
  logger.info(`   - Errors: ${errorCount}`);
  logger.info('=====================================');
}

// ==========================================
// MAIN EXECUTION FUNCTION
// ==========================================
async function runSync() {
  let oracleConnection;
  let pgClient;
  const startTime = Date.now();
  
  try {
    logger.info('=====================================');
    logger.info('Starting Administrative Situation Sync...');
    logger.info(`Start time: ${new Date().toISOString()}`);
    logger.info('=====================================');
    
    // Connect to PostgreSQL
    logger.info('Connecting to PostgreSQL...');
    pgClient = await pgPool.connect();
    logger.info('✓ PostgreSQL connected');
    
    // Connect to Oracle
    logger.info('Connecting to Oracle...');
    oracleConnection = await oracledb.getConnection(oracleConfig);
    logger.info('✓ Oracle connected');
    
    // Perform sync
    await syncAdministrativeSituation(oracleConnection, pgClient);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logger.info('=====================================');
    logger.info(`✓ SYNC COMPLETED SUCCESSFULLY`);
    logger.info(`   Duration: ${duration} seconds`);
    logger.info(`   End time: ${new Date().toISOString()}`);
    logger.info('=====================================');
    
  } catch (error) {
    logger.error('=====================================');
    logger.error(`✗ SYNC FAILED: ${error.message}`);
    logger.error(`   Stack: ${error.stack}`);
    logger.error('=====================================');
    
    if (pgClient) {
      try {
        await pgClient.query('ROLLBACK');
        logger.info('Transaction rolled back');
      } catch (rollbackError) {
        logger.error(`Rollback failed: ${rollbackError.message}`);
      }
    }
    throw error;
    
  } finally {
    // Clean up connections
    if (oracleConnection) {
      try {
        await oracleConnection.close();
        logger.info('Oracle connection closed');
      } catch (closeError) {
        logger.error(`Error closing Oracle connection: ${closeError.message}`);
      }
    }
    
    if (pgClient) {
      try {
        pgClient.release();
        logger.info('PostgreSQL connection released');
      } catch (releaseError) {
        logger.error(`Error releasing PostgreSQL connection: ${releaseError.message}`);
      }
    }
  }
}

// ==========================================
// VERIFY DATA FUNCTION (OPTIONAL)
// ==========================================
async function verifySync() {
  const pgClient = await pgPool.connect();
  
  try {
    const result = await pgClient.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT cod_etu) as unique_students,
        COUNT(DISTINCT cod_anu) as unique_years,
        MIN(last_sync) as oldest_sync,
        MAX(last_sync) as newest_sync
      FROM administrative_situation
    `);
    
    logger.info('=====================================');
    logger.info('DATABASE VERIFICATION:');
    logger.info(`   Total records: ${result.rows[0].total_records}`);
    logger.info(`   Unique students: ${result.rows[0].unique_students}`);
    logger.info(`   Unique years: ${result.rows[0].unique_years}`);
    logger.info(`   Oldest sync: ${result.rows[0].oldest_sync}`);
    logger.info(`   Newest sync: ${result.rows[0].newest_sync}`);
    logger.info('=====================================');
    
  } finally {
    pgClient.release();
  }
}

// ==========================================
// CLI EXECUTION
// ==========================================
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--verify')) {
    verifySync()
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error(`Verification failed: ${error.message}`);
        process.exit(1);
      });
  } else {
    runSync()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

// ==========================================
// EXPORTS
// ==========================================
module.exports = { 
  syncAdministrativeSituation,
  runSync,
  verifySync
};
