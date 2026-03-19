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

// 1. CONFIGURATION BDD (Priorité à MYSQL_URL de Railway)
const dbConfig = process.env.MYSQL_URL || {
  host: (process.env.DB_HOST || process.env.MYSQLHOST || 'localhost').trim(),
  user: (process.env.DB_USER || process.env.MYSQLUSER || 'root').trim(),
  password: (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '').trim(),
  database: (process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway').trim(),
  port: parseInt((process.env.DB_PORT || process.env.MYSQLPORT || '3306').trim()),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = createPool(dbConfig);
const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

// 2. INITIALISATION BDD & SEED ADMIN
async function initDatabase() {
  try {
    console.log('--- Tentative de connexion MySQL ---');
    const connection = await db.getConnection();
    console.log('✅ Connexion MySQL réussie !');
    connection.release();

    // Table Users
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

    // --- CRÉATION AUTOMATIQUE DE L'ADMIN ---
    const adminEmail = 'Soppysolch002@gmail.com';
    const [rows]: any = await db.execute('SELECT id FROM Users WHERE email = ?', [adminEmail]);

    if (!rows || rows.length === 0) {
      const hashedAdminPw = bcrypt.hashSync('Soppy2006', 10);
      await db.execute(
        'INSERT INTO Users (nom, prenom, email, mot_de_passe, role, whatsapp) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin', 'SolchDisk', adminEmail, hashedAdminPw, 'admin', '00000000']
      );
      console.log("✅ Compte admin créé (Soppysolch002@gmail.com / Soppy2006)");
    } else {
      console.log("ℹ️ Admin déjà configuré.");
    }
  } catch (error) {
    console.error('❌ ERREUR INITIALISATION BDD :', error.message);
  }
}

// 3. LANCEMENT DU SERVEUR
async function startServer() {
  const app = express();
  
  // Middlewares de sécurité et compression
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  await initDatabase();

  // --- ROUTES API ---
  app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Serveur SolchDisk actif' }));

  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows;
      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- GESTION DU FRONTEND (Dossier dist) ---
  // On utilise path.resolve pour être sûr du chemin sur Railway
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).send("Erreur : Le frontend (dossier dist) n'a pas été trouvé. Vérifiez le build.");
      }
    });
  });

  // --- PORT DYNAMIQUE RAILWAY (8080 par défaut) ---
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR DÉMARRÉ SUR LE PORT ${PORT}`);
    console.log(`📡 URL Locale : http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("❌ CRASH AU DÉMARRAGE :", err);
});
