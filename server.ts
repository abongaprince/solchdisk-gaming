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
const db = createPool(process.env.MYSQL_URL || {
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'solchdisk_gaming',
  port: parseInt(process.env.MYSQLPORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

async function startServer() {
  const app = express();
  
  // Sécurité et Performance
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // --- MIDDLEWARE AUTHENTIFICATION (CORRIGÉ) ---
  const checkAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    const token = authHeader.split(' '); // On prend la partie après "Bearer"
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Session expirée ou invalide' });
    }
  };

  // --- ROUTES ADMIN (FIXÉES POUR ÉVITER L'ÉCRAN NOIR) ---

  // 1. Stats pour le Dashboard Admin
  app.get('/api/admin/stats', checkAuth, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès interdit' });
    try {
      const [g]: any = await db.query('SELECT COUNT(*) as c FROM Games');
      const [o]: any = await db.query('SELECT COUNT(*) as c FROM Orders');
      const [u]: any = await db.query('SELECT COUNT(*) as c FROM Users');
      
      // On renvoie un objet simple comme attendu par le frontend
      res.json({
        games: g.c,
        orders: o.c,
        users: u.c
      });
    } catch (e) {
      console.error(e);
      res.json({ games: 0, orders: 0, users: 0 });
    }
  });

  // 2. Liste des commandes pour l'Admin
  app.get('/api/admin/orders', checkAuth, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès interdit' });
    try {
      const [orders]: any = await db.query(`
        SELECT o.*, u.nom, u.prenom, u.email, u.whatsapp 
        FROM Orders o 
        JOIN Users u ON o.user_id = u.id 
        ORDER BY o.date_commande DESC
      `);
      
      const formatted = orders.map((o: any) => ({
        ...o,
        // Conversion sécurisée de games_list pour éviter le crash .map() dans React
        games_list: typeof o.games_list === 'string' ? JSON.parse(o.games_list) : (o.games_list || [])
      }));
      res.json(formatted);
    } catch (e) {
      console.error(e);
      res.json([]);
    }
  });

  // --- AUTHENTIFICATION ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows; // Correction ici : rows

      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe.toString())) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // On ne renvoie pas le mot de passe au client
      const { mot_de_passe: _, ...userSafe } = user;
      res.json({ token, user: userSafe });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- JEUX ---
  app.get('/api/games', async (req, res) => {
    try {
      const [games] = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
      res.json(games);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- GESTION DU FRONTEND ---
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur SolchDisk opérationnel sur le port ${PORT}`);
  });
}

startServer().catch(err => console.error("Erreur critique au démarrage :", err));
