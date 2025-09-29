const oracledb = require('oracledb');
const { Pool } = require('pg');
const winston = require('winston');
require('dotenv').config();

// Force thick mode for older Oracle versions
oracledb.initOracleClient();

// Configure logger for manual execution
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
      filename: 'sync.log',
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

// Oracle query to get element pedagogi data with proper hierarchy
const ELEMENT_PEDAGOGI_QUERY = `
SELECT 
  e.COD_ELP, 
  e.COD_CMP, 
  e.COD_NEL, 
  e.COD_PEL, 
  e.LIB_ELP, 
  e.LIC_ELP, 
  fix_encoding(e.LIB_ELP_ARB) AS LIB_ELP_ARB
FROM ELEMENT_PEDAGOGI e 
WHERE e.COD_CMP = 'FJP'
ORDER BY e.COD_PEL, e.COD_NEL, e.COD_ELP
`;

// Query to get element hierarchy
const ELEMENT_HIERARCHY_QUERY = `
SELECT 
  COD_ELP_PERE,
  COD_ELP_FILS
FROM ELP_REGROUPE_ELP 
WHERE COD_ELP_PERE LIKE 'JL%' OR COD_ELP_PERE LIKE 'JF%'
ORDER BY COD_ELP_PERE, COD_ELP_FILS
`;

// Updated grades query to get current year grades from RESULTAT_EPR
const GRADES_QUERY = `
SELECT 
  i.COD_ETU, 
  r.COD_ANU, 
  r.COD_SES, 
  r.COD_EPR, 
  r.NOT_EPR, 
  r.COD_TRE
FROM RESULTAT_EPR r
JOIN INDIVIDU i ON r.COD_IND = i.COD_IND
JOIN INS_ADM_ETP iae ON r.COD_IND = iae.COD_IND AND r.COD_ANU = iae.COD_ANU
WHERE r.COD_ADM = 1 
  AND r.COD_ANU IN (2023, 2024, 2025)
  AND iae.COD_CMP = 'FJP'
  AND iae.ETA_IAE = 'E'
  AND iae.TEM_IAE_PRM = 'O'
ORDER BY r.COD_ANU DESC, i.COD_ETU, r.COD_SES, r.COD_EPR
`;

// Query for official documents/transcripts from RESULTAT_ELP (current year only)
const OFFICIAL_DOCUMENTS_QUERY = `
SELECT 
  i.COD_ETU, 
  r.COD_ANU, 
  r.COD_SES, 
  r.COD_ELP, 
  r.NOT_ELP, 
  r.COD_TRE
FROM RESULTAT_ELP r
JOIN INDIVIDU i ON r.COD_IND = i.COD_IND
JOIN INS_ADM_ETP iae ON r.COD_IND = iae.COD_IND AND r.COD_ANU = iae.COD_ANU
WHERE r.COD_ADM = 1 
  AND r.COD_ANU IN (2023, 2024, 2025)  -- Changed from just 2024 to include both years
  AND iae.COD_CMP = 'FJP'
  AND iae.ETA_IAE = 'E'
  AND iae.TEM_IAE_PRM = 'O'
ORDER BY i.COD_ETU, r.COD_ANU DESC, r.COD_SES, r.COD_ELP
`;

const ORACLE_QUERY = `
SELECT DISTINCT
  ind.COD_ETU,
  ind.LIB_NOM_PAT_IND,
  ind.LIB_PR1_IND,
  i.COD_ETP,
  i.COD_ANU,
  i.COD_VRS_VET,
  i.COD_DIP,
  i.COD_UTI,
  i.DAT_CRE_IAE,
  i.NBR_INS_CYC,
  i.NBR_INS_ETP,
  i.NBR_INS_DIP,
  i.TEM_DIP_IAE,
  ind.COD_PAY_NAT,
  ind.COD_ETB,
  ind.COD_NNE_IND,
  ind.DAT_CRE_IND,
  ind.DAT_MOD_IND,
  ind.DATE_NAI_IND,
  ind.DAA_ENT_ETB,
  ind.LIB_NOM_PAT_IND,
  ind.LIB_NOM_USU_IND,
  ind.LIB_PR1_IND,
  ind.LIB_PR2_IND,
  ind.LIB_PR3_IND,
  ind.COD_ETU,
  ind.COD_SEX_ETU,
  ind.LIB_VIL_NAI_ETU,
  ind.COD_DEP_PAY_NAI,
  ind.DAA_ENS_SUP,
  ind.DAA_ETB,
  ind.LIB_NOM_IND_ARB,
  ind.LIB_PRN_IND_ARB,
  ind.CIN_IND,
  ind.LIB_VIL_NAI_ETU_ARB,
  e.LIB_ETP,
  e.LIC_ETP
FROM INS_ADM_ETP i
JOIN INDIVIDU ind ON i.COD_IND = ind.COD_IND
JOIN ETAPE e ON i.COD_ETP = e.COD_ETP
WHERE i.ETA_IAE = 'E'
  AND i.COD_ANU IN (2020, 2021, 2022, 2023, 2024, 2025)
  AND i.COD_CMP = 'FJP'
  AND i.TEM_IAE_PRM = 'O'
  AND i.NBR_INS_CYC = 1  -- ADDED: Only new registrations (first cycle)
ORDER BY i.COD_ANU DESC, i.DAT_CRE_IAE DESC, ind.COD_ETU
`;


// Add this new query to sync-service.js
const ADMINISTRATIVE_SITUATION_QUERY = `
SELECT DISTINCT 
    i.COD_ETU,
    iae.COD_ANU,
    iae.COD_ETP,
    e.LIB_ETP,
    e.LIC_ETP,
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
JOIN ETAPE e ON iae.COD_ETP = e.COD_ETP
LEFT JOIN DIPLOME d ON iae.COD_DIP = d.COD_DIP
WHERE iae.COD_CMP = 'FJP'
  AND iae.COD_ANU IN (2020, 2021, 2022, 2023, 2024, 2025)
ORDER BY i.COD_ETU, iae.COD_ANU DESC
`;

// Add this sync function to sync-service.js
async function syncAdministrativeSituation(oracleConnection, pgClient) {
  logger.info('Syncing administrative situation data...');
  
  // Create table
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_etu, cod_anu, cod_etp)
    )
  `);
  
  // Add indexes
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_situation_cod_etu ON administrative_situation(cod_etu);
    CREATE INDEX IF NOT EXISTS idx_admin_situation_cod_anu ON administrative_situation(cod_anu);
    CREATE INDEX IF NOT EXISTS idx_admin_situation_eta_iae ON administrative_situation(eta_iae);
  `);
  
  // Fetch data from Oracle
  const result = await oracleConnection.execute(ADMINISTRATIVE_SITUATION_QUERY);
  const adminSituations = result.rows;
  
  logger.info(`✓ Fetched ${adminSituations.length} administrative situation records from Oracle`);
  
  if (adminSituations.length === 0) {
    logger.warn('No administrative situation data found');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  
  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < adminSituations.length; i += batchSize) {
    const batch = adminSituations.slice(i, i + batchSize);
    
    for (const situation of batch) {
      const [cod_etu, cod_anu, cod_etp, lib_etp, lic_etp, cod_vrs_vet, eta_iae, 
             tem_iae_prm, dat_cre_iae, dat_mod_iae, nbr_ins_cyc, nbr_ins_etp, 
             nbr_ins_dip, tem_dip_iae, cod_uti, lib_dip] = situation;
      
      // Check if record exists
      const existingRecord = await pgClient.query(
        'SELECT id FROM administrative_situation WHERE cod_etu = $1 AND cod_anu = $2 AND cod_etp = $3', 
        [cod_etu, cod_anu, cod_etp]
      );
      
      const isUpdate = existingRecord.rows.length > 0;
      
      // Upsert record
      await pgClient.query(`
        INSERT INTO administrative_situation (
          cod_etu, cod_anu, cod_etp, lib_etp, lic_etp, cod_vrs_vet, eta_iae,
          tem_iae_prm, dat_cre_iae, dat_mod_iae, nbr_ins_cyc, nbr_ins_etp,
          nbr_ins_dip, tem_dip_iae, cod_uti, lib_dip, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP
        )
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
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [cod_etu, cod_anu, cod_etp, lib_etp, lic_etp, cod_vrs_vet, eta_iae,
          tem_iae_prm, dat_cre_iae, dat_mod_iae, nbr_ins_cyc, nbr_ins_etp,
          nbr_ins_dip, tem_dip_iae, cod_uti, lib_dip]);
      
      if (isUpdate) {
        updatedCount++;
      } else {
        insertedCount++;
      }
      
      processedCount++;
    }
    
    const progress = Math.round((i + batch.length) / adminSituations.length * 100);
    logger.info(`Administrative Situation Progress: ${progress}% (${processedCount}/${adminSituations.length})`);
  }
  
  await pgClient.query('COMMIT');
  
  // Log success
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
    VALUES ('administrative_situation', $1, 'success', $2)
  `, [processedCount, `Total: ${processedCount}, New: ${insertedCount}, Updated: ${updatedCount}`]);
  
  logger.info(`✓ Administrative situation sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated`);
}


// Also add a separate query for all students (including returning students)
const ORACLE_QUERY_ALL_STUDENTS = `
SELECT DISTINCT
  ind.COD_ETU,
  ind.LIB_NOM_PAT_IND,
  ind.LIB_PR1_IND,
  i.COD_ETP,
  i.COD_ANU,
  i.COD_VRS_VET,
  i.COD_DIP,
  i.COD_UTI,
  i.DAT_CRE_IAE,
  i.NBR_INS_CYC,
  i.NBR_INS_ETP,
  i.NBR_INS_DIP,
  i.TEM_DIP_IAE,
  ind.COD_PAY_NAT,
  ind.COD_ETB,
  ind.COD_NNE_IND,
  ind.DAT_CRE_IND,
  ind.DAT_MOD_IND,
  ind.DATE_NAI_IND,
  ind.DAA_ENT_ETB,
  ind.LIB_NOM_PAT_IND,
  ind.LIB_NOM_USU_IND,
  ind.LIB_PR1_IND,
  ind.LIB_PR2_IND,
  ind.LIB_PR3_IND,
  ind.COD_ETU,
  ind.COD_SEX_ETU,
  ind.LIB_VIL_NAI_ETU,
  ind.COD_DEP_PAY_NAI,
  ind.DAA_ENS_SUP,
  ind.DAA_ETB,
  ind.LIB_NOM_IND_ARB,
  ind.LIB_PRN_IND_ARB,
  ind.CIN_IND,
  ind.LIB_VIL_NAI_ETU_ARB,
  e.LIB_ETP,
  e.LIC_ETP
FROM INS_ADM_ETP i
JOIN INDIVIDU ind ON i.COD_IND = ind.COD_IND
JOIN ETAPE e ON i.COD_ETP = e.COD_ETP
WHERE i.ETA_IAE = 'E'
  AND i.COD_ANU IN (2023, 2024, 2025)
  AND i.COD_CMP = 'FJP'
  AND i.TEM_IAE_PRM = 'O'
ORDER BY i.COD_ANU DESC, ind.COD_ETU
`;

async function syncStudents() {
  let oracleConnection;
  let pgClient;
  const startTime = Date.now();
  
  try {
    logger.info('=====================================');
    logger.info('Starting manual sync process...');
    logger.info('🔄 Syncing data for years 2023 and 2024');
    logger.info('=====================================');
    
    // Test PostgreSQL connection first
    logger.info('Testing PostgreSQL connection...');
    pgClient = await pgPool.connect();
    await pgClient.query('SELECT 1');
    logger.info('✓ PostgreSQL connection successful');
    
    // Test Oracle connection
    logger.info('Testing Oracle connection...');
    oracleConnection = await oracledb.getConnection(oracleConfig);
    logger.info('✓ Oracle connection successful');
    
    // Sync element pedagogi first
    await syncElementPedagogi(oracleConnection, pgClient);
    
    // Sync element hierarchy
    await syncElementHierarchy(oracleConnection, pgClient);
    
    // Sync students
    await syncStudentsData(oracleConnection, pgClient);
    
    // Sync grades
    await syncGradesData(oracleConnection, pgClient);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logger.info('=====================================');
    logger.info('✓ COMPLETE SYNC FINISHED!');
    logger.info(`✓ Duration: ${duration} seconds`);
    logger.info('✓ Data available for 2023 and 2024');
    logger.info('=====================================');
    
  } catch (error) {
    logger.error('=====================================');
    logger.error('✗ SYNC FAILED!');
    logger.error(`✗ Error: ${error.message}`);
    logger.error('=====================================');
    
    if (pgClient) {
      await pgClient.query('ROLLBACK');
    }
    
    throw error;
  } finally {
    if (oracleConnection) {
      await oracleConnection.close();
    }
    if (pgClient) {
      pgClient.release();
    }
  }
}

async function syncElementPedagogi(oracleConnection, pgClient) {
  logger.info('Syncing element pedagogi data...');
  
  // Create table if not exists
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS element_pedagogi (
      id SERIAL PRIMARY KEY,
      cod_elp VARCHAR(20) UNIQUE NOT NULL,
      cod_cmp VARCHAR(20),
      cod_nel VARCHAR(20),
      cod_pel VARCHAR(20),
      lib_elp VARCHAR(200),
      lic_elp VARCHAR(200),
      lib_elp_arb VARCHAR(200),
      element_type VARCHAR(10), -- 'SEMESTRE', 'MODULE', 'MATIERE', 'ANNEE'
      semester_number INTEGER, -- 1,2,3,4,5,6 for semesters
      year_level INTEGER, -- 1,2,3,4,5 for academic years
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pgClient.query(`
  ALTER TABLE element_pedagogi 
  ADD COLUMN IF NOT EXISTS year_level INTEGER; -- 1,2,3,4,5 for academic years
`);
  
  // Add indexes for better performance
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_element_pedagogi_year_level 
    ON element_pedagogi(year_level);
    
    CREATE INDEX IF NOT EXISTS idx_element_pedagogi_element_type 
    ON element_pedagogi(element_type);
    
    CREATE INDEX IF NOT EXISTS idx_element_pedagogi_semester_number 
    ON element_pedagogi(semester_number);
  `);
  
  // Fetch data from Oracle
  const result = await oracleConnection.execute(ELEMENT_PEDAGOGI_QUERY);
  const elements = result.rows;
  
  logger.info(`✓ Fetched ${elements.length} elements from Oracle`);
  
  if (elements.length === 0) {
    logger.warn('No elements found in Oracle database');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  let yearlyElementsCount = 0;
  let semesterElementsCount = 0;
  
  // Process elements in batches
  const batchSize = 100;
  for (let i = 0; i < elements.length; i += batchSize) {
    const batch = elements.slice(i, i + batchSize);
    
    for (const element of batch) {
      const [cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb] = element;
      
      let elementType = 'MATIERE'; // default
      let semesterNumber = null;
      let yearLevel = null;
      
      // Prepare text for analysis
      const libElpLower = (lib_elp || '').toLowerCase();
      const codElpUpper = (cod_elp || '').toUpperCase();
      
      // STEP 1: First check for yearly elements patterns (highest priority)
      if (libElpLower.includes('premiere année') || libElpLower.includes('1ère année') || 
          libElpLower.includes('première année') || codElpUpper.includes('1A') || 
          codElpUpper.includes('0A1') || libElpLower.includes('first year')) {
        elementType = 'ANNEE';
        semesterNumber = null;
        yearLevel = 1;
        yearlyElementsCount++;
      } else if (libElpLower.includes('deuxième année') || libElpLower.includes('2ème année') || 
                 libElpLower.includes('second year') || codElpUpper.includes('2A') || 
                 codElpUpper.includes('0A2')) {
        elementType = 'ANNEE';
        semesterNumber = null;
        yearLevel = 2;
        yearlyElementsCount++;
      } else if (libElpLower.includes('troisième année') || libElpLower.includes('3ème année') || 
                 libElpLower.includes('third year') || codElpUpper.includes('3A') || 
                 codElpUpper.includes('0A3')) {
        elementType = 'ANNEE';
        semesterNumber = null;
        yearLevel = 3;
        yearlyElementsCount++;
      } else if (libElpLower.includes('quatrième année') || libElpLower.includes('4ème année') || 
                 libElpLower.includes('fourth year') || codElpUpper.includes('4A') || 
                 codElpUpper.includes('0A4')) {
        elementType = 'ANNEE';
        semesterNumber = null;
        yearLevel = 4;
        yearlyElementsCount++;
      } else if (libElpLower.includes('cinquième année') || libElpLower.includes('5ème année') || 
                 libElpLower.includes('fifth year') || codElpUpper.includes('5A') || 
                 codElpUpper.includes('0A5')) {
        elementType = 'ANNEE';
        semesterNumber = null;
        yearLevel = 5;
        yearlyElementsCount++;
      }
      // STEP 2: If not yearly, check for semester patterns
      else if (cod_nel && (cod_nel.startsWith('S') || cod_nel.includes('SM'))) {
        elementType = 'SEMESTRE';
        const semMatch = (cod_nel || '').match(/S?(\d+)/);
        if (semMatch) {
          semesterNumber = parseInt(semMatch[1]);
        }
        semesterElementsCount++;
      } else if (cod_pel && (cod_pel.startsWith('S') || cod_pel.includes('SM'))) {
        elementType = 'SEMESTRE';
        const semMatch = (cod_pel || '').match(/S?(\d+)/);
        if (semMatch) {
          semesterNumber = parseInt(semMatch[1]);
        }
        semesterElementsCount++;
      }
      // STEP 3: Check for module patterns
      else if (cod_nel && cod_nel === 'MOD') {
        elementType = 'MODULE';
      }
      // STEP 4: If still no classification, try to infer from COD_ELP patterns
      else {
        const semesterMatch = (cod_elp || '').match(/S(\d+)/);
        if (semesterMatch) {
          semesterNumber = parseInt(semesterMatch[1]);
          elementType = 'SEMESTRE';
          semesterElementsCount++;
        }
      }
      
      // Check if element exists
      const existingElement = await pgClient.query(
        'SELECT id FROM element_pedagogi WHERE cod_elp = $1', 
        [cod_elp]
      );
      
      const isUpdate = existingElement.rows.length > 0;
      
      // Upsert element with new year_level field
      await pgClient.query(`
        INSERT INTO element_pedagogi (
          cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb, 
          element_type, semester_number, year_level, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP
        )
        ON CONFLICT (cod_elp) DO UPDATE SET
          cod_cmp = EXCLUDED.cod_cmp,
          cod_nel = EXCLUDED.cod_nel,
          cod_pel = EXCLUDED.cod_pel,
          lib_elp = EXCLUDED.lib_elp,
          lic_elp = EXCLUDED.lic_elp,
          lib_elp_arb = EXCLUDED.lib_elp_arb,
          element_type = EXCLUDED.element_type,
          semester_number = EXCLUDED.semester_number,
          year_level = EXCLUDED.year_level,
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb, elementType, semesterNumber, yearLevel]);
      
      if (isUpdate) {
        updatedCount++;
      } else {
        insertedCount++;
      }
      
      processedCount++;
    }
    
    const progress = Math.round((i + batch.length) / elements.length * 100);
    logger.info(`Elements Progress: ${progress}% (${processedCount}/${elements.length})`);
  }
  
  await pgClient.query('COMMIT');
  
  // Log sync success with detailed breakdown
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
    VALUES ('element_pedagogi', $1, 'success', $2)
  `, [processedCount, `Yearly elements: ${yearlyElementsCount}, Semester elements: ${semesterElementsCount}, Total: ${processedCount}, New: ${insertedCount}, Updated: ${updatedCount}`]);
  
  logger.info(`✓ Element pedagogi sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated`);
  logger.info(`📊 Classification: ${yearlyElementsCount} yearly elements, ${semesterElementsCount} semester elements`);
}

async function syncElementHierarchy(oracleConnection, pgClient) {
  logger.info('Syncing element hierarchy...');
  
  // Create hierarchy table
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS element_hierarchy (
      id SERIAL PRIMARY KEY,
      cod_elp_pere VARCHAR(20) NOT NULL,
      cod_elp_fils VARCHAR(20) NOT NULL,
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_elp_pere, cod_elp_fils)
    )
  `);
  
  // Fetch hierarchy from Oracle
  const result = await oracleConnection.execute(ELEMENT_HIERARCHY_QUERY);
  const hierarchies = result.rows;
  
  logger.info(`✓ Fetched ${hierarchies.length} hierarchy relationships from Oracle`);
  
  if (hierarchies.length === 0) {
    logger.warn('No hierarchy found in Oracle database');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  
  for (const hierarchy of hierarchies) {
    const [cod_elp_pere, cod_elp_fils] = hierarchy;
    
    // Upsert hierarchy
    await pgClient.query(`
      INSERT INTO element_hierarchy (cod_elp_pere, cod_elp_fils, last_sync)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (cod_elp_pere, cod_elp_fils) DO UPDATE SET
        last_sync = CURRENT_TIMESTAMP
    `, [cod_elp_pere, cod_elp_fils]);
    
    processedCount++;
  }
  
  await pgClient.query('COMMIT');
  
  logger.info(`✓ Element hierarchy sync completed: ${processedCount} relationships`);
}

// Update the syncStudentsData function to handle both new and all students
async function syncStudentsData(oracleConnection, pgClient) {
  logger.info('Syncing students data for 2023 and 2024...');
  logger.info('This will include both new registrations (NBR_INS_CYC=1) and returning students');
  
  // Use the query that includes all students, not just new registrations
  // The admin interface will filter for new registrations as needed
  const result = await oracleConnection.execute(ORACLE_QUERY_ALL_STUDENTS);
  const students = result.rows;
  
  logger.info(`✓ Fetched ${students.length} students from Oracle (2023 & 2024)`);
  
  // Count new registrations for logging
  const newRegistrationsResult = await oracleConnection.execute(ORACLE_QUERY);
  const newRegistrationsCount = newRegistrationsResult.rows.length;
  
  logger.info(`📊 New registrations (NBR_INS_CYC=1): ${newRegistrationsCount} students`);
  logger.info(`📊 Total students (all): ${students.length} students`);
  
  if (students.length === 0) {
    logger.warn('No students found in Oracle database');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  let newRegistrationsProcessed = 0;
  
  // Process students in batches for better performance
  const batchSize = 100;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    
    for (const student of batch) {
      const [
        cod_etu, lib_nom_pat_ind, lib_pr1_ind, cod_etp, cod_anu,
        cod_vrs_vet, cod_dip, cod_uti, dat_cre_iae, nbr_ins_cyc,
        nbr_ins_etp, nbr_ins_dip, tem_dip_iae, cod_pay_nat, cod_etb,
        cod_nne_ind, dat_cre_ind, dat_mod_ind, date_nai_ind, daa_ent_etb,
        lib_nom_pat_ind_2, lib_nom_usu_ind, lib_pr1_ind_2, lib_pr2_ind, lib_pr3_ind,
        cod_etu_2, cod_sex_etu, lib_vil_nai_etu, cod_dep_pay_nai, daa_ens_sup,
        daa_etb, lib_nom_ind_arb, lib_prn_ind_arb, cin_ind, lib_vil_nai_etu_arb,
        lib_etp, lic_etp
      ] = student;
      
      // Count new registrations
      if (nbr_ins_cyc === 1) {
        newRegistrationsProcessed++;
      }
      
      // Check if student exists
      const existingStudent = await pgClient.query(
        'SELECT id FROM students WHERE cod_etu = $1', 
        [cod_etu]
      );
      
      const isUpdate = existingStudent.rows.length > 0;
      
      // Upsert student (same logic as before)
      await pgClient.query(`
        INSERT INTO students (
          cod_etu, lib_nom_pat_ind, lib_pr1_ind, cod_etp, cod_anu,
          cod_vrs_vet, cod_dip, cod_uti, dat_cre_iae, nbr_ins_cyc,
          nbr_ins_etp, nbr_ins_dip, tem_dip_iae, cod_pay_nat, cod_etb,
          cod_nne_ind, dat_cre_ind, dat_mod_ind, date_nai_ind, daa_ent_etb,
          lib_nom_usu_ind, lib_pr2_ind, lib_pr3_ind, cod_sex_etu, lib_vil_nai_etu,
          cod_dep_pay_nai, daa_ens_sup, daa_etb, lib_nom_ind_arb, lib_prn_ind_arb,
          cin_ind, lib_vil_nai_etu_arb, lib_etp, lic_etp, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, CURRENT_TIMESTAMP
        )
        ON CONFLICT (cod_etu, cod_anu) DO UPDATE SET

          lib_nom_pat_ind = EXCLUDED.lib_nom_pat_ind,
          lib_pr1_ind = EXCLUDED.lib_pr1_ind,
          cod_etp = EXCLUDED.cod_etp,
          cod_anu = EXCLUDED.cod_anu,
          cod_vrs_vet = EXCLUDED.cod_vrs_vet,
          cod_dip = EXCLUDED.cod_dip,
          cod_uti = EXCLUDED.cod_uti,
          dat_cre_iae = EXCLUDED.dat_cre_iae,  
          nbr_ins_cyc = EXCLUDED.nbr_ins_cyc,
          nbr_ins_etp = EXCLUDED.nbr_ins_etp,
          nbr_ins_dip = EXCLUDED.nbr_ins_dip,
          tem_dip_iae = EXCLUDED.tem_dip_iae,
          cod_pay_nat = EXCLUDED.cod_pay_nat,
          cod_etb = EXCLUDED.cod_etb,
          cod_nne_ind = EXCLUDED.cod_nne_ind,
          dat_cre_ind = EXCLUDED.dat_cre_ind,
          dat_mod_ind = EXCLUDED.dat_mod_ind,
          date_nai_ind = EXCLUDED.date_nai_ind,
          daa_ent_etb = EXCLUDED.daa_ent_etb,
          lib_nom_usu_ind = EXCLUDED.lib_nom_usu_ind,
          lib_pr2_ind = EXCLUDED.lib_pr2_ind,
          lib_pr3_ind = EXCLUDED.lib_pr3_ind,
          cod_sex_etu = EXCLUDED.cod_sex_etu,
          lib_vil_nai_etu = EXCLUDED.lib_vil_nai_etu,
          cod_dep_pay_nai = EXCLUDED.cod_dep_pay_nai,
          daa_ens_sup = EXCLUDED.daa_ens_sup,
          daa_etb = EXCLUDED.daa_etb,
          lib_nom_ind_arb = EXCLUDED.lib_nom_ind_arb,
          lib_prn_ind_arb = EXCLUDED.lib_prn_ind_arb,
          cin_ind = EXCLUDED.cin_ind,
          lib_vil_nai_etu_arb = EXCLUDED.lib_vil_nai_etu_arb,
          lib_etp = EXCLUDED.lib_etp,
          lic_etp = EXCLUDED.lic_etp,
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [
        cod_etu, lib_nom_pat_ind, lib_pr1_ind, cod_etp, cod_anu,
        cod_vrs_vet, cod_dip, cod_uti, dat_cre_iae, nbr_ins_cyc,
        nbr_ins_etp, nbr_ins_dip, tem_dip_iae, cod_pay_nat, cod_etb,
        cod_nne_ind, dat_cre_ind, dat_mod_ind, date_nai_ind, daa_ent_etb,
        lib_nom_usu_ind, lib_pr2_ind, lib_pr3_ind, cod_sex_etu, lib_vil_nai_etu,
        cod_dep_pay_nai, daa_ens_sup, daa_etb, lib_nom_ind_arb, lib_prn_ind_arb,
        cin_ind, lib_vil_nai_etu_arb, lib_etp, lic_etp
      ]);
      
      if (isUpdate) {
        updatedCount++;
      } else {
        insertedCount++;
      }
      
      processedCount++;
    }
    
    // Progress indicator
    const progress = Math.round((i + batch.length) / students.length * 100);
    logger.info(`Students Progress: ${progress}% (${processedCount}/${students.length}) - New Reg: ${newRegistrationsProcessed}`);
  }
  
  await pgClient.query('COMMIT');
  
  // Log sync success with new registration info
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
    VALUES ('students', $1, 'success', $2)
  `, [processedCount, `Total: ${processedCount}, New registrations: ${newRegistrationsProcessed}, Inserted: ${insertedCount}, Updated: ${updatedCount}`]);
  
  logger.info(`✓ Students sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated`);
  logger.info(`✓ New registrations processed: ${newRegistrationsProcessed} students`);
}

// Export the new query for potential direct use
module.exports = { 
  syncStudents,
  ORACLE_QUERY_NEW_REGISTRATIONS: ORACLE_QUERY,
  ORACLE_QUERY_ALL_STUDENTS
};



async function syncGradesData(oracleConnection, pgClient) {
  logger.info('Syncing grades data from RESULTAT_EPR for 2023 and 2024...');
  
  // First, let's update the grades table to use the new column names
  await pgClient.query(`
    ALTER TABLE grades 
    ADD COLUMN IF NOT EXISTS cod_epr VARCHAR(20),
    ADD COLUMN IF NOT EXISTS not_epr DECIMAL(5,2)
  `);
  
  // Fetch grades from Oracle
  const result = await oracleConnection.execute(GRADES_QUERY);
  const grades = result.rows;
  
  logger.info(`✓ Fetched ${grades.length} grades from Oracle RESULTAT_EPR (2023 & 2024)`);
  
  if (grades.length === 0) {
    logger.warn('No grades found in Oracle RESULTAT_EPR table');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;
  
  // Track grades by year for statistics
  let grades2023 = 0;
  let grades2024 = 0;
  
  // Process grades in batches
  const batchSize = 200;
  for (let i = 0; i < grades.length; i += batchSize) {
    const batch = grades.slice(i, i + batchSize);
    
    for (const grade of batch) {
      const [cod_etu, cod_anu, cod_ses, cod_epr, not_epr, cod_tre] = grade;
      
      // Convert COD_EPR to COD_ELP format for compatibility
      let cod_elp = cod_epr;
      if (cod_epr && cod_epr.startsWith('JF') && cod_epr.startsWith('CRJF')) {
        // Remove CR prefix for JF codes
        cod_elp = cod_epr.replace(/^CR/, '');
      } else if (cod_epr && cod_epr.endsWith('CF')) {
        // Remove CF suffix for other codes
        cod_elp = cod_epr.replace(/CF$/, '');
      }
      
      // Track grades by year
      if (cod_anu === 2023) grades2023++;
      if (cod_anu === 2024) grades2024++;
      
      // Check if student exists first
      const studentExists = await pgClient.query(
        'SELECT 1 FROM students WHERE cod_etu = $1', 
        [cod_etu]
      );
      
      if (studentExists.rows.length === 0) {
        skippedCount++;
        continue;
      }
      
      // Check if grade exists
      const existingGrade = await pgClient.query(
        'SELECT id FROM grades WHERE cod_etu = $1 AND cod_elp = $2 AND cod_anu = $3 AND cod_ses = $4', 
        [cod_etu, cod_elp, cod_anu, cod_ses]
      );
      
      const isUpdate = existingGrade.rows.length > 0;
      
      // Upsert grade with both old and new column formats
      await pgClient.query(`
        INSERT INTO grades (
          cod_etu, cod_anu, cod_ses, cod_elp, cod_epr, not_elp, not_epr, cod_tre, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP
        )
        ON CONFLICT (cod_etu, cod_elp, cod_anu, cod_ses) DO UPDATE SET
          cod_epr = EXCLUDED.cod_epr,
          not_elp = EXCLUDED.not_epr,
          not_epr = EXCLUDED.not_epr,
          cod_tre = EXCLUDED.cod_tre,
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [cod_etu, cod_anu, cod_ses, cod_elp, cod_epr, not_epr, not_epr, cod_tre]);
      
      if (isUpdate) {
        updatedCount++;
      } else {
        insertedCount++;
      }
      
      processedCount++;
    }
    
    // Progress indicator
    const progress = Math.round((i + batch.length) / grades.length * 100);
    logger.info(`Grades Progress: ${progress}% (${processedCount}/${grades.length}) - Skipped: ${skippedCount}`);
  }
  
  await pgClient.query('COMMIT');
  
  // Log sync success
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status)
    VALUES ('grades_epr', $1, 'success')
  `, [processedCount]);
  
  logger.info(`✓ Grades sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
  logger.info(`📊 Year breakdown: 2023 (${grades2023} grades), 2024 (${grades2024} grades)`);
  
  if (skippedCount > 0) {
    logger.warn(`⚠️  ${skippedCount} grades skipped due to missing student records`);
  }
}


// Replace the existing syncOfficialDocuments function in sync-service.js

async function syncOfficialDocuments(oracleConnection, pgClient) {
  logger.info('Syncing official documents data from RESULTAT_ELP for 2023 and 2024...');
  
  // Create official_documents table with additional fields for better specialization tracking
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS official_documents (
      id SERIAL PRIMARY KEY,
      cod_etu VARCHAR(20) NOT NULL,
      cod_anu INTEGER,
      cod_ses VARCHAR(20),
      cod_elp VARCHAR(20),
      not_elp DECIMAL(5,2),
      cod_tre VARCHAR(20),
      -- Add fields to track specialization info
      cod_etp VARCHAR(20),
      lib_etp VARCHAR(200),
      lic_etp VARCHAR(200),
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_etu, cod_elp, cod_anu, cod_ses)
    )
  `);
  
  // Add columns if they don't exist (for existing installations)
  await pgClient.query(`
    ALTER TABLE official_documents 
    ADD COLUMN IF NOT EXISTS cod_etp VARCHAR(20),
    ADD COLUMN IF NOT EXISTS lib_etp VARCHAR(200),
    ADD COLUMN IF NOT EXISTS lic_etp VARCHAR(200)
  `);
  
  // Add indexes
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_official_documents_cod_etu ON official_documents(cod_etu);
    CREATE INDEX IF NOT EXISTS idx_official_documents_cod_elp ON official_documents(cod_elp);
    CREATE INDEX IF NOT EXISTS idx_official_documents_cod_anu ON official_documents(cod_anu);
    CREATE INDEX IF NOT EXISTS idx_official_documents_cod_ses ON official_documents(cod_ses);
    CREATE INDEX IF NOT EXISTS idx_official_documents_cod_etp ON official_documents(cod_etp);
  `);
  
  // Updated query to include specialization information from the enrollment data
  const OFFICIAL_DOCUMENTS_WITH_SPECIALIZATION_QUERY = `
    SELECT 
      i.COD_ETU, 
      r.COD_ANU, 
      r.COD_SES, 
      r.COD_ELP, 
      r.NOT_ELP, 
      r.COD_TRE,
      -- Get specialization info from the enrollment for this specific year
      iae.COD_ETP,
      e.LIB_ETP,
      e.LIC_ETP
    FROM RESULTAT_ELP r
    JOIN INDIVIDU i ON r.COD_IND = i.COD_IND
    JOIN INS_ADM_ETP iae ON r.COD_IND = iae.COD_IND AND r.COD_ANU = iae.COD_ANU
    LEFT JOIN ETAPE e ON iae.COD_ETP = e.COD_ETP
    WHERE r.COD_ADM = 1 
      AND r.COD_ANU IN (2023, 2024, 2025)
      AND iae.COD_CMP = 'FJP'
      AND iae.ETA_IAE = 'E'
      AND iae.TEM_IAE_PRM = 'O'
    ORDER BY i.COD_ETU, r.COD_ANU DESC, r.COD_SES, r.COD_ELP
  `;
  
  // Fetch official documents from Oracle with specialization info
  const result = await oracleConnection.execute(OFFICIAL_DOCUMENTS_WITH_SPECIALIZATION_QUERY);
  const documents = result.rows;
  
  logger.info(`✓ Fetched ${documents.length} official document records from Oracle RESULTAT_ELP with specialization info (2023 & 2024)`);
  
  if (documents.length === 0) {
    logger.warn('No official documents found in Oracle RESULTAT_ELP table');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;
  
  // Track specializations found
  let specializationsFound = new Set();
  
  // Process documents in batches
  const batchSize = 200;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    
    for (const document of batch) {
      const [cod_etu, cod_anu, cod_ses, cod_elp, not_elp, cod_tre, cod_etp, lib_etp, lic_etp] = document;
      
      // Track specializations for logging
      if (lib_etp) {
        specializationsFound.add(lib_etp);
      }
      
      // Check if student exists first
      const studentExists = await pgClient.query(
        'SELECT 1 FROM students WHERE cod_etu = $1', 
        [cod_etu]
      );
      
      if (studentExists.rows.length === 0) {
        skippedCount++;
        continue;
      }
      
      // Check if document exists
      const existingDocument = await pgClient.query(
        'SELECT id FROM official_documents WHERE cod_etu = $1 AND cod_elp = $2 AND cod_anu = $3 AND cod_ses = $4', 
        [cod_etu, cod_elp, cod_anu, cod_ses]
      );
      
      const isUpdate = existingDocument.rows.length > 0;
      
      // Upsert official document with specialization info
      await pgClient.query(`
        INSERT INTO official_documents (
          cod_etu, cod_anu, cod_ses, cod_elp, not_elp, cod_tre, 
          cod_etp, lib_etp, lic_etp, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
        )
        ON CONFLICT (cod_etu, cod_elp, cod_anu, cod_ses) DO UPDATE SET
          not_elp = EXCLUDED.not_elp,
          cod_tre = EXCLUDED.cod_tre,
          cod_etp = EXCLUDED.cod_etp,
          lib_etp = EXCLUDED.lib_etp,
          lic_etp = EXCLUDED.lic_etp,
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [cod_etu, cod_anu, cod_ses, cod_elp, not_elp, cod_tre, cod_etp, lib_etp, lic_etp]);
      
      if (isUpdate) {
        updatedCount++;
      } else {
        insertedCount++;
      }
      
      processedCount++;
    }
    
    // Progress indicator
    const progress = Math.round((i + batch.length) / documents.length * 100);
    logger.info(`Official Documents Progress: ${progress}% (${processedCount}/${documents.length}) - Skipped: ${skippedCount}`);
  }
  
  await pgClient.query('COMMIT');
  
  // Log sync success with specialization info
  const specializationsList = Array.from(specializationsFound).sort();
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
    VALUES ('official_documents', $1, 'success', $2)
  `, [processedCount, `Total: ${processedCount}, Specializations found: ${specializationsList.length} (${specializationsList.slice(0, 5).join(', ')}${specializationsList.length > 5 ? '...' : ''})`]);
  
  logger.info(`✓ Official documents sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
  logger.info(`📚 Specializations found: ${specializationsList.length} different specializations`);
  if (specializationsList.length > 0) {

    logger.info(`📚 Sample specializations: ${specializationsList.slice(0, 3).join(', ')}`);
  }
}


// Manual sync execution
if (require.main === module) {
  console.log('Starting manual sync for 2023 and 2024...');
  syncStudents()
    .then(() => {
      console.log('Manual sync completed. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Manual sync failed:', error);
      process.exit(1);
    });
}


// Oracle query for pedagogical situation
const PEDAGOGICAL_SITUATION_QUERY = `
SELECT DISTINCT 
    COD_ETU AS APOGEE,
    LIB_NOM_PAT_IND AS NOM,
    LIB_PR1_IND AS PRENOM,
    DAA_UNI_CON AS DATE_UNI_CON,
    COD_ELP,
    fix_encoding(LIB_ELP) AS MODULE,
    MAX(ETA_IAE) OVER (
        PARTITION BY COD_IND, COD_ANU, COD_ETP, COD_VRS_VET
    ) AS IA
FROM IND_CONTRAT_ELP
    JOIN INDIVIDU USING (COD_IND)
    JOIN ELEMENT_PEDAGOGI USING (COD_ELP)
    LEFT JOIN INS_ADM_ETP USING (COD_IND, COD_ANU, COD_ETP, COD_VRS_VET)
WHERE TEM_PRC_ICE = 'N'
  AND COD_CIP = 'FJP'
ORDER BY COD_ETU, COD_ELP
`;

// Replace the existing syncPedagogicalSituation function in sync-service.js with this:

async function syncPedagogicalSituation(oracleConnection, pgClient) {
  logger.info('Syncing pedagogical situation data...');
  
  // Create table if not exists with additional fields for better classification
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS pedagogical_situation (
      id SERIAL PRIMARY KEY,
      cod_etu VARCHAR(20) NOT NULL,
      lib_nom_pat_ind VARCHAR(100),
      lib_pr1_ind VARCHAR(100),
      daa_uni_con INTEGER,
      cod_elp VARCHAR(20) NOT NULL,
      lib_elp VARCHAR(200),
      eta_iae VARCHAR(10),
      academic_level VARCHAR(20), -- NEW: '1A', '2A', '3A', etc. for yearly elements
      is_yearly_element BOOLEAN DEFAULT FALSE, -- NEW: indicates if this is a yearly vs semester element
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_etu, cod_elp, daa_uni_con)
    )
  `);
  
  // Fetch data from Oracle
  const result = await oracleConnection.execute(PEDAGOGICAL_SITUATION_QUERY);
  const pedSituations = result.rows;
  
  logger.info(`✓ Fetched ${pedSituations.length} pedagogical situation records from Oracle`);
  
  if (pedSituations.length === 0) {
    logger.warn('No pedagogical situation data found in Oracle database');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;
  let yearlyElementsCount = 0;
  let semesterElementsCount = 0;
  
  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < pedSituations.length; i += batchSize) {
    const batch = pedSituations.slice(i, i + batchSize);
    
    for (const situation of batch) {
      const [apogee, nom, prenom, date_uni_con, cod_elp, module, ia] = situation;
      
      try {
        // Determine if this is a yearly or semester element
        const { academicLevel, isYearlyElement } = classifyPedagogicalElement(cod_elp, module);
        
        if (isYearlyElement) {
          yearlyElementsCount++;
        } else {
          semesterElementsCount++;
        }
        
        // Check if record exists
        const existingRecord = await pgClient.query(
          'SELECT id FROM pedagogical_situation WHERE cod_etu = $1 AND cod_elp = $2 AND daa_uni_con = $3', 
          [apogee, cod_elp, date_uni_con]
        );
        
        const isUpdate = existingRecord.rows.length > 0;
        
        // Upsert pedagogical situation
        await pgClient.query(`
          INSERT INTO pedagogical_situation (
            cod_etu, lib_nom_pat_ind, lib_pr1_ind, daa_uni_con, 
            cod_elp, lib_elp, eta_iae, academic_level, is_yearly_element, last_sync
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
          )
          ON CONFLICT (cod_etu, cod_elp, daa_uni_con) DO UPDATE SET
            lib_nom_pat_ind = EXCLUDED.lib_nom_pat_ind,
            lib_pr1_ind = EXCLUDED.lib_pr1_ind,
            lib_elp = EXCLUDED.lib_elp,
            eta_iae = EXCLUDED.eta_iae,
            academic_level = EXCLUDED.academic_level,
            is_yearly_element = EXCLUDED.is_yearly_element,
            last_sync = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `, [apogee, nom, prenom, date_uni_con, cod_elp, module, ia, academicLevel, isYearlyElement]);
        
        if (isUpdate) {
          updatedCount++;
        } else {
          insertedCount++;
        }
        
        processedCount++;
      } catch (error) {
        logger.warn(`Skipping record for ${apogee}/${cod_elp}: ${error.message}`);
        skippedCount++;
      }
    }
    
    // Progress indicator
    const progress = Math.round((i + batch.length) / pedSituations.length * 100);
    logger.info(`Pedagogical Situation Progress: ${progress}% (${processedCount}/${pedSituations.length})`);
  }
  
  await pgClient.query('COMMIT');
  
  // Log sync success
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status, error_message)
    VALUES ('pedagogical_situation', $1, 'success', $2)
  `, [processedCount, `Yearly elements: ${yearlyElementsCount}, Semester elements: ${semesterElementsCount}`]);
  
  logger.info(`✓ Pedagogical situation sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
  logger.info(`📊 Classification: ${yearlyElementsCount} yearly elements, ${semesterElementsCount} semester elements`);
}

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

// Update the main syncStudents function to include pedagogical situation
async function syncStudents() {
  let oracleConnection;
  let pgClient;
  const startTime = Date.now();
  
  try {
    logger.info('=====================================');
    logger.info('Starting manual sync process...');
    logger.info('🔄 Syncing data for years 2023 and 2024');
    logger.info('=====================================');
    
    // Test PostgreSQL connection first
    logger.info('Testing PostgreSQL connection...');
    pgClient = await pgPool.connect();
    await pgClient.query('SELECT 1');
    logger.info('✓ PostgreSQL connection successful');
    
    // Test Oracle connection
    logger.info('Testing Oracle connection...');
    oracleConnection = await oracledb.getConnection(oracleConfig);
    logger.info('✓ Oracle connection successful');
    
    // Sync element pedagogi first
    await syncElementPedagogi(oracleConnection, pgClient);
    
    // Sync element hierarchy
    await syncElementHierarchy(oracleConnection, pgClient);
    
    // Sync students
    await syncStudentsData(oracleConnection, pgClient);
    
    // Sync grades
    await syncGradesData(oracleConnection, pgClient);
    await syncOfficialDocuments(oracleConnection, pgClient);


    // NEW: Sync pedagogical situation
    await syncPedagogicalSituation(oracleConnection, pgClient);
    await syncAdministrativeSituation(oracleConnection, pgClient);
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logger.info('=====================================');
    logger.info('✓ COMPLETE SYNC FINISHED!');
    logger.info(`✓ Duration: ${duration} seconds`);
    logger.info('✓ Data available for 2023 and 2024');
    logger.info('✓ Pedagogical situation data synced');
    logger.info('=====================================');
    
  } catch (error) {
    logger.error('=====================================');
    logger.error('✗ SYNC FAILED!');
    logger.error(`✗ Error: ${error.message}`);
    logger.error('=====================================');
    
    if (pgClient) {
      await pgClient.query('ROLLBACK');
    }
    
    throw error;
  } finally {
    if (oracleConnection) {
      await oracleConnection.close();
    }
    if (pgClient) {
      pgClient.release();
    }
  }
}


module.exports = { syncStudents };