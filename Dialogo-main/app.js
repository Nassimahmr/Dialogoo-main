process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // À utiliser uniquement en dev
const express = require('express');
const app = express();
const conversationRoutes = require('./routes/conversations');
const pool = require('./db'); // Import du pool PostgreSQL configuré

// Middleware
app.use(express.json());

// Test de connexion PostgreSQL au démarrage
async function checkDBConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connecté à PostgreSQL');
    await initDB(); // Crée les tables après la connexion
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.stack);
    process.exit(1); // Arrêt de l'application si la BDD est indisponible
  }
}

// Initialisation de la BDD
async function initDB() {
  const client = await pool.connect();
  try {
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
    console.error('❌ Erreur création tables:', err.stack);
  } finally {
    client.release();
  }
}

// Routes
app.get('/', (req, res) => {
  res.send('API Dialogo opérationnelle');
});

app.use('/conversations', conversationRoutes);

// Gestion des erreurs PostgreSQL
app.use((err, req, res, next) => {
  const response = {
    error: err.message || 'Erreur serveur',
    type: 'postgresql',
    code: err.code // Code d'erreur PostgreSQL (ex: '23505' pour violation d'unicité)
  };

  if (err.code === '23505') {
    response.details = `Violation de contrainte : ${err.constraint}`;
    res.status(409).json(response);
  } else {
    res.status(500).json(response);
  }
});

// Démarrage
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`\n🚀 API démarrée sur http://localhost:${PORT}`);
  await checkDBConnection(); // Vérifie la BDD après le démarrage
});