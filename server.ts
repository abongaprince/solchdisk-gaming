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

// 1. CONFIGURATION BDD (Unifiée pour Railway)
const db = createPool(process.env.MYSQL_URL || {
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'solchdisk_gaming',
  port: parseInt(process.env.MYSQLPORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

async function startServer() {
  const app = express();
  
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // --- MIDDLEWARE AUTHENTIFICATION ---
  const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    const token = authHeader.split(' ');
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Session expirée' });
    }
  };

  // --- AUTH : INSCRIPTION ---
  app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays } = req.body;
    try {
      const salt = bcrypt.genSaltSync(10);
      const hashedPw = bcrypt.hashSync(mot_de_passe, salt);

      const [result]: any = await db.execute(
        'INSERT INTO Users (nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nom, prenom, email, whatsapp, hashedPw, ville, quartier, pays, 'client']
      );
      res.status(201).json({ id: result.insertId });
    } catch (e: any) {
      res.status(400).json({ error: "Email ou WhatsApp déjà utilisé" });
    }
  });

  // --- AUTH : CONNEXION (SOLUTIONS ANTI-ÉCRAN NOIR) ---
  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      
      // 1. Vérifier si l'utilisateur existe
      if (!rows || rows.length === 0) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const user = rows;

      // 2. Gérer le type BLOB de Railway pour le mot de passe
      const storedHash = user.mot_de_passe.toString();

      // 3. Comparaison Bcrypt
      if (!bcrypt.compareSync(mot_de_passe, storedHash)) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // 4. Génération du Token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 5. Envoyer un objet utilisateur PROPRE (sans le mot de passe)
      // On s'assure que les champs ne sont pas undefined pour éviter le crash React
      const userResponse = {
        id: user.id,
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email,
        role: user.role || 'client',
        whatsapp: user.whatsapp || '',
        photo_profil: user.photo_profil || null
      };

      res.json({ token, user: userResponse });
    } catch (e: any) {
      console.error("Login Error:", e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // --- ADMIN : STATS (L'AUTRE CAUSE DE L'ÉCRAN NOIR) ---
  app.get('/api/admin/stats', authMiddleware, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Interdit' });
    try {
      // On utilise des requêtes simples pour garantir le format
      const [g]: any = await db.query('SELECT COUNT(*) as c FROM Games');
      const [o]: any = await db.query('SELECT COUNT(*) as c FROM Orders');
      const [u]: any = await db.query('SELECT COUNT(*) as c FROM Users');
      
      // Réponse exacte attendue par le Dashboard
      res.json({
        games: g.c || 0,
        orders: o.c || 0,
        users: u.c || 0
      });
    } catch (e) {
      res.json({ games: 0, orders: 0, users: 0 }); // Fallback pour éviter le crash
    }
  });

  // --- JEUX ---
  app.get('/api/games', async (req, res) => {
    try {
      const [games] = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
      res.json(games);
    } catch (e) {
      res.json([]);
    }
  });

  // --- SERVEUR STATIQUE ---
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SolchDisk Running on port ${PORT}`);
  });
}

startServer();
