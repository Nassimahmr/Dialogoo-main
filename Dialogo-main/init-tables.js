const db = require('./db');
const initSQL = `
  CREATE TABLE IF NOT EXISTS conversations (...);
  CREATE TABLE IF NOT EXISTS messages (...);
`;

db.query(initSQL)
  .then(() => {
    console.log('Tables créées');
    process.exit(0);
  })
  .catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });