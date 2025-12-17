// reset-db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function resetDatabase() {
  try {
    console.log('⚠️  SUPPRESSION ET RECREATION DE LA TABLE EMPLOYEES...');

    // 1. Supprimer l'ancienne table
    await pool.query('DROP TABLE IF EXISTS employees CASCADE');
    console.log('✅ Ancienne table supprimée.');

    // 2. Créer la nouvelle table avec TOUTES les colonnes du CSV
    await pool.query(`
      CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        ppr VARCHAR(50) UNIQUE,           -- Index 2 (PPR)
        etablissement VARCHAR(50),        -- Index 0 (CDETAB)
        nom VARCHAR(100),                 -- Index 3 (NOMF)
        prenom VARCHAR(100),              -- Index 4 (PRNOMF)
        sexe VARCHAR(10),                 -- Index 5 (SEXE)
        date_naissance DATE,              -- Index 6 (date naissance)
        lieu_naissance VARCHAR(100),      -- Index 7 (lieu naissance)
        email VARCHAR(100),               -- Index 8 (EMAIL)
        grade VARCHAR(100),               -- Index 9 (grade)
        type VARCHAR(50),                 -- Index 10 (TPERS)
        date_recrutement DATE,            -- Index 11 (date recrutement)
        date_mise_en_service DATE,        -- Index 12 (date mise en service)
        departement VARCHAR(100),         -- Index 14 (departement)
        diplome VARCHAR(200),             -- Index 15 (diplome)
        specialite VARCHAR(200),          -- Index 16 (specialite)
        cin VARCHAR(20),                  -- (Optionnel, compatibilité)
        phone VARCHAR(50),                -- (Optionnel)
        status VARCHAR(20) DEFAULT 'ACTIF',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Nouvelle table "employees" créée avec toutes les colonnes.');

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    pool.end();
  }
}

resetDatabase();