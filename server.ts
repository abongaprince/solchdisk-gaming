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
const db = createPool(process.env.MYSQL_URL || {
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'solchdisk_gaming',
  port: parseInt(process.env.MYSQLPORT || '3306'),
});

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_tres_long_et_sur';

async function startServer() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // Middleware de vérification
  const checkAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ');
    if (!token) return res.status(401).json({ error: 'Auth requise' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) { res.status(401).json({ error: 'Session expirée' }); }
  };

  // --- ROUTES ADMIN (CORRIGÉES POUR ÉVITER L'ÉCRAN NOIR) ---

  // 1. Stats du Dashboard
  app.get('/api/admin/stats', checkAuth, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    try {
      const [[g], [o], [u]]: any = await Promise.all([
        db.query('SELECT COUNT(*) as c FROM Games'),
        db.query('SELECT COUNT(*) as c FROM Orders'),
        db.query('SELECT COUNT(*) as c FROM Users')
      ]);
      res.json({ games: g.c, orders: o.c, users: u.c });
    } catch (e) { res.json({ games: 0, orders: 0, users: 0 }); } // Renvoie 0 au lieu de crash
  });

  // 2. Liste des commandes (Le fix du .map est ici)
  app.get('/api/admin/orders', checkAuth, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    try {
      const [orders]: any = await db.query(`
        SELECT o.*, u.nom, u.prenom, u.email 
        FROM Orders o 
        JOIN Users u ON o.user_id = u.id 
        ORDER BY o.date_commande DESC
      `);
      
      const formatted = orders.map((o: any) => ({
        ...o,
        // Force games_list à être un tableau pour que React puisse faire .map()
        games_list: typeof o.games_list === 'string' ? JSON.parse(o.games_list) : (o.games_list || [])
      }));
      res.json(formatted);
    } catch (e) { res.json([]); } // Renvoie liste vide au lieu de crash
  });

  // --- LE RESTE DES ROUTES ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
    const user = rows;
    if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
      return res.status(401).json({ error: 'Invalide' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user });
  });

  // Frontend
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => console.log(`Serveur OK sur port ${PORT}`));
}

startServer();
