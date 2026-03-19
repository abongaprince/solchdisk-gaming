import express from 'express';
import { createPool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
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

// 2. INITIALISATION (Vérifie que les colonnes nécessaires à App.tsx existent)
async function initDatabase() {
  try {
    const connection = await db.getConnection();
    console.log('✅ BDD Connectée');
    connection.release();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100), prenom VARCHAR(100), email VARCHAR(150) UNIQUE,
        whatsapp VARCHAR(20) UNIQUE, mot_de_passe TEXT, ville VARCHAR(100),
        quartier VARCHAR(100), pays VARCHAR(100), role ENUM('client', 'admin') DEFAULT 'client',
        photo_profil LONGTEXT, date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Games (
        id INT AUTO_INCREMENT PRIMARY KEY, titre VARCHAR(255), description TEXT,
        prix INT, image LONGTEXT, cpu VARCHAR(100), gpu VARCHAR(100),
        ram VARCHAR(50), storage VARCHAR(50), os VARCHAR(100), directx VARCHAR(50),
        date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Orders (
        id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, 
        games_list TEXT, total_price INT, statut VARCHAR(50) DEFAULT 'En attente', 
        preuve_paiement LONGTEXT, date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

  } catch (error) {
    console.error('❌ Erreur BDD:', error);
  }
}

// 3. LOGIQUE SERVEUR
async function startServer() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  await initDatabase();

  // Middleware Auth
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ');
    if (!token) return res.status(401).json({ error: 'Accès refusé' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Session invalide' });
      req.user = user;
      next();
    });
  };

  // --- ROUTES ADMIN CRITIQUES ---

  // 1. Récupérer toutes les commandes pour l'admin (Indispensable pour DashboardAdmin)
  app.get('/api/admin/orders', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès Admin Requis' });
    try {
      const [orders]: any = await db.query(`
        SELECT o.*, u.nom, u.prenom, u.email, u.whatsapp 
        FROM Orders o 
        JOIN Users u ON o.user_id = u.id 
        ORDER BY o.date_commande DESC
      `);
      
      // On s'assure que games_list est un objet pour le frontend
      const formattedOrders = orders.map((o: any) => ({
        ...o,
        games_list: typeof o.games_list === 'string' ? JSON.parse(o.games_list) : (o.games_list || [])
      }));
      
      res.json(formattedOrders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Récupérer tous les utilisateurs
  app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    const [users] = await db.query('SELECT id, nom, prenom, email, role, date_creation FROM Users');
    res.json(users);
  });

  // 3. Statistiques pour l'écran d'accueil admin
  app.get('/api/admin/stats', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    const [totalGames]: any = await db.query('SELECT COUNT(*) as count FROM Games');
    const [totalOrders]: any = await db.query('SELECT COUNT(*) as count FROM Orders');
    const [totalUsers]: any = await db.query('SELECT COUNT(*) as count FROM Users');
    res.json({
      games: totalGames.count,
      orders: totalOrders.count,
      users: totalUsers.count
    });
  });

  // --- ROUTES JEUX & AUTH ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
    const user = rows;
    if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
      return res.status(401).json({ error: 'Erreur credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const { mot_de_passe: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  });

  app.get('/api/games', async (req, res) => {
    const [games] = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
    res.json(games);
  });

  app.post('/api/games', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });
    const { titre, prix, description, image, cpu, gpu, ram, storage, os, directx } = req.body;
    await db.execute(
      'INSERT INTO Games (titre, prix, description, image, cpu, gpu, ram, storage, os, directx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [titre, prix, description, image, cpu, gpu, ram, storage, os, directx]
    );
    res.json({ success: true });
  });

  // --- FRONTEND ---
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR ADMIN PRÊT SUR LE PORT ${PORT}`);
  });
}

startServer().catch(err => console.error(err));
