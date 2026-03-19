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

// 1. CONFIGURATION BDD
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

// 2. INITIALISATION DES TABLES ET DE L'ADMIN
async function initDatabase() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Base de données connectée.');
    connection.release();

    // Table Utilisateurs
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100), prenom VARCHAR(100), email VARCHAR(150) UNIQUE,
        whatsapp VARCHAR(20) UNIQUE, mot_de_passe TEXT, ville VARCHAR(100),
        quartier VARCHAR(100), pays VARCHAR(100), role ENUM('client', 'admin') DEFAULT 'client',
        photo_profil LONGTEXT, date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table Jeux
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Games (
        id INT AUTO_INCREMENT PRIMARY KEY, titre VARCHAR(255), description TEXT,
        prix INT, image LONGTEXT, cpu VARCHAR(100), gpu VARCHAR(100),
        ram VARCHAR(50), storage VARCHAR(50), os VARCHAR(100), directx VARCHAR(50),
        date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table Commandes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Orders (
        id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, game_id INT,
        disque_dur_option VARCHAR(100), livraison_societe VARCHAR(100),
        statut VARCHAR(50) DEFAULT 'En attente', preuve_paiement LONGTEXT,
        games_list TEXT, date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    // --- SEED ADMIN ---
    const adminEmail = 'Soppysolch002@gmail.com';
    const [rows]: any = await db.execute('SELECT id FROM Users WHERE email = ?', [adminEmail]);
    if (!rows || rows.length === 0) {
      const hashedAdminPw = bcrypt.hashSync('Soppy2006', 10);
      await db.execute(
        'INSERT INTO Users (nom, prenom, email, mot_de_passe, role, whatsapp) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin', 'SolchDisk', adminEmail, hashedAdminPw, 'admin', '00000000']
      );
      console.log("✅ Admin créé.");
    }
  } catch (error) {
    console.error('❌ Erreur Initialisation:', error.message);
  }
}

// 3. LOGIQUE DU SERVEUR
async function startServer() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  await initDatabase();

  // --- MIDDLEWARES ---
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ');
    if (!token) return res.status(401).json({ error: 'Non autorisé' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) { res.status(401).json({ error: 'Token invalide' }); }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
    next();
  };

  // --- ROUTES AUTH ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows; // CRUCIAL : Correction ici

      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { ...user, mot_de_passe: undefined } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays } = req.body;
    try {
      const hashedPw = bcrypt.hashSync(mot_de_passe, 10);
      await db.execute(
        'INSERT INTO Users (nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nom, prenom, email, whatsapp, hashedPw, ville, quartier, pays]
      );
      res.status(201).json({ message: 'Succès' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // --- ROUTES JEUX ---
  app.get('/api/games', async (req, res) => {
    const [games] = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
    res.json(games);
  });

  app.post('/api/games', authMiddleware, isAdmin, async (req, res) => {
    const { titre, prix, description, image } = req.body;
    await db.execute('INSERT INTO Games (titre, prix, description, image) VALUES (?, ?, ?, ?)', [titre, prix, description, image]);
    res.status(201).json({ success: true });
  });

  // --- ROUTES COMMANDES ---
  app.post('/api/orders', authMiddleware, async (req: any, res) => {
    const { game_id, disque_dur_option, livraison_societe, preuve_paiement } = req.body;
    await db.execute(
      'INSERT INTO Orders (user_id, game_id, disque_dur_option, livraison_societe, preuve_paiement) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, game_id, disque_dur_option, livraison_societe, preuve_paiement]
    );
    res.status(201).json({ success: true });
  });

  app.get('/api/admin/orders', authMiddleware, isAdmin, async (req, res) => {
    const [orders]: any = await db.query(`
      SELECT o.*, u.nom as user_nom, g.titre as game_title 
      FROM Orders o 
      JOIN Users u ON o.user_id = u.id 
      LEFT JOIN Games g ON o.game_id = g.id
    `);
    res.json(orders);
  });

  // --- FRONTEND ---
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) res.status(404).send("Frontend introuvable.");
    });
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR PRÊT SUR LE PORT ${PORT}`);
  });
}

startServer().catch(err => console.error(err));
