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

// Updated grades query to get all grade data
const GRADES_QUERY = `
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
  AND r.COD_ANU IN (2023, 2024)
  AND iae.COD_CMP = 'FJP'
  AND iae.ETA_IAE = 'E'
  AND iae.TEM_IAE_PRM = 'O'
ORDER BY r.COD_ANU DESC, i.COD_ETU, r.COD_SES, r.COD_ELP
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
  AND i.COD_ANU IN (2023, 2024)
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
      element_type VARCHAR(10), -- 'SEMESTRE', 'MODULE', 'MATIERE'
      semester_number INTEGER, -- 1,2,3,4,5,6
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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
  
  // Process elements in batches
  const batchSize = 100;
  for (let i = 0; i < elements.length; i += batchSize) {
    const batch = elements.slice(i, i + batchSize);
    
    for (const element of batch) {
      const [cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb] = element;
      
      let elementType = 'MATIERE'; // default
      let semesterNumber = null;
      
      // Try to determine element type and semester from COD_NEL or COD_PEL directly
      if (cod_nel && (cod_nel.startsWith('S') || cod_nel.includes('SM'))) {
        elementType = 'SEMESTRE';
        const semMatch = (cod_nel || '').match(/S?(\d+)/);
        if (semMatch) {
          semesterNumber = parseInt(semMatch[1]);
        }
      } else if (cod_pel && (cod_pel.startsWith('S') || cod_pel.includes('SM'))) { // Check cod_pel as well
        elementType = 'SEMESTRE';
        const semMatch = (cod_pel || '').match(/S?(\d+)/);
        if (semMatch) {
          semesterNumber = parseInt(semMatch[1]);
        }
      }
      else if (cod_nel && cod_nel === 'MOD') {
        elementType = 'MODULE';
      }

      // If semester number is still null, try to infer from LIB_ELP or COD_ELP patterns for annual elements
      if (semesterNumber === null) {
          const libElpLower = (lib_elp || '').toLowerCase();
          const codElpUpper = (cod_elp || '').toUpperCase();

          if (libElpLower.includes('premiere année') || libElpLower.includes('1ère année') || codElpUpper.includes('0A1')) {
              semesterNumber = 1; // Corresponds to S1
              elementType = 'SEMESTRE'; // Mark as a grouping element for a semester/year
          } else if (libElpLower.includes('deuxième année') || libElpLower.includes('2ème année') || codElpUpper.includes('0A2')) {
              semesterNumber = 3; // Corresponds to S3
              elementType = 'SEMESTRE';
          } else if (libElpLower.includes('troisième année') || libElpLower.includes('3ème année') || codElpUpper.includes('0A3')) {
              semesterNumber = 5; // Corresponds to S5
              elementType = 'SEMESTRE';
          }
          // Add more cases if you have 4th, 5th, etc., years with similar patterns
          else if (libElpLower.includes('quatrième année') || libElpLower.includes('4ème année') || codElpUpper.includes('0A4')) {
              semesterNumber = 7; // Corresponds to S7
              elementType = 'SEMESTRE';
          } else if (libElpLower.includes('cinquième année') || libElpLower.includes('5ème année') || codElpUpper.includes('0A5')) {
              semesterNumber = 9; // Corresponds to S9
              elementType = 'SEMESTRE';
          }
      }
      
      // Check if element exists
      const existingElement = await pgClient.query(
        'SELECT id FROM element_pedagogi WHERE cod_elp = $1', 
        [cod_elp]
      );
      
      const isUpdate = existingElement.rows.length > 0;
      
      // Upsert element
      await pgClient.query(`
        INSERT INTO element_pedagogi (
          cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb, 
          element_type, semester_number, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
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
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb, elementType, semesterNumber]);
      
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
  
  // Log sync success
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status)
    VALUES ('element_pedagogi', $1, 'success')
  `, [processedCount]);
  
  logger.info(`✓ Element pedagogi sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated`);
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

async function syncStudentsData(oracleConnection, pgClient) {
  logger.info('Syncing students data for 2023 and 2024...');
  
  // Fetch data from Oracle
  const result = await oracleConnection.execute(ORACLE_QUERY);
  const students = result.rows;
  
  logger.info(`✓ Fetched ${students.length} students from Oracle (2023 & 2024)`);
  
  if (students.length === 0) {
    logger.warn('No students found in Oracle database');
    return;
  }
  
  // Begin transaction
  await pgClient.query('BEGIN');
  
  let processedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  
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
      
      // Check if student exists
      const existingStudent = await pgClient.query(
        'SELECT id FROM students WHERE cod_etu = $1', 
        [cod_etu]
      );
      
      const isUpdate = existingStudent.rows.length > 0;
      
      // Upsert student
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
        ON CONFLICT (cod_etu) DO UPDATE SET
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
    logger.info(`Students Progress: ${progress}% (${processedCount}/${students.length})`);
  }
  
  await pgClient.query('COMMIT');
  
  // Log sync success
  await pgClient.query(`
    INSERT INTO sync_log (sync_type, records_processed, sync_status)
    VALUES ('students', $1, 'success')
  `, [processedCount]);
  
  logger.info(`✓ Students sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated`);
}

async function syncGradesData(oracleConnection, pgClient) {
  logger.info('Syncing grades data for 2023 and 2024...');
  
  // Fetch grades from Oracle
  const result = await oracleConnection.execute(GRADES_QUERY);
  const grades = result.rows;
  
  logger.info(`✓ Fetched ${grades.length} grades from Oracle (2023 & 2024)`);
  
  if (grades.length === 0) {
    logger.warn('No grades found in Oracle database');
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
      const [cod_etu, cod_anu, cod_ses, cod_elp, not_elp, cod_tre] = grade;
      
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
      
      // Upsert grade
      await pgClient.query(`
        INSERT INTO grades (
          cod_etu, cod_anu, cod_ses, cod_elp, not_elp, cod_tre, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
        )
        ON CONFLICT (cod_etu, cod_elp, cod_anu, cod_ses) DO UPDATE SET
          not_elp = EXCLUDED.not_elp,
          cod_tre = EXCLUDED.cod_tre,
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [cod_etu, cod_anu, cod_ses, cod_elp, not_elp, cod_tre]);
      
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
    VALUES ('grades', $1, 'success')
  `, [processedCount]);
  
  logger.info(`✓ Grades sync completed: ${processedCount} total, ${insertedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
  logger.info(`📊 Year breakdown: 2023 (${grades2023} grades), 2024 (${grades2024} grades)`);
  
  if (skippedCount > 0) {
    logger.warn(`⚠️  ${skippedCount} grades skipped due to missing student records`);
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

module.exports = { syncStudents };