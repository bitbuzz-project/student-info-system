const oracledb = require('oracledb');
const { Pool } = require('pg');
const winston = require('winston');
require('dotenv').config();

// Force thick mode for older Oracle versions if needed
try {
  oracledb.initOracleClient();
} catch (err) {
  console.error('Oracle Client init error (ignoring if unnecessary):', err.message);
}

// Simple Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

// DB Configurations
const pgPool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

const oracleConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SID}`
};

// ==========================================
// 1. HELPERS
// ==========================================

function classifyPedagogicalElement(cod_elp, lib_elp) {
  const code = (cod_elp || '').toUpperCase();
  const name = (lib_elp || '').toLowerCase();
  let level = null;
  let yearly = false;
  
  if (code.includes('1A') || name.includes('premiere')) { level = '1A'; yearly = true; }
  else if (code.includes('2A') || name.includes('deuxieme')) { level = '2A'; yearly = true; }
  else if (code.includes('3A') || name.includes('troisieme')) { level = '3A'; yearly = true; }
  
  return { academicLevel: level || 'Unknown', isYearlyElement: yearly };
}

// ==========================================
// 2. QUERY FOR FULL SYNC
// ==========================================

const PEDAGOGICAL_SITUATION_QUERY = `
SELECT DISTINCT 
    IND.COD_ETU AS APOGEE,
    IND.LIB_NOM_PAT_IND AS NOM,
    IND.LIB_PR1_IND AS PRENOM,
    IND.DAA_ENT_ETB AS DATE_UNI_CON,  -- Correct column for Entry Date
    ICE.COD_ELP,
    fix_encoding(ELP.LIB_ELP) AS MODULE,
    fix_encoding(ELP.LIB_ELP_ARB) AS MODULE_ARB,
    MAX(IAE.ETA_IAE) OVER (
        PARTITION BY ICE.COD_IND, ICE.COD_ANU, ICE.COD_ETP, ICE.COD_VRS_VET
    ) AS IA
FROM IND_CONTRAT_ELP ICE
    JOIN INDIVIDU IND ON ICE.COD_IND = IND.COD_IND
    JOIN ELEMENT_PEDAGOGI ELP ON ICE.COD_ELP = ELP.COD_ELP
    LEFT JOIN INS_ADM_ETP IAE ON (
        ICE.COD_IND = IAE.COD_IND 
        AND ICE.COD_ANU = IAE.COD_ANU 
        AND ICE.COD_ETP = IAE.COD_ETP 
        AND ICE.COD_VRS_VET = IAE.COD_VRS_VET
    )
WHERE 
    ICE.TEM_PRC_ICE = 'N'    -- LOGIC 1: Exclude previously compensated modules
    AND ICE.COD_ANU = :year  -- LOGIC 2: Current Year Only
    AND ICE.COD_CIP = 'FJP'  -- LOGIC 3: Faculty Filter
    AND ELP.COD_NEL = 'MOD'  -- LOGIC 4: Modules Only
    -- NOTE: Removed specific semester filters (JL%, S2, etc.) to allow FULL SYNC
ORDER BY IND.COD_ETU, ICE.COD_ELP
`;

// ==========================================
// 3. SYNC FUNCTION
// ==========================================

async function syncPedagogicalSituationOnly() {
  let oracleConnection;
  let pgClient;
  const currentYear = 2025; 

  try {
    logger.info('Connecting to databases...');
    pgClient = await pgPool.connect();
    oracleConnection = await oracledb.getConnection(oracleConfig);

    logger.info(`Starting FULL Pedagogical Situation Sync for year ${currentYear}...`);

    // 1. Create Table (if not exists)
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS pedagogical_situation (
        id SERIAL PRIMARY KEY,
        cod_etu VARCHAR(20) NOT NULL,
        lib_nom_pat_ind VARCHAR(100),
        lib_pr1_ind VARCHAR(100),
        daa_uni_con INTEGER,
        cod_elp VARCHAR(20) NOT NULL,
        lib_elp VARCHAR(200),
        lib_elp_arb VARCHAR(200),
        eta_iae VARCHAR(10),
        academic_level VARCHAR(20),
        is_yearly_element BOOLEAN DEFAULT FALSE,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cod_etu, cod_elp, daa_uni_con)
      )
    `);
    
    await pgClient.query(`ALTER TABLE pedagogical_situation ADD COLUMN IF NOT EXISTS lib_elp_arb VARCHAR(200)`);

    // 2. CLEAR TABLE (TRUNCATE) - Cleans old data before full sync
    logger.info('🧹 Clearing existing data (TRUNCATE)...');
    await pgClient.query('TRUNCATE TABLE pedagogical_situation RESTART IDENTITY');

    // 3. Execute Oracle Query
    logger.info('Executing Oracle query...');
    const result = await oracleConnection.execute(PEDAGOGICAL_SITUATION_QUERY, { year: currentYear });
    const rows = result.rows;
    
    logger.info(`Fetched ${rows.length} rows. Inserting into Postgres...`);

    // 4. Insert Data
    await pgClient.query('BEGIN');
    let count = 0;
    
    for (const row of rows) {
      const [apogee, nom, prenom, date_uni_con, cod_elp, module, module_arb, ia] = row;
      const { academicLevel, isYearlyElement } = classifyPedagogicalElement(cod_elp, module);
      
      await pgClient.query(`
        INSERT INTO pedagogical_situation (
          cod_etu, lib_nom_pat_ind, lib_pr1_ind, daa_uni_con, 
          cod_elp, lib_elp, lib_elp_arb, eta_iae, academic_level, is_yearly_element, last_sync
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      `, [apogee, nom, prenom, date_uni_con, cod_elp, module, module_arb, ia, academicLevel, isYearlyElement]);
      
      count++;
      if (count % 1000 === 0) process.stdout.write('.');
    }
    
    await pgClient.query('COMMIT');
    console.log('');
    logger.info(`✓ Success! Synced ${count} records.`);

  } catch (error) {
    logger.error(`✗ FAILED: ${error.message}`);
    if (pgClient) await pgClient.query('ROLLBACK');
  } finally {
    if (oracleConnection) {
      try { await oracleConnection.close(); } catch (e) { console.error(e); }
    }
    if (pgClient) pgClient.release();
    await pgPool.end();
  }
}

// Run immediately
syncPedagogicalSituationOnly();