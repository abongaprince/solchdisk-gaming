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

// 1. CONNEXION BDD
const dbConfig = process.env.MYSQL_URL || {
  host: (process.env.DB_HOST || process.env.MYSQLHOST || 'localhost').trim(),
  user: (process.env.DB_USER || process.env.MYSQLUSER || 'root').trim(),
  password: (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '').trim(),
  database: (process.env.DB_NAME || process.env.MYSQLDATABASE || 'solchdisk_gaming').trim(),
  port: parseInt((process.env.DB_PORT || process.env.MYSQLPORT || '3306').trim()),
};
const db = createPool(dbConfig);
const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

// 2. MIDDLEWARES DE SÉCURITÉ
async function startServer() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false })); // Permet l'affichage des images/scripts
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // Middleware d'authentification
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

  // --- ROUTES ADMIN (CELLES QUI CAUSENT L'ÉCRAN NOIR) ---

  // Route Stats (Indispensable pour le Dashboard)
  app.get('/api/admin/stats', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Interdit');
    try {
      const [g]: any = await db.query('SELECT COUNT(*) as c FROM Games');
      const [o]: any = await db.query('SELECT COUNT(*) as c FROM Orders');
      const [u]: any = await db.query('SELECT COUNT(*) as c FROM Users');
      res.json({ games: g.c, orders: o.c, users: u.c });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Route Commandes Admin (Formatée pour React)
  app.get('/api/admin/orders', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Interdit');
    try {
      const [orders]: any = await db.query(`
        SELECT o.*, u.nom, u.prenom, u.email, u.whatsapp 
        FROM Orders o 
        JOIN Users u ON o.user_id = u.id 
        ORDER BY o.date_commande DESC
      `);
      
      // PROTECTION : Convertit games_list de String en Array pour éviter le crash .map()
      const safeOrders = orders.map((o: any) => ({
        ...o,
        games_list: typeof o.games_list === 'string' ? JSON.parse(o.games_list) : (o.games_list || [])
      }));
      
      res.json(safeOrders);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Route Users Admin
  app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Interdit');
    const [users] = await db.query('SELECT id, nom, prenom, email, role, whatsapp, date_creation FROM Users');
    res.json(users);
  });

  // --- AUTRES ROUTES ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
    const user = rows;
    if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) return res.status(401).json({ error: 'Invalide' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user });
  });

  app.get('/api/games', async (req, res) => {
    const [games] = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
    res.json(games);
  });

  // --- SERVEUR STATIQUE ---
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port ${PORT}`));
}

startServer();
