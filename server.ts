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

// 1. CONFIGURATION BDD (Optimisée pour Railway)
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

// 2. INITIALISATION DES TABLES (Structure complète pour App.tsx)
async function initDatabase() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Base de données connectée avec succès.');
    connection.release();

    // Table Users
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100), prenom VARCHAR(100), email VARCHAR(150) UNIQUE,
        whatsapp VARCHAR(20) UNIQUE, mot_de_passe TEXT, ville VARCHAR(100),
        quartier VARCHAR(100), pays VARCHAR(100), role ENUM('client', 'admin') DEFAULT 'client',
        photo_profil LONGTEXT, date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table Games (avec specs techniques)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Games (
        id INT AUTO_INCREMENT PRIMARY KEY, titre VARCHAR(255), description TEXT,
        prix INT, image LONGTEXT, cpu VARCHAR(100), gpu VARCHAR(100),
        ram VARCHAR(50), storage VARCHAR(50), os VARCHAR(100), directx VARCHAR(50),
        date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table Orders (avec gestion panier multi-jeux)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Orders (
        id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, 
        games_list TEXT, total_price INT, statut VARCHAR(50) DEFAULT 'En attente', 
        preuve_paiement LONGTEXT, date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    // SEED ADMIN
    const adminEmail = 'Soppysolch002@gmail.com';
    const [rows]: any = await db.execute('SELECT id FROM Users WHERE email = ?', [adminEmail]);
    if (rows.length === 0) {
      const hashedPw = bcrypt.hashSync('Soppy2006', 10);
      await db.execute(
        'INSERT INTO Users (nom, prenom, email, mot_de_passe, role, whatsapp) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin', 'SolchDisk', adminEmail, hashedPw, 'admin', '00000000']
      );
      console.log("✅ Compte Admin créé.");
    }
  } catch (error) {
    console.error('❌ Erreur Initialisation BDD:', error);
  }
}

// 3. LOGIQUE DU SERVEUR
async function startServer() {
  const app = express();
  
  // Sécurité et Performance
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  await initDatabase();

  // --- MIDDLEWARES AUTH ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ');
    if (!token) return res.status(401).json({ error: 'Token manquant' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Session expirée' });
      req.user = user;
      next();
    });
  };

  // --- ROUTES AUTHENTIFICATION ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows;

      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      const { mot_de_passe: _, ...userSafe } = user;
      res.json({ token, user: userSafe });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays } = req.body;
    try {
      const hashedPw = bcrypt.hashSync(mot_de_passe, 10);
      await db.execute(
        'INSERT INTO Users (nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nom, prenom, email, whatsapp, hashedPw, ville, quartier, pays]
      );
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(400).json({ error: "Email ou WhatsApp déjà utilisé" }); }
  });

  // --- ROUTES PROFIL (Pour éviter l'écran noir au chargement du dashboard) ---
  app.get('/api/me', authenticateToken, async (req: any, res) => {
    const [rows]: any = await db.execute('SELECT * FROM Users WHERE id = ?', [req.user.id]);
    if (rows) {
      const { mot_de_passe: _, ...userSafe } = rows;
      res.json(userSafe);
    } else { res.status(404).json({ error: 'Utilisateur non trouvé' }); }
  });

  app.put('/api/users/profile', authenticateToken, async (req: any, res) => {
    const { nom, prenom, whatsapp, photo_profil } = req.body;
    try {
      await db.execute(
        'UPDATE Users SET nom = ?, prenom = ?, whatsapp = ?, photo_profil = ? WHERE id = ?',
        [nom, prenom, whatsapp, photo_profil, req.user.id]
      );
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- ROUTES JEUX ---
  app.get('/api/games', async (req, res) => {
    try {
      const [games] = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
      res.json(games);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/games', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    const { titre, prix, description, image, cpu, gpu, ram, storage, os, directx } = req.body;
    try {
      await db.execute(
        'INSERT INTO Games (titre, prix, description, image, cpu, gpu, ram, storage, os, directx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [titre, prix, description, image, cpu, gpu, ram, storage, os, directx]
      );
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/games/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    await db.execute('DELETE FROM Games WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // --- ROUTES COMMANDES ---
  app.post('/api/orders', authenticateToken, async (req: any, res) => {
    const { games_list, total_price, preuve_paiement } = req.body;
    try {
      await db.execute(
        'INSERT INTO Orders (user_id, games_list, total_price, preuve_paiement) VALUES (?, ?, ?, ?)',
        [req.user.id, JSON.stringify(games_list), total_price, preuve_paiement]
      );
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/my-orders', authenticateToken, async (req: any, res) => {
    const [orders] = await db.execute('SELECT * FROM Orders WHERE user_id = ? ORDER BY date_commande DESC', [req.user.id]);
    res.json(orders);
  });

  // --- ADMIN : TOUTES LES COMMANDES ---
  app.get('/api/admin/orders', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    const [orders] = await db.query(`
      SELECT o.*, u.nom, u.prenom, u.email 
      FROM Orders o 
      JOIN Users u ON o.user_id = u.id 
      ORDER BY o.date_commande DESC
    `);
    res.json(orders);
  });

  app.patch('/api/admin/orders/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    const { statut } = req.body;
    await db.execute('UPDATE Orders SET statut = ? WHERE id = ?', [statut, req.params.id]);
    res.json({ success: true });
  });

  // --- GESTION DU FRONTEND (Dossier dist) ---
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) res.status(404).send("Frontend non compilé. Lancez 'npm run build'.");
    });
  });

  // --- LANCEMENT ---
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR SOLCHDISK PRÊT SUR LE PORT ${PORT}`);
  });
}

startServer().catch(err => console.error("FATAL ERROR:", err));
