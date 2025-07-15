const { Pool } = require('pg');
require('dotenv').config();

// Configuration avec SSL pour Render
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false // Nécessaire pour Render
  } : false
});

// Test de connexion + création des tables si elles n'existent pas
async function initDB() {
  const client = await pool.connect();
  try {
    console.log('✅ Connecté à PostgreSQL');

    // Création des tables (à personnaliser selon votre schéma)
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        sender VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tables vérifiées/créées');
  } catch (err) {
    console.error('❌ Erreur DB:', err.stack);
  } finally {
    client.release();
  }
}

// Appel initial (peut être commenté après la 1ère exécution)
initDB(); 

module.exports = pool;