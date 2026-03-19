import express from 'express';
import { createServer as createViteServer } from 'vite';
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

// --- CONFIGURATION BDD ---
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

  // --- MIDDLEWARE AUTH ---
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ');
    if (!token) return res.status(401).json({ error: 'Non autorisé' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Session expirée' });
    }
  };

  // --- INSCRIPTION (HASHAGE PROPRE) ---
  app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays } = req.body;
    try {
      // On génère un sel et on hache le mot de passe
      const salt = bcrypt.genSaltSync(10);
      const hashedPw = bcrypt.hashSync(mot_de_passe, salt);

      const [result]: any = await db.execute(
        'INSERT INTO Users (nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nom, prenom, email, whatsapp, hashedPw, ville, quartier, pays, 'client']
      );

      res.status(201).json({ id: result.insertId, message: 'Inscription réussie !' });
    } catch (e: any) {
      res.status(400).json({ error: "L'email ou le numéro WhatsApp existe déjà." });
    }
  });

  // --- CONNEXION (FIX BLOB & ROWS) ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute(
        'SELECT * FROM Users WHERE email = ? OR whatsapp = ?', 
        [email, email]
      );
      
      const user = rows; // Correction : on prend le premier élément du tableau

      if (!user) {
        return res.status(401).json({ error: 'Utilisateur non trouvé' });
      }

      // FIX CRITIQUE : Conversion du BLOB de Railway en texte pour Bcrypt
      const storedHash = user.mot_de_passe.toString();

      const isMatch = bcrypt.compareSync(mot_de_passe, storedHash);
      
      if (!isMatch) {
        return res.status(401).json({ error: 'Mot de passe incorrect' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );

      // On renvoie l'utilisateur sans le mot de passe
      const { mot_de_passe: _, ...userSafe } = user;
      res.json({ 
        token, 
        user: userSafe, 
        message: 'Connexion réussie !' 
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ADMIN : STATS ---
  app.get('/api/admin/stats', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
    try {
      const [g]: any = await db.query('SELECT COUNT(*) as c FROM Games');
      const [o]: any = await db.query('SELECT COUNT(*) as c FROM Orders');
      const [u]: any = await db.query('SELECT COUNT(*) as c FROM Users');
      
      res.json({
        games: g.c,
        orders: o.c,
        users: u.c
      });
    } catch (e) {
      res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur SolchDisk Gaming opérationnel sur le port ${PORT}`);
  });
}

startServer().catch(err => console.error("Erreur de démarrage :", err));
