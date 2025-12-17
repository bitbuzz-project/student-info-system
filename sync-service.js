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

// ==========================================
// 1. SYNC LAUREATS (FIRST PRIORITY)
// ==========================================
async function syncLaureats(oracleConnection, pgClient) {
  logger.info('=====================================');
  logger.info('🎓 1. SYNCING LAUREATS (GRADUATES)...');
  
  const yearsToSync = [2024, 2023, 2022, 2021];

  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS laureats (
      id SERIAL PRIMARY KEY,
      cod_etu VARCHAR(20) NOT NULL,
      nom_pat_ind VARCHAR(100),
      prenom_ind VARCHAR(100),
      cod_etp VARCHAR(20),
      cod_anu VARCHAR(4),
      cod_vrs_vet VARCHAR(10),
      cod_dip VARCHAR(20),
      lib_dip VARCHAR(200),  -- NEW COLUMN
      cod_uti VARCHAR(50),
      dat_cre_iae TIMESTAMP,
      nbr_ins_cyc INTEGER,
      nbr_ins_etp INTEGER,
      nbr_ins_dip INTEGER,
      tem_dip_iae VARCHAR(1),
      cod_pay_nat VARCHAR(10),
      cod_etb VARCHAR(10),
      cod_nne_ind VARCHAR(50),
      dat_cre_ind TIMESTAMP,
      date_nai_ind DATE,
      cin_ind VARCHAR(20),
      sexe VARCHAR(1),
      lib_vil_nai_etu VARCHAR(100),
      nom_arabe VARCHAR(100),
      prenom_arabe VARCHAR(100),
      lieu_nai_arabe VARCHAR(100),
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_laureat_record UNIQUE (cod_etu, cod_anu, cod_dip)
    )
  `);

  await pgClient.query(`ALTER TABLE laureats ADD COLUMN IF NOT EXISTS lib_dip VARCHAR(200)`);

  let totalProcessed = 0;

  for (const year of yearsToSync) {
    logger.info(`   Processing year ${year}...`);
    
    // Updated query with LIB_DIP join and fix_encoding
    const query = `
      SELECT 
        ind.COD_ETU,
        ind.LIB_NOM_PAT_IND,
        ind.LIB_PR1_IND,
        i.COD_ETP,
        i.COD_ANU,
        i.COD_VRS_VET,
        i.COD_DIP,
        d.LIB_DIP,
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
        ind.COD_SEX_ETU,
        ind.LIB_VIL_NAI_ETU,
        ind.COD_DEP_PAY_NAI,
        fix_encoding(ind.LIB_NOM_IND_ARB) AS LIB_NOM_IND_ARB,
        fix_encoding(ind.LIB_PRN_IND_ARB) AS LIB_PRN_IND_ARB,
        fix_encoding(LIB_VIL_NAI_ETU_ARB) AS LIB_VIL_NAI_ETU_ARB,
        ind.CIN_IND
      FROM INS_ADM_ETP i
      JOIN INDIVIDU ind ON i.COD_IND = ind.COD_IND
      LEFT JOIN DIPLOME d ON i.COD_DIP = d.COD_DIP
      JOIN RESULTAT_VDI r ON (
        i.COD_IND = r.COD_IND AND 
        i.COD_ANU = r.COD_ANU AND 
        i.COD_DIP = r.COD_DIP AND 
        i.COD_VRS_VDI = r.COD_VRS_VDI
      )
      JOIN TYP_RESULTAT tr ON r.COD_TRE = tr.COD_TRE
      WHERE 
        i.COD_ANU = :year
        AND i.ETA_IAE = 'E'
        AND i.COD_CMP = 'FJP'
        AND (i.COD_VRS_VDI > 100 OR i.COD_DIP = 'JLDII')
        AND tr.COD_NEG_TRE = 1
    `;

    const result = await oracleConnection.execute(query, [year], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    logger.info(`   Found ${result.rows.length} laureats for ${year}`);

    for (const row of result.rows) {
      await pgClient.query(`
        INSERT INTO laureats (
          cod_etu, nom_pat_ind, prenom_ind, cod_etp, cod_anu,
          cod_vrs_vet, cod_dip, lib_dip, cod_uti, dat_cre_iae, nbr_ins_cyc,
          nbr_ins_etp, nbr_ins_dip, tem_dip_iae, cod_pay_nat, cod_etb,
          cod_nne_ind, dat_cre_ind, date_nai_ind, cin_ind, sexe,
          lib_vil_nai_etu, nom_arabe, prenom_arabe, lieu_nai_arabe, last_sync
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, CURRENT_TIMESTAMP
        )
        ON CONFLICT (cod_etu, cod_anu, cod_dip) DO UPDATE SET
          nom_pat_ind = EXCLUDED.nom_pat_ind,
          prenom_ind = EXCLUDED.prenom_ind,
          lib_dip = EXCLUDED.lib_dip,
          dat_cre_iae = EXCLUDED.dat_cre_iae,
          last_sync = CURRENT_TIMESTAMP
      `, [
        row.COD_ETU, row.LIB_NOM_PAT_IND, row.LIB_PR1_IND, row.COD_ETP, row.COD_ANU,
        row.COD_VRS_VET, row.COD_DIP, row.LIB_DIP, row.COD_UTI, row.DAT_CRE_IAE, row.NBR_INS_CYC,
        row.NBR_INS_ETP, row.NBR_INS_DIP, row.TEM_DIP_IAE, row.COD_PAY_NAT, row.COD_ETB,
        row.COD_NNE_IND, row.DAT_CRE_IND, row.DATE_NAI_IND, row.CIN_IND, row.COD_SEX_ETU,
        row.LIB_VIL_NAI_ETU, row.LIB_NOM_IND_ARB, row.LIB_PRN_IND_ARB, row.LIB_VIL_NAI_ETU_ARB
      ]);
      totalProcessed++;
    }
  }
  
  logger.info(`✓ Laureats sync completed: ${totalProcessed} records processed`);
}

// ==========================================
// 2. QUERY DEFINITIONS & HELPERS
// ==========================================

const ENHANCED_ELEMENT_QUERY = `
  WITH EFFECTIVE_NEL AS (
    SELECT 
      COD_ELP, 
      COD_NEL,
      TO_NUMBER(SUBSTR(COD_NEL, 3, 2)) + 
        CASE 
          WHEN SUBSTR(COD_ELP, 1, 2) IN ('AI', 'EI', 'GG', 'GL') THEN 4 
          ELSE 0 
        END AS EFCTV_NEL
    FROM ELEMENT_PEDAGOGI
    WHERE COD_NEL LIKE 'SM%'
  )
  SELECT 
    e.COD_ELP, 
    e.COD_CMP, 
    e.COD_NEL, 
    e.COD_PEL, 
    e.LIB_ELP, 
    e.LIC_ELP, 
    fix_encoding(e.LIB_ELP_ARB) AS LIB_ELP_ARB,
    efn.EFCTV_NEL
  FROM ELEMENT_PEDAGOGI e 
  LEFT JOIN EFFECTIVE_NEL efn ON e.COD_ELP = efn.COD_ELP
  WHERE e.COD_CMP = 'FJP'
  ORDER BY e.COD_PEL, e.COD_NEL, e.COD_ELP
`;

const ELEMENT_HIERARCHY_QUERY = `
SELECT 
  COD_ELP_PERE,
  COD_ELP_FILS
FROM ELP_REGROUPE_ELP 
WHERE COD_ELP_PERE LIKE 'JL%' OR COD_ELP_PERE LIKE 'JF%'
ORDER BY COD_ELP_PERE, COD_ELP_FILS
`;

const VALIDATED_MODULES_QUERY = `
WITH EFFECTIVE_NEL AS (
  SELECT COD_ELP, COD_NEL,
    TO_NUMBER(SUBSTR(COD_NEL, 3,2)) + CASE WHEN SUBSTR(COD_ELP,1,2) IN ('AI', 'EI', 'GG', 'GL') THEN 4 ELSE 0 END EFCTV_NEL
  FROM ELEMENT_PEDAGOGI
  WHERE COD_NEL LIKE 'SM%'
)
SELECT DISTINCT 
  COD_ETU, 
  COD_NNE_IND,
  LIB_NOM_PAT_IND, 
  LIB_PR1_IND,
  LIC_TPD,
  IAE.COD_DIP,
  EFN.EFCTV_NEL,
  COUNT(DISTINCT DECODE(TRM.COD_NEG_TRE, 1, REM.COD_ELP, NULL)) OVER (PARTITION BY REM.COD_IND, ELPS.COD_ELP) AS MODULES
FROM INS_ADM_ETP IAE
  JOIN INDIVIDU I ON(I.COD_IND=IAE.COD_IND)
  JOIN ADRESSE A ON(A.COD_IND=IAE.COD_IND)
  JOIN VDI_FRACTIONNER_VET VFV ON(VFV.COD_DIP=IAE.COD_DIP)
  JOIN VET_REGROUPE_LSE VRL ON(VRL.COD_ETP=VFV.COD_ETP AND VRL.COD_VRS_VET=VFV.COD_VRS_VET)
  JOIN LSE_REGROUPE_ELP LRE ON(LRE.COD_LSE=VRL.COD_LSE)
  JOIN ELP_REGROUPE_ELP ERES ON(ERES.COD_ELP_PERE=LRE.COD_ELP AND ERES.DATE_FERMETURE_LIEN IS NULL)
  JOIN ELEMENT_PEDAGOGI ELPS ON(ELPS.COD_ELP=ERES.COD_ELP_FILS OR ELPS.COD_ELP=LRE.COD_ELP)
  JOIN ELP_REGROUPE_ELP EREM ON(EREM.COD_ELP_PERE=ELPS.COD_ELP AND EREM.DATE_FERMETURE_LIEN IS NULL)
  JOIN RESULTAT_ELP REM ON(REM.COD_IND=IAE.COD_IND AND REM.COD_ELP=EREM.COD_ELP_FILS
      AND REM.COD_ANU <= IAE.COD_ANU AND ELPS.COD_NEL LIKE 'SM%')
  JOIN TYP_RESULTAT TRM ON(TRM.COD_TRE=REM.COD_TRE)
  JOIN DIPLOME D ON(D.COD_DIP=IAE.COD_DIP)
  JOIN TYP_DIPLOME TPD ON(TPD.COD_TPD_ETB=D.COD_TPD_ETB)
  LEFT JOIN EFFECTIVE_NEL EFN ON(EFN.COD_ELP=ELPS.COD_ELP)
WHERE IAE.ETA_IAE='E'
  AND IAE.COD_ANU IN (2023, 2024, 2025)
  AND IAE.COD_DIP LIKE 'JL%'
  AND IAE.COD_DIP NOT IN ('JLDII')
ORDER BY COD_ETU, EFN.EFCTV_NEL
`;

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
  AND iae.COD_ANU IN (2020, 2021, 2022, 2023, 2024, 2025, 2026)
ORDER BY i.COD_ETU, iae.COD_ANU DESC
`;

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

// FIXED: Now uses fix_encoding() for Arabic fields
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
  fix_encoding(ind.LIB_NOM_IND_ARB) AS LIB_NOM_IND_ARB,
  fix_encoding(ind.LIB_PRN_IND_ARB) AS LIB_PRN_IND_ARB,
  ind.CIN_IND,
  fix_encoding(ind.LIB_VIL_NAI_ETU_ARB) AS LIB_VIL_NAI_ETU_ARB,
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

// ==========================================
// 3. OTHER SYNC FUNCTIONS
// ==========================================

async function syncElementPedagogi(oracleConnection, pgClient) {
  logger.info('Syncing element pedagogi data with improved semester detection...');
  
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
      element_type VARCHAR(10),
      semester_number INTEGER,
      year_level INTEGER,
      effective_nel INTEGER,
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pgClient.query(`ALTER TABLE element_pedagogi ADD COLUMN IF NOT EXISTS effective_nel INTEGER`);
  
  const result = await oracleConnection.execute(ENHANCED_ELEMENT_QUERY);
  const elements = result.rows;
  
  logger.info(`✓ Fetched ${elements.length} elements from Oracle`);
  
  await pgClient.query('BEGIN');
  let processedCount = 0;
  
  for (const element of elements) {
    const [cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb, efctv_nel] = element;
    let elementType = 'MATIERE';
    let semesterNumber = null;
    let yearLevel = null;
    let effectiveNel = efctv_nel;
    
    if (effectiveNel && effectiveNel >= 1 && effectiveNel <= 12) {
      semesterNumber = effectiveNel;
      elementType = cod_nel === 'MOD' ? 'MODULE' : (cod_nel && cod_nel.startsWith('SM') ? 'SEMESTRE' : 'MATIERE');
    } else {
       const classInfo = classifyPedagogicalElement(cod_elp, lib_elp);
       if (classInfo.isYearlyElement) {
         elementType = 'ANNEE';
         yearLevel = parseInt(classInfo.academicLevel.replace('A','')) || null;
       }
    }

    await pgClient.query(`
      INSERT INTO element_pedagogi (
        cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb, 
        element_type, semester_number, year_level, effective_nel, last_sync
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (cod_elp) DO UPDATE SET
        lib_elp = EXCLUDED.lib_elp,
        element_type = EXCLUDED.element_type,
        semester_number = EXCLUDED.semester_number,
        year_level = EXCLUDED.year_level,
        effective_nel = EXCLUDED.effective_nel,
        last_sync = CURRENT_TIMESTAMP
    `, [cod_elp, cod_cmp, cod_nel, cod_pel, lib_elp, lic_elp, lib_elp_arb, elementType, semesterNumber, yearLevel, effectiveNel]);
    
    processedCount++;
  }
  
  await pgClient.query('COMMIT');
  logger.info(`✓ Element pedagogi sync completed: ${processedCount} items`);
}

async function syncElementHierarchy(oracleConnection, pgClient) {
  logger.info('Syncing element hierarchy...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS element_hierarchy (
      id SERIAL PRIMARY KEY,
      cod_elp_pere VARCHAR(20) NOT NULL,
      cod_elp_fils VARCHAR(20) NOT NULL,
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_elp_pere, cod_elp_fils)
    )
  `);
  const result = await oracleConnection.execute(ELEMENT_HIERARCHY_QUERY);
  const rows = result.rows;
  await pgClient.query('BEGIN');
  for (const row of rows) {
    await pgClient.query(`
      INSERT INTO element_hierarchy (cod_elp_pere, cod_elp_fils, last_sync)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (cod_elp_pere, cod_elp_fils) DO UPDATE SET last_sync = CURRENT_TIMESTAMP
    `, row);
  }
  await pgClient.query('COMMIT');
  logger.info(`✓ Hierarchy sync completed: ${rows.length} relationships`);
}

async function syncValidatedModules(oracleConnection, pgClient) {
  logger.info('Syncing validated modules per semester...');
  
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS validated_modules_per_semester (
      id SERIAL PRIMARY KEY,
      cod_etu VARCHAR(20) NOT NULL,
      cod_nne_ind VARCHAR(50),
      lib_nom_pat_ind VARCHAR(100),
      lib_pr1_ind VARCHAR(100),
      lic_tpd VARCHAR(100),
      cod_dip VARCHAR(20),
      semester_number INTEGER,
      validated_modules_count INTEGER DEFAULT 0,
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_etu, semester_number)
    )
  `);
  
  const result = await oracleConnection.execute(VALIDATED_MODULES_QUERY);
  const rows = result.rows;
  
  await pgClient.query('BEGIN');
  for (const row of rows) {
    const [cod_etu, cod_nne_ind, lib_nom_pat_ind, lib_pr1_ind, lic_tpd, cod_dip, efctv_nel, modules_count] = row;
    if (!efctv_nel) continue;

    await pgClient.query(`
      INSERT INTO validated_modules_per_semester (
        cod_etu, cod_nne_ind, lib_nom_pat_ind, lib_pr1_ind,
        lic_tpd, cod_dip, semester_number, validated_modules_count, last_sync
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (cod_etu, semester_number) DO UPDATE SET
        validated_modules_count = EXCLUDED.validated_modules_count,
        last_sync = CURRENT_TIMESTAMP
    `, [cod_etu, cod_nne_ind, lib_nom_pat_ind, lib_pr1_ind, lic_tpd, cod_dip, efctv_nel, modules_count || 0]);
  }
  await pgClient.query('COMMIT');
  logger.info(`✓ Validated modules sync completed: ${rows.length} records`);
}

async function syncAdministrativeSituation(oracleConnection, pgClient) {
  logger.info('Syncing administrative situation...');
  
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
  
  const result = await oracleConnection.execute(ADMINISTRATIVE_SITUATION_QUERY);
  const rows = result.rows;
  
  await pgClient.query('BEGIN');
  for (const row of rows) {
    // Correctly mapping indices from query
    await pgClient.query(`
      INSERT INTO administrative_situation (
        cod_etu, cod_anu, cod_etp, lib_etp, lic_etp, cod_vrs_vet, eta_iae,
        tem_iae_prm, dat_cre_iae, dat_mod_iae, nbr_ins_cyc, nbr_ins_etp,
        nbr_ins_dip, tem_dip_iae, cod_uti, lib_dip, last_sync
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
      ON CONFLICT (cod_etu, cod_anu, cod_etp) DO UPDATE SET
        last_sync = CURRENT_TIMESTAMP
    `, row); // row matches columns exactly 
  }
  await pgClient.query('COMMIT');
  logger.info(`✓ Administrative situation sync completed: ${rows.length} records`);
}

async function syncPedagogicalSituation(oracleConnection, pgClient) {
  logger.info('Syncing pedagogical situation...');
  
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
      academic_level VARCHAR(20),
      is_yearly_element BOOLEAN DEFAULT FALSE,
      last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cod_etu, cod_elp, daa_uni_con)
    )
  `);
  
  const result = await oracleConnection.execute(PEDAGOGICAL_SITUATION_QUERY);
  const rows = result.rows;
  
  await pgClient.query('BEGIN');
  for (const row of rows) {
    const [apogee, nom, prenom, date_uni_con, cod_elp, module, ia] = row;
    const { academicLevel, isYearlyElement } = classifyPedagogicalElement(cod_elp, module);
    
    await pgClient.query(`
      INSERT INTO pedagogical_situation (
        cod_etu, lib_nom_pat_ind, lib_pr1_ind, daa_uni_con, 
        cod_elp, lib_elp, eta_iae, academic_level, is_yearly_element, last_sync
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (cod_etu, cod_elp, daa_uni_con) DO UPDATE SET
        last_sync = CURRENT_TIMESTAMP
    `, [apogee, nom, prenom, date_uni_con, cod_elp, module, ia, academicLevel, isYearlyElement]);
  }
  await pgClient.query('COMMIT');
  logger.info(`✓ Pedagogical situation sync completed: ${rows.length} records`);
}

// ==========================================
// 4. SYNC STUDENTS DATA (FIXED ARABIC)
// ==========================================
async function syncStudentsData(oracleConnection, pgClient) {
  logger.info('Syncing students data...');
  const result = await oracleConnection.execute(ORACLE_QUERY_ALL_STUDENTS);
  const students = result.rows;
  
  await pgClient.query('BEGIN');
  for (const student of students) {
    const [
        cod_etu, nom, prenom, cod_etp, cod_anu, , , cod_uti, 
        dat_cre_iae, nbr_ins_cyc, nbr_ins_etp, nbr_ins_dip, tem_dip_iae, 
        cod_pay_nat, cod_etb, cod_nne_ind, dat_cre_ind, dat_mod_ind, 
        date_nai_ind, daa_ent_etb, , , , , , , cod_sex_etu, 
        lib_vil_nai_etu, cod_dep_pay_nai, daa_ens_sup, daa_etb, 
        lib_nom_arb, lib_prn_arb, cin_ind, lib_vil_arb, lib_etp, lic_etp
    ] = student;
    
    await pgClient.query(`
      INSERT INTO students (
        cod_etu, lib_nom_pat_ind, lib_pr1_ind, cod_etp, cod_anu,
        cod_uti, dat_cre_iae, nbr_ins_cyc, nbr_ins_etp, nbr_ins_dip,
        tem_dip_iae, cod_pay_nat, cod_etb, cod_nne_ind, dat_cre_ind,
        date_nai_ind, cod_sex_etu, lib_vil_nai_etu, lib_nom_ind_arb, 
        lib_prn_ind_arb, cin_ind, lib_vil_nai_etu_arb, lib_etp, lic_etp, last_sync
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, CURRENT_TIMESTAMP
      )
      ON CONFLICT (cod_etu, cod_anu) DO UPDATE SET
        lib_nom_pat_ind = EXCLUDED.lib_nom_pat_ind,
        lib_pr1_ind = EXCLUDED.lib_pr1_ind,
        lib_nom_ind_arb = EXCLUDED.lib_nom_ind_arb,
        lib_prn_ind_arb = EXCLUDED.lib_prn_ind_arb,
        lib_vil_nai_etu_arb = EXCLUDED.lib_vil_nai_etu_arb,
        last_sync = CURRENT_TIMESTAMP
    `, [
        cod_etu, nom, prenom, cod_etp, cod_anu, 
        cod_uti, dat_cre_iae, nbr_ins_cyc, nbr_ins_etp, nbr_ins_dip, 
        tem_dip_iae, cod_pay_nat, cod_etb, cod_nne_ind, dat_cre_ind, 
        date_nai_ind, cod_sex_etu, lib_vil_nai_etu, lib_nom_arb, 
        lib_prn_arb, cin_ind, lib_vil_arb, lib_etp, lic_etp
    ]);
  }
  await pgClient.query('COMMIT');
  logger.info(`✓ Students sync completed: ${students.length} records`);
}

// Helpers and Empty functions for now to keep structure
async function syncGradesData(oracleConnection, pgClient) { logger.info('Syncing Grades...'); /* Implementation from previous file */ }
async function syncOfficialDocuments(oracleConnection, pgClient) { logger.info('Syncing Documents...'); /* Implementation from previous file */ }
async function syncElementsFromGrades(oracleConnection, pgClient) { return 0; }

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
// 5. MAIN SYNC FUNCTION
// ==========================================

async function syncStudents() {
  let oracleConnection;
  let pgClient;
  const startTime = Date.now();
  
  try {
    logger.info('=====================================');
    logger.info('Starting manual sync process...');
    logger.info('=====================================');
    
    // Connections
    pgClient = await pgPool.connect();
    oracleConnection = await oracledb.getConnection(oracleConfig);
    
    // --- ORDER OF EXECUTION ---
    
    // 1. Laureats (Requested Priority)
    await syncLaureats(oracleConnection, pgClient);
    
    // 2. Base Data
    await syncElementPedagogi(oracleConnection, pgClient);
    await syncElementHierarchy(oracleConnection, pgClient);
    
    // 3. Situations & Validation
    await syncValidatedModules(oracleConnection, pgClient);
    await syncAdministrativeSituation(oracleConnection, pgClient);
    await syncPedagogicalSituation(oracleConnection, pgClient);
    
    // 4. Students & Grades
    await syncStudentsData(oracleConnection, pgClient);
    // await syncGradesData(oracleConnection, pgClient); // Uncomment when full logic included
    // await syncOfficialDocuments(oracleConnection, pgClient); // Uncomment when full logic included
    
    const endTime = Date.now();
    logger.info(`✓ SYNC COMPLETE in ${Math.round((endTime - startTime) / 1000)}s`);
    
  } catch (error) {
    logger.error(`✗ SYNC FAILED: ${error.message}`);
    if (pgClient) await pgClient.query('ROLLBACK');
    throw error;
  } finally {
    if (oracleConnection) await oracleConnection.close();
    if (pgClient) pgClient.release();
  }
}

// Manual execution block
if (require.main === module) {
  syncStudents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { 
  syncStudents,
  syncLaureats // Exported so admin route can use it independently
};