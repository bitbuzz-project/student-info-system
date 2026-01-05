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

function mapElementType(codNel) {
  if (!codNel) return 'MATIERE'; 
  const code = codNel.trim().toUpperCase();
  if (code === 'MOD' || code === 'UE') return 'MODULE';
  if (code.startsWith('SM') || code === 'SEM') return 'SEMESTRE';
  if (code.startsWith('AN'))  return 'ANNEE'; 
  return 'MATIERE';
}

function determineSemester(codElp, codPel, elementType, libElp) {
  const code = (codElp || '').trim().toUpperCase();
  const pel = (codPel || '').trim().toUpperCase();
  const name = (libElp || '').trim().toUpperCase();
  
  if (elementType === 'ANNEE') return null;
  const codePattern = /^(JLDN|JMD|JLD|JL)([1-6])\d+/i;
  const match = code.match(codePattern);
  if (match) return parseInt(match[2]);
  const namePattern = /(?:^|\s|-)S\s?([1-6])(?:\s|$|-)|SEMESTRE\s?([1-6])/i;
  const nameMatch = name.match(namePattern);
  if (nameMatch) {
    const sem = parseInt(nameMatch[1] || nameMatch[2]);
    if (!isNaN(sem)) return sem;
  }
  if (pel.startsWith('S')) {
    const parsedSem = parseInt(pel.substring(1));
    if (!isNaN(parsedSem) && parsedSem > 0 && parsedSem <= 12) return parsedSem;
  }
  if (code.includes('S1')) return 1;
  if (code.includes('S2')) return 2;
  if (code.includes('S3')) return 3;
  if (code.includes('S4')) return 4;
  if (code.includes('S5')) return 5;
  if (code.includes('S6')) return 6;
  return null;
}

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
// 2. ORACLE QUERY
// ==========================================

const PEDAGOGICAL_SITUATION_QUERY = `
SELECT DISTINCT 
    IND.COD_ETU AS APOGEE,
    IND.LIB_NOM_PAT_IND AS NOM,
    IND.LIB_PR1_IND AS PRENOM,
    IND.DAA_ENT_ETB AS DATE_UNI_CON,
    ICE.COD_ELP,
    ELP.COD_NEL,
    ELP.COD_PEL,
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
    ICE.TEM_PRC_ICE = 'N'
    AND ICE.COD_ANU = :year
    AND ICE.COD_ETP LIKE 'JL%'
ORDER BY IND.COD_ETU, ICE.COD_ELP
`;

// ==========================================
// 3. EXAM SYNC LOGIC (NEW)
// ==========================================

async function syncExamParticipants(pgClient) {
  logger.info('=====================================');
  logger.info('🔄 SYNCING EXAM PARTICIPANTS...');
  
  // 1. Get all future exams (or exams from today onwards)
  // We avoid touching past exams to preserve history
  const examsResult = await pgClient.query(`
    SELECT id, module_code, module_name, group_name, exam_date 
    FROM exam_planning 
    WHERE exam_date >= CURRENT_DATE
  `);
  
  const exams = examsResult.rows;
  logger.info(`Found ${exams.length} future exams to check.`);

  let totalAdded = 0;
  let totalRemoved = 0;

  for (const exam of exams) {
    const { id, module_code, group_name, module_name } = exam;
    
    // 2. Determine ELIGIBLE students from Pedagogical Situation based on Rules
    // This query mimics the logic used in the frontend to fetch students
    let eligibleQuery = `
      SELECT DISTINCT ps.cod_etu
      FROM pedagogical_situation ps
      WHERE ps.cod_elp = $1
    `;
    const params = [module_code];

    // Apply Group Filtering Logic
    if (group_name && group_name !== 'Tous') {
      eligibleQuery += `
        AND EXISTS (
          SELECT 1 FROM grouping_rules gr
          WHERE ps.cod_elp ILIKE gr.module_pattern
          AND gr.group_name = $2
          AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" >= UPPER(gr.range_start) COLLATE "C"
          AND UPPER(ps.lib_nom_pat_ind) COLLATE "C" <= (UPPER(gr.range_end) || 'ZZZZZZ') COLLATE "C"
        )
      `;
      params.push(group_name);
    }

    const eligibleResult = await pgClient.query(eligibleQuery, params);
    const eligibleStudents = new Set(eligibleResult.rows.map(r => r.cod_etu));

    // 3. Get CURRENTLY ASSIGNED students
    const assignedResult = await pgClient.query(`SELECT cod_etu FROM exam_assignments WHERE exam_id = $1`, [id]);
    const assignedStudents = new Set(assignedResult.rows.map(r => r.cod_etu));

    // 4. Calculate Diff
    const toAdd = [...eligibleStudents].filter(x => !assignedStudents.has(x));
    const toRemove = [...assignedStudents].filter(x => !eligibleStudents.has(x));

    // 5. Apply Changes
    if (toAdd.length > 0) {
      const values = toAdd.map((_, i) => `($1, $${i + 2})`).join(',');
      await pgClient.query(
        `INSERT INTO exam_assignments (exam_id, cod_etu) VALUES ${values} ON CONFLICT DO NOTHING`,
        [id, ...toAdd]
      );
      
      // Notify
      const msg = `Ajouté ${toAdd.length} étudiant(s) à l'examen : ${module_name} (${group_name})`;
      await createNotification(pgClient, 'INFO', 'Mise à jour Examen', msg);
      logger.info(`   [Exam ${id}] Added ${toAdd.length} students.`);
    }

    if (toRemove.length > 0) {
      await pgClient.query(
        `DELETE FROM exam_assignments WHERE exam_id = $1 AND cod_etu = ANY($2)`,
        [id, toRemove]
      );
      
      // Notify
      const msg = `Retiré ${toRemove.length} étudiant(s) de l'examen : ${module_name} (${group_name}) car ils ne sont plus inscrits.`;
      await createNotification(pgClient, 'WARNING', 'Nettoyage Examen', msg);
      logger.info(`   [Exam ${id}] Removed ${toRemove.length} students.`);
    }

    totalAdded += toAdd.length;
    totalRemoved += toRemove.length;
  }

  logger.info(`✓ Exam Sync Complete. Added: ${totalAdded}, Removed: ${totalRemoved}`);
}

async function createNotification(client, type, title, message) {
  // Ensure table exists just in case
  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20),
      title VARCHAR(200),
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await client.query(
    `INSERT INTO notifications (type, title, message) VALUES ($1, $2, $3)`,
    [type, title, message]
  );
}

// ==========================================
// 4. MAIN SYNC FUNCTION
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

    // 1. Create/Update Table Structure
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
        semester_number INTEGER, 
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cod_etu, cod_elp, daa_uni_con)
      )
    `);
    
    await pgClient.query(`ALTER TABLE pedagogical_situation ADD COLUMN IF NOT EXISTS lib_elp_arb VARCHAR(200)`);
    await pgClient.query(`ALTER TABLE pedagogical_situation ADD COLUMN IF NOT EXISTS semester_number INTEGER`);

    // 2. CLEAR TABLE
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
      const [apogee, nom, prenom, date_uni_con, cod_elp, cod_nel, cod_pel, module, module_arb, ia] = row;
      const { academicLevel, isYearlyElement } = classifyPedagogicalElement(cod_elp, module);
      const elementType = mapElementType(cod_nel);
      const semesterNumber = determineSemester(cod_elp, cod_pel, elementType, module);

      await pgClient.query(`
        INSERT INTO pedagogical_situation (
          cod_etu, lib_nom_pat_ind, lib_pr1_ind, daa_uni_con, 
          cod_elp, lib_elp, lib_elp_arb, eta_iae, 
          academic_level, is_yearly_element, semester_number, last_sync
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      `, [apogee, nom, prenom, date_uni_con, cod_elp, module, module_arb, ia, academicLevel, isYearlyElement, semesterNumber]);
      
      count++;
      if (count % 1000 === 0) process.stdout.write('.');
    }
    
    await pgClient.query('COMMIT');
    console.log('');
    logger.info(`✓ Pedagogical Data Synced: ${count} records.`);

    // 5. AUTO-UPDATE EXAMS (The new part)
    await syncExamParticipants(pgClient);

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