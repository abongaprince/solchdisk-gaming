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

// Database connection pool
const db = process.env.MYSQL_URL 
  ? createPool(process.env.MYSQL_URL)
  : createPool({
      host: (process.env.DB_HOST || process.env.MYSQLHOST || 'localhost').trim(),
      user: (process.env.DB_USER || process.env.MYSQLUSER || 'root').trim(),
      password: (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '').trim(),
      database: (process.env.DB_NAME || process.env.MYSQLDATABASE || 'solchdisk_gaming').trim(),
      port: parseInt((process.env.DB_PORT || process.env.MYSQLPORT || '3306').trim()),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

const JWT_SECRET = process.env.JWT_SECRET || 'solchdisk-gaming-secret-key-2024';

// Email Transporter (Lazy Initialization)
let transporter: any = null;

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
    console.log('Email skipped: SMTP credentials not fully configured (USER, PASS, or HOST missing).');
    return;
  }

  if (!transporter) {
    console.log(`Initializing SMTP transporter with host: ${process.env.SMTP_HOST}, port: ${process.env.SMTP_PORT}, user: ${process.env.SMTP_USER}`);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        // Do not fail on invalid certs (common with some SMTP providers)
        rejectUnauthorized: false
      }
    });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'SolchDisk Gaming <no-reply@solchdisk.com>',
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error: any) {
    if (error.code === 'EAUTH') {
      console.error('SMTP Authentication Error: The username or password was rejected.');
      console.error('IMPORTANT: If you are using Gmail, you MUST use an "App Password", not your regular password.');
      console.error('Visit https://myaccount.google.com/apppasswords to generate one.');
    } else {
      console.error('Error sending email:', error);
    }
  }
}

// Initialize Database
async function initDatabase() {
  const hasConfig = (process.env.DB_HOST || process.env.MYSQLHOST) && 
                    (process.env.DB_USER || process.env.MYSQLUSER) && 
                    (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD);

  if (!hasConfig) {
    console.error('CRITICAL: Database environment variables are missing!');
    console.error('Please set DB_HOST, DB_USER, DB_PASSWORD (or use Railway MySQL variables) in the Settings menu.');
    return;
  }

  try {
    // Test connection
    console.log('Attempting to connect to database...');
    const connection = await db.getConnection();
    console.log('✅ Successfully connected to the database.');
    connection.release();

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
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES Games(id) ON DELETE SET NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        montant INT,
        numero_mobile VARCHAR(20),
        date_transaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS PasswordResets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(150),
        token VARCHAR(255) UNIQUE,
        expires_at DATETIME,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Admin if not exists
    const adminEmail = 'Soppysolch002@gmail.com';
    const adminPassword = 'Soppy2006';
    const hashedAdminPw = bcrypt.hashSync(adminPassword, 10);

    const [adminRows]: any = await db.execute('SELECT * FROM Users WHERE email = ?', [adminEmail]);

    if (adminRows.length === 0) {
      console.log('Seeding new admin...');
      await db.execute(
        'INSERT INTO Users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
        ['Admin SolchDisk', adminEmail, hashedAdminPw, 'admin']
      );
    } else {
      console.log('Updating existing admin password...');
      await db.execute(
        'UPDATE Users SET mot_de_passe = ?, role = ? WHERE email = ?',
        [hashedAdminPw, 'admin', adminEmail]
      );
    }

    // Seed some games if empty
    const [gamesCountRows]: any = await db.execute('SELECT COUNT(*) as count FROM Games');
    if (gamesCountRows[0].count === 0) {
      const sampleGames = [
        { titre: 'Cyberpunk 2077', prix: 45000, desc: 'Night City changes every body.', cpu: 'Intel Core i7-6700', gpu: 'RTX 3060', ram: '16GB', storage: '70GB SSD', os: 'Windows 10 64-bit', directx: 'DirectX 12', img: 'https://picsum.photos/seed/cyberpunk/800/600' },
        { titre: 'Elden Ring', prix: 55000, desc: 'Rise, Tarnished.', cpu: 'Intel Core i5-8400', gpu: 'GTX 1070', ram: '12GB', storage: '60GB', os: 'Windows 10', directx: 'DirectX 12', img: 'https://picsum.photos/seed/elden/800/600' },
      ];
      for (const g of sampleGames) {
        await db.execute(
          'INSERT INTO Games (titre, prix, description, cpu, gpu, ram, storage, os, directx, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [g.titre, g.prix, g.desc, g.cpu, g.gpu, g.ram, g.storage, g.os, g.directx, g.img]
        );
      }
    }
  } catch (error: any) {
    console.error('Database initialization error:', error);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('IMPORTANT: Access denied. Please check:');
      console.error('1. Your DB_USER and DB_PASSWORD are correct.');
      console.error('2. Your DB_HOST and DB_PORT are correct (Public proxy vs Private network).');
      console.error('3. If using Railway, ensure "Allow Public Connections" is enabled in your database settings.');
    }
  }
}

async function startServer() {
  await initDatabase();
  const app = express();
  
  // Security and Performance Middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https:", "http:"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "connect-src": ["'self'", "https:", "http:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- Auth Routes ---
  app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays } = req.body;
    try {
      const hashedPw = bcrypt.hashSync(mot_de_passe, 10);
      const [result]: any = await db.execute(
        'INSERT INTO Users (nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nom, prenom, email, whatsapp, hashedPw, ville, quartier, pays]
      );
      
      // Send Welcome Email
      await sendEmail(
        email,
        'Bienvenue chez SolchDisk Gaming !',
        `<h1>Bienvenue ${prenom} !</h1><p>Merci de vous être inscrit sur SolchDisk Gaming. Votre compte est maintenant actif.</p>`
      );

      res.status(201).json({ id: result.insertId, message: 'Inscription réussie !' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    try {
      // email parameter can be either email or whatsapp number
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ? OR whatsapp = ?', [email, email]);
      const user = rows[0];

      if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe)) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      
      // Optional: Send Login Notification Email
      await sendEmail(
        user.email,
        'Nouvelle connexion détectée',
        `<p>Bonjour ${user.prenom}, une nouvelle connexion à votre compte SolchDisk Gaming a été effectuée le ${new Date().toLocaleString()}.</p>`
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          nom: user.nom, 
          prenom: user.prenom,
          email: user.email, 
          whatsapp: user.whatsapp,
          role: user.role,
          ville: user.ville,
          quartier: user.quartier,
          pays: user.pays,
          photo_profil: user.photo_profil
        },
        message: 'Connexion réussie !'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
      const user = rows[0];
      
      if (!user) {
        // For security, don't reveal if user exists or not
        return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' '); // MySQL format

      await db.execute('INSERT INTO PasswordResets (email, token, expires_at) VALUES (?, ?, ?)', [email, token, expiresAt]);

      // Send Reset Email
      const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password/${token}`;
      await sendEmail(
        email,
        'Réinitialisation de votre mot de passe',
        `<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour continuer :</p><a href="${resetLink}">${resetLink}</a><p>Ce lien expirera dans 1 heure.</p>`
      );
      
      res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/reset-password', async (req, res) => {
    const { token, mot_de_passe } = req.body;
    try {
      const [rows]: any = await db.execute('SELECT * FROM PasswordResets WHERE token = ? AND expires_at > ?', [token, new Date().toISOString().slice(0, 19).replace('T', ' ')]);
      const reset = rows[0];

      if (!reset) {
        return res.status(400).json({ error: 'Lien invalide ou expiré' });
      }

      const hashedPw = bcrypt.hashSync(mot_de_passe, 10);
      await db.execute('UPDATE Users SET mot_de_passe = ? WHERE email = ?', [hashedPw, reset.email]);
      await db.execute('DELETE FROM PasswordResets WHERE email = ?', [reset.email]);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Keep old routes for backward compatibility or alias them
  app.post('/api/auth/register', (req, res) => res.redirect(307, '/api/register'));
  app.post('/api/auth/login', (req, res) => res.redirect(307, '/api/login'));
  app.post('/api/auth/forgot-password', (req, res) => res.redirect(307, '/api/forgot-password'));
  app.post('/api/auth/reset-password', (req, res) => res.redirect(307, '/api/reset-password'));

  // --- Games Routes ---
  app.get('/api/games', async (req, res) => {
    try {
      const [games]: any = await db.query('SELECT * FROM Games ORDER BY date_ajout DESC');
      res.json(games);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/games/:id', async (req, res) => {
    try {
      const [rows]: any = await db.execute('SELECT * FROM Games WHERE id = ?', [req.params.id]);
      const game = rows[0];
      if (!game) return res.status(404).json({ error: 'Jeu non trouvé' });
      res.json(game);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin middleware
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Non autorisé' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Token invalide' });
    }
  };

  app.get('/api/profile', authMiddleware, async (req: any, res) => {
    try {
      const [rows]: any = await db.execute('SELECT id, nom, prenom, email, whatsapp, role, ville, quartier, pays, photo_profil FROM Users WHERE id = ?', [req.user.id]);
      const user = rows[0];
      if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
      res.json({ user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/profile', authMiddleware, async (req: any, res) => {
    const { nom, prenom, whatsapp, ville, quartier, pays, photo_profil } = req.body;
    try {
      await db.execute(
        'UPDATE Users SET nom = ?, prenom = ?, whatsapp = ?, ville = ?, quartier = ?, pays = ?, photo_profil = ? WHERE id = ?',
        [nom, prenom, whatsapp, ville, quartier, pays, photo_profil, req.user.id]
      );
      
      const [rows]: any = await db.execute('SELECT * FROM Users WHERE id = ?', [req.user.id]);
      const updatedUser = rows[0];
      res.json({
        user: {
          id: updatedUser.id,
          nom: updatedUser.nom,
          prenom: updatedUser.prenom,
          email: updatedUser.email,
          whatsapp: updatedUser.whatsapp,
          role: updatedUser.role,
          ville: updatedUser.ville,
          quartier: updatedUser.quartier,
          pays: updatedUser.pays,
          photo_profil: updatedUser.photo_profil
        }
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Role verification middleware
  const verifyRole = (requiredRole: 'client' | 'admin') => {
    return (req: any, res: any, next: any) => {
      if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
      
      // Support legacy tokens with isAdmin property
      const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'client');
      
      if (userRole !== requiredRole) {
        console.log(`Access denied: User role is ${userRole}, required is ${requiredRole}`);
        return res.status(403).json({ error: 'Accès refusé' });
      }
      next();
    };
  };

  app.post('/api/games', authMiddleware, verifyRole('admin'), async (req: any, res) => {
    const { titre, description, prix, cpu, gpu, ram, storage, os, directx, image } = req.body;
    try {
      const [result]: any = await db.execute(
        'INSERT INTO Games (titre, description, prix, cpu, gpu, ram, storage, os, directx, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [titre, description, prix, cpu, gpu, ram, storage, os, directx, image]
      );
      res.status(201).json({ id: result.insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/games/:id', authMiddleware, verifyRole('admin'), async (req: any, res) => {
    const { titre, description, prix, cpu, gpu, ram, storage, os, directx, image } = req.body;
    try {
      await db.execute(
        'UPDATE Games SET titre = ?, description = ?, prix = ?, cpu = ?, gpu = ?, ram = ?, storage = ?, os = ?, directx = ?, image = ? WHERE id = ?',
        [titre, description, prix, cpu, gpu, ram, storage, os, directx, image, req.params.id]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/games/:id', authMiddleware, verifyRole('admin'), async (req: any, res) => {
    try {
      await db.execute('DELETE FROM Games WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Orders Routes ---
  app.post('/api/orders', authMiddleware, verifyRole('client'), async (req: any, res) => {
    const { game_id, disque_dur_option, livraison_societe, preuve_paiement, games_list } = req.body;
    try {
      const [result]: any = await db.execute(
        'INSERT INTO Orders (user_id, game_id, disque_dur_option, livraison_societe, preuve_paiement, games_list) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, game_id, disque_dur_option, livraison_societe, preuve_paiement, games_list]
      );
      res.status(201).json({ id: result.insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/my-orders', authMiddleware, async (req: any, res) => {
    try {
      const [orders]: any = await db.execute(`
        SELECT o.*, g.titre as game_title, g.image as game_image 
        FROM Orders o 
        LEFT JOIN Games g ON o.game_id = g.id 
        WHERE o.user_id = ? 
        ORDER BY o.date_commande DESC
      `, [req.user.id]);
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/orders', authMiddleware, verifyRole('admin'), async (req: any, res) => {
    try {
      const [orders]: any = await db.query(`
        SELECT o.*, g.titre as game_title, 
               u.nom as user_nom, u.prenom as user_prenom, u.email as user_email, u.whatsapp as user_whatsapp,
               u.ville as user_ville, u.quartier as user_quartier, u.pays as user_pays
        FROM Orders o 
        LEFT JOIN Games g ON o.game_id = g.id 
        JOIN Users u ON o.user_id = u.id 
        ORDER BY o.date_commande DESC
      `);
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/users', authMiddleware, verifyRole('admin'), async (req: any, res) => {
    try {
      const [users]: any = await db.query('SELECT id, nom, prenom, email, whatsapp, role, ville, quartier, pays, date_creation FROM Users ORDER BY date_creation DESC');
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/orders/:id', authMiddleware, verifyRole('admin'), async (req: any, res) => {
    const { statut } = req.body;
    try {
      await db.execute('UPDATE Orders SET statut = ? WHERE id = ?', [statut, req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/orders/:id', authMiddleware, async (req: any, res) => {
    try {
      const [rows]: any = await db.execute('SELECT * FROM Orders WHERE id = ?', [req.params.id]);
      const order = rows[0];
      if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
      
      // Client can cancel their own pending order (marks as 'Annulée'), Admin can hard delete
      if (req.user.role === 'admin') {
        await db.execute('DELETE FROM Orders WHERE id = ?', [req.params.id]);
        return res.json({ success: true });
      }

      if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
      if (order.statut !== 'En attente') return res.status(400).json({ error: 'Impossible d\'annuler une commande déjà traitée' });
      
      await db.execute("UPDATE Orders SET statut = 'Annulée' WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
