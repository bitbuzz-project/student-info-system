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

// Updated Oracle query - get all needed data from ELEMENT_PEDAGOGI
const GRADES_QUERY = `
SELECT 
  i.COD_ETU, 
  r.COD_ANU, 
  r.COD_SES, 
  r.COD_ELP, 
  ep.LIB_ELP, 
  ep.COD_NEL,
  ep.COD_PEL,
  ep.LIC_ELP,
  fix_encoding(ep.LIB_ELP_ARB) as LIB_ELP_ARB,
  r.NOT_ELP, 
  r.COD_TRE
FROM RESULTAT_ELP r
JOIN INDIVIDU i ON r.COD_IND = i.COD_IND
JOIN ELEMENT_PEDAGOGI ep ON r.COD_ELP = ep.COD_ELP
JOIN INS_ADM_ETP iae ON r.COD_IND = iae.COD_IND AND r.COD_ANU = iae.COD_ANU
WHERE r.COD_ADM = 1 
  AND r.COD_ANU = 2023
  AND iae.COD_CMP = 'FJP'
  AND iae.ETA_IAE = 'E'
  AND iae.TEM_IAE_PRM = 'O'
  AND ep.COD_CMP = 'FJP'
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
  AND i.COD_ANU = 2024
  AND i.COD_CMP = 'FJP'
  AND i.TEM_IAE_PRM = 'O'
`;

async function syncStudents() {
  let oracleConnection;
  let pgClient;
  const startTime = Date.now();
  
  try {
    logger.info('=====================================');
    logger.info('Starting manual sync process...');
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
    
    // Sync students first
    await syncStudentsData(oracleConnection, pgClient);
    
    // Sync grades
    await syncGradesData(oracleConnection, pgClient);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logger.info('=====================================');
    logger.info('✓ COMPLETE SYNC FINISHED!');
    logger.info(`✓ Duration: ${duration} seconds`);
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

async function syncStudentsData(oracleConnection, pgClient) {
  logger.info('Syncing students data...');
  
  // Fetch data from Oracle
  const result = await oracleConnection.execute(ORACLE_QUERY);
  const students = result.rows;
  
  logger.info(`✓ Fetched ${students.length} students from Oracle`);
  
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
  logger.info('Syncing grades data...');
  
  // Fetch grades from Oracle
  const result = await oracleConnection.execute(GRADES_QUERY);
  const grades = result.rows;
  
  logger.info(`✓ Fetched ${grades.length} grades from Oracle`);
  
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
  
  // Process grades in batches
  const batchSize = 200;
  for (let i = 0; i < grades.length; i += batchSize) {
    const batch = grades.slice(i, i + batchSize);
    
    for (const grade of batch) {
      const [
        cod_etu, cod_anu, cod_ses, cod_elp, 
        lib_elp, cod_nel, cod_pel, lic_elp, lib_elp_arb,
        not_elp, cod_tre
      ] = grade;
      
      // Check if student exists first
      const studentExists = await pgClient.query(
        'SELECT 1 FROM students WHERE cod_etu = $1', 
        [cod_etu]
      );
      
      if (studentExists.rows.length === 0) {
        skippedCount++;
        continue; // Skip this grade if student doesn't exist
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
          cod_etu, cod_anu, cod_ses, cod_elp, lib_elp, 
          cod_nel, cod_pel, lic_elp, lib_elp_arb, not_elp, cod_tre, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP
        )
        ON CONFLICT (cod_etu, cod_elp, cod_anu, cod_ses) DO UPDATE SET
          lib_elp = EXCLUDED.lib_elp,
          cod_nel = EXCLUDED.cod_nel,
          cod_pel = EXCLUDED.cod_pel,
          lic_elp = EXCLUDED.lic_elp,
          lib_elp_arb = EXCLUDED.lib_elp_arb,
          not_elp = EXCLUDED.not_elp,
          cod_tre = EXCLUDED.cod_tre,
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [
        cod_etu, cod_anu, cod_ses, cod_elp, lib_elp, 
        cod_nel, cod_pel, lic_elp, lib_elp_arb, not_elp, cod_tre
      ]);
      
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
  
  if (skippedCount > 0) {
    logger.warn(`⚠️  ${skippedCount} grades skipped due to missing student records`);
  }
}

// Manual sync execution
if (require.main === module) {
  console.log('Starting manual sync...');
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