import express from 'express';
import { createPool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. CONFIGURATION BDD ULTRA-ROBUSTE
// On utilise MYSQL_URL si elle existe, sinon on décompose
const dbConfig = process.env.MYSQL_URL || {
  host: (process.env.DB_HOST || process.env.MYSQLHOST || 'localhost').trim(),
  user: (process.env.DB_USER || process.env.MYSQLUSER || 'root').trim(),
  password: (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '').trim(),
  database: (process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway').trim(),
  port: parseInt((process.env.DB_PORT || process.env.MYSQLPORT || '3306').trim()),
};

const db = createPool(dbConfig);
const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

// 2. INITIALISATION AVEC LOGS D'ERREURS DÉTAILLÉS
async function initDatabase() {
  try {
    console.log('--- Démarrage de l\'initialisation BDD ---');
    const connection = await db.getConnection();
    console.log('✅ Connexion MySQL réussie !');
    connection.release();

    // Création de la table Users si elle n'existe pas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100),
        prenom VARCHAR(100),
        email VARCHAR(150) UNIQUE,
        whatsapp VARCHAR(20) UNIQUE,
        mot_de_passe TEXT,
        ville VARCHAR(100),
        quartier VARCHAR(100),
        pays VARCHAR(100),
        role ENUM('client', 'admin') DEFAULT 'client',
        photo_profil LONGTEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- CRÉATION DE L'ADMIN ---
    const adminEmail = 'Soppysolch002@gmail.com';
    const hashedAdminPw = bcrypt.hashSync('Soppy2006', 10);

    const [rows]: any = await db.execute('SELECT id FROM Users WHERE email = ?', [adminEmail]);

    if (!rows || rows.length === 0) {
      console.log("Admin introuvable, création en cours...");
      await db.execute(
        'INSERT INTO Users (nom, prenom, email, mot_de_passe, role, whatsapp) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin', 'SolchDisk', adminEmail, hashedAdminPw, 'admin', '00000000']
      );
      console.log("✅ Admin créé avec succès.");
    } else {
      console.log("Admin déjà présent.");
    }

  } catch (error) {
    console.error('❌ ERREUR CRITIQUE BDD :', error.message);
    // On ne coupe pas le serveur ici pour laisser Express tenter de démarrer
  }
}

// 3. LANCEMENT DU SERVEUR EXPRESS
async function startServer() {
  const app = express();
  
  // Middleware de base
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // Init BDD avant de servir les routes
  await initDatabase();

  // --- ROUTE DE TEST (Pour vérifier si l'app répond) ---
  app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Le serveur répond !' }));

  // Route Login
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows[0];
      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Gestion du Frontend en Production
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) res.status(404).send("Frontend non trouvé. Avez-vous fait 'npm run build' ?");
    });
  });

  // --- PORT OBLIGATOIRE POUR RAILWAY ---
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR DÉMARRÉ SUR LE PORT ${PORT}`);
  });
}

// Lancement global
startServer().catch(err => {
  console.error("ERREUR FATALE AU DÉMARRAGE :", err);
});
