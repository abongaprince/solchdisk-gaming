import express from 'express';
import { createServer as createViteServer } from 'vite';
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

// 1. CONNEXION BDD (Utilise MYSQL_URL de Railway en priorité)
const db = createPool(process.env.MYSQL_URL || {
  host: (process.env.DB_HOST || process.env.MYSQLHOST || 'localhost').trim(),
  user: (process.env.DB_USER || process.env.MYSQLUSER || 'root').trim(),
  password: (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '').trim(),
  database: (process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway').trim(),
  port: parseInt((process.env.DB_PORT || process.env.MYSQLPORT || '3306').trim()),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

// 2. INITIALISATION BDD & ADMIN
async function initDatabase() {
  try {
    console.log('Tentative de connexion à la base de données...');
    const connection = await db.getConnection();
    console.log('✅ Connecté à MySQL.');
    connection.release();

    // Création des tables
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

    // ... (Tes autres CREATE TABLE Games, Orders, etc. restent ici)

    // --- SEED ADMIN (CORRIGÉ) ---
    const adminEmail = 'Soppysolch002@gmail.com';
    const adminPassword = 'Soppy2006';
    const hashedAdminPw = bcrypt.hashSync(adminPassword, 10);

    const [adminRows]: any = await db.execute('SELECT id FROM Users WHERE email = ?', [adminEmail]);

    if (!adminRows || adminRows.length === 0) {
      console.log("L'admin n'existe pas. Création...");
      await db.execute(
        'INSERT INTO Users (nom, prenom, email, mot_de_passe, role, whatsapp) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin', 'SolchDisk', adminEmail, hashedAdminPw, 'admin', '00000000']
      );
      console.log("✅ Compte admin créé !");
    } else {
      console.log("L'admin existe déjà. Mise à jour...");
      await db.execute(
        'UPDATE Users SET mot_de_passe = ?, role = ? WHERE email = ?',
        [hashedAdminPw, 'admin', adminEmail]
      );
    }

  } catch (error) {
    console.error('❌ Erreur Init BDD:', error.message);
  }
}

// 3. LANCEMENT DU SERVEUR (CORRIGÉ POUR RAILWAY)
async function startServer() {
  // On attend que la BDD soit prête avant de lancer Express
  await initDatabase();

  const app = express();
  
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // --- Tes routes API (Login, Register, etc.) ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows;
      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user, message: 'Connexion réussie !' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Gestion du Frontend (Vite ou Statique)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  // PORT DYNAMIQUE (OBLIGATOIRE SUR RAILWAY)
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur en ligne sur le port ${PORT}`);
  });
}

startServer().catch(err => {
    console.error("Crash critique au démarrage:", err);
});
