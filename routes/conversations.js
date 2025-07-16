const express = require('express');
const router = express.Router();
const db = require('../db'); // Pool PostgreSQL modifié
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Lister toutes les conversations
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM conversations');
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle conversation
router.post('/', async (req, res) => {
  try {
    const { customerId, email, description } = req.body;
    const id = uuidv4();
    await db.query(
      'INSERT INTO conversations (id, customer_id, email, description) VALUES ($1, $2, $3, $4)',
      [id, customerId, email, description]
    );
    res.status(201).json({ id, customerId, email, description, messages: [] });
  } catch (error) {
    console.error('Erreur création conversation:', error);
    res.status(500).json({ 
      error: 'Erreur serveur création conversation',
      details: error.code // Affiche le code d'erreur PostgreSQL si besoin
    });
  }
});

// Voir une conversation avec ses messages
router.get('/:id', async (req, res) => {
  try {
    const { rows: conv } = await db.query(
      'SELECT * FROM conversations WHERE id = $1', 
      [req.params.id]
    );
    if (conv.length === 0) return res.status(404).json({ error: 'Conversation non trouvée' });

    const { rows: messages } = await db.query(
      'SELECT * FROM messages WHERE conversation_id = $1',
      [req.params.id]
    );
    res.json({ ...conv[0], messages });
  } catch (error) {
    console.error('Erreur récupération conversation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un message à une conversation
router.post('/:id', async (req, res) => {
  try {
    const { sender, content } = req.body;
    const { rows: conv } = await db.query(
      'SELECT * FROM conversations WHERE id = $1',
      [req.params.id]
    );
    if (conv.length === 0) return res.status(404).json({ error: 'Conversation non trouvée' });

    await db.query(
      'INSERT INTO messages (conversation_id, sender, content) VALUES ($1, $2, $3)',
      [req.params.id, sender, content]
    );

    const { rows: messages } = await db.query(
      'SELECT * FROM messages WHERE conversation_id = $1',
      [req.params.id]
    );
    res.status(201).json({ ...conv[0], messages });
  } catch (error) {
    console.error('Erreur ajout message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Envoyer un email au client (inchangé, car indépendant de la BDD)
router.post('/:id/email', async (req, res) => {
  try {
    const { subject, content } = req.body;
    const { rows: conv } = await db.query(
      'SELECT * FROM conversations WHERE id = $1',
      [req.params.id]
    );
    if (conv.length === 0) return res.status(404).json({ error: 'Conversation non trouvée' });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"Support Dialogo" <${process.env.EMAIL_USER}>`,
      to: conv[0].email,
      subject,
      text: content,
    });

    res.json({ message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l’envoi de l’email',
      details: error.message 
    });
  }
});

module.exports = router;