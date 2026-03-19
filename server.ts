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

// --- CONFIGURATION BASTION BDD ---
const dbConfig = {
  host: (process.env.DB_HOST || process.env.MYSQLHOST || 'localhost').trim(),
  user: (process.env.DB_USER || process.env.MYSQLUSER || 'root').trim(),
  password: (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '').trim(),
  database: (process.env.DB_NAME || process.env.MYSQLDATABASE || 'solchdisk_gaming').trim(),
  port: parseInt((process.env.DB_PORT || process.env.MYSQLPORT || '3306').trim()),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = process.env.MYSQL_URL ? createPool(process.env.MYSQL_URL) : createPool(dbConfig);
const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

// --- SERVICE D'EMAIL ---
let transporter: any = null;

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
    console.log('📧 Email ignoré : SMTP non configuré.');
    return;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false }
    });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'SolchDisk Gaming <no-reply@solchdisk.com>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('❌ Erreur Email:', error);
  }
}

// --- INITIALISATION BDD & MIGRATIONS ---
async function initDatabase() {
  try {
    const conn = await db.getConnection();
    console.log('✅ Connecté à MySQL.');
    conn.release();

    // Table Utilisateurs
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

    // Table Jeux
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titre VARCHAR(255),
        description TEXT,
        prix INT,
        image LONGTEXT,
        cpu VARCHAR(100),
        gpu VARCHAR(100),
        ram VARCHAR(50),
        storage VARCHAR(50),
        os VARCHAR(100),
        directx VARCHAR(50),
        date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table Commandes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        game_id INT,
        disque_dur_option VARCHAR(100),
        livraison_societe VARCHAR(100),
        statut VARCHAR(50) DEFAULT 'En attente',
        preuve_paiement LONGTEXT,
        games_list TEXT,
        date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    // Seed Admin
    const adminEmail = 'Soppysolch002@gmail.com';
    const hashedPw = bcrypt.hashSync('Soppy2006', 10);
    const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ?', [adminEmail]);
    
    if (rows.length === 0) {
      await db.execute(
        'INSERT INTO Users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
        ['Admin SolchDisk', adminEmail, hashedPw, 'admin']
      );
      console.log('👑 Admin créé.');
    }
  } catch (e) {
    console.error('❌ BDD Erreur:', e);
  }
}

// --- SERVEUR & ROUTES ---
async function startServer() {
  await initDatabase();
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false })); // Désactivé pour laisser charger les images externes
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // Middleware Auth
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ');
    if (!token) return res.status(401).json({ error: 'Non autorisé' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) { res.status(401).json({ error: 'Token invalide' }); }
  };

  const verifyAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Accès Admin requis' });
    next();
  };

  // --- API ROUTES ---

  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows;
      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { ...user, mot_de_passe: undefined } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/games', async (req, res) => {
    try {
      const [games] = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
      res.json(games);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/admin/stats', authMiddleware, verifyAdmin, async (req, res) => {
    try {
      const [g]: any = await db.query('SELECT COUNT(*) as c FROM Games');
      const [o]: any = await db.query('SELECT COUNT(*) as c FROM Orders');
      const [u]: any = await db.query('SELECT COUNT(*) as c FROM Users');
      res.json({ games: g.c, orders: o.c, users: u.c });
    } catch (e) { res.status(500).send(e); }
  });

  // Gestion du Frontend (Vite ou Statique)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Serveur prêt sur le port ${PORT}`));
}

startServer();
