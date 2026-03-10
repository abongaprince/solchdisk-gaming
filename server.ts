import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('database.db');
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
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    prenom TEXT,
    email TEXT UNIQUE,
    whatsapp TEXT UNIQUE,
    mot_de_passe TEXT,
    ville TEXT,
    quartier TEXT,
    pays TEXT,
    role TEXT DEFAULT 'client',
    photo_profil TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    email TEXT UNIQUE,
    mot_de_passe TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT,
    description TEXT,
    prix INTEGER,
    image TEXT,
    cpu TEXT,
    gpu TEXT,
    ram TEXT,
    storage TEXT,
    os TEXT,
    directx TEXT,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    game_id INTEGER,
    disque_dur_option TEXT,
    livraison_societe TEXT,
    statut TEXT DEFAULT 'En attente',
    preuve_paiement TEXT,
    date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (game_id) REFERENCES Games(id)
  );

  CREATE TABLE IF NOT EXISTS Payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    montant INTEGER,
    numero_mobile TEXT,
    date_transaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(id)
  );

  CREATE TABLE IF NOT EXISTS PasswordResets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    token TEXT UNIQUE,
    expires_at TIMESTAMP,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Migrations: Ensure all columns exist in case the DB was created with an older schema ---
const addColumnIfNotExists = (tableName: string, columnName: string, columnType: string) => {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
  if (!tableInfo.some(col => col.name === columnName)) {
    console.log(`Migration: Adding column ${columnName} to table ${tableName}`);
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  }
};

// Games table migrations
['cpu', 'gpu', 'ram', 'storage', 'os', 'directx'].forEach(col => addColumnIfNotExists('Games', col, 'TEXT'));

// Users table migrations
['ville', 'quartier', 'pays', 'role', 'whatsapp', 'date_creation'].forEach(col => addColumnIfNotExists('Users', col, col === 'role' ? "TEXT DEFAULT 'client'" : (col === 'date_creation' ? "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" : 'TEXT')));

// --- Migration: Move Admins to Users table if they exist ---
const admins = db.prepare('SELECT * FROM Admins').all() as any[];
admins.forEach(admin => {
  const userExists = db.prepare('SELECT * FROM Users WHERE email = ?').get(admin.email);
  if (!userExists) {
    console.log(`Migration: Moving admin ${admin.email} to Users table`);
    db.prepare('INSERT INTO Users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)').run(admin.nom, admin.email, admin.mot_de_passe, 'admin');
  }
});

// Orders table migrations
['disque_dur_option', 'livraison_societe', 'preuve_paiement'].forEach(col => addColumnIfNotExists('Orders', col, 'TEXT'));

// Seed Admin if not exists
const adminEmail = 'Soppysolch002@gmail.com';
const adminPassword = 'Soppy2006';
const hashedAdminPw = bcrypt.hashSync(adminPassword, 10);

const adminExists = db.prepare('SELECT * FROM Users WHERE email = ?').get(adminEmail) as any;

if (!adminExists) {
  console.log('Seeding new admin...');
  db.prepare('INSERT INTO Users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)').run('Admin SolchDisk', adminEmail, hashedAdminPw, 'admin');
} else {
  console.log('Updating existing admin password...');
  db.prepare('UPDATE Users SET mot_de_passe = ?, role = ? WHERE email = ?').run(hashedAdminPw, 'admin', adminEmail);
}

// Seed some games if empty
const gamesCount = db.prepare('SELECT COUNT(*) as count FROM Games').get() as { count: number };
if (gamesCount.count === 0) {
  const sampleGames = [
    { titre: 'Cyberpunk 2077', prix: 45000, desc: 'Night City changes every body.', cpu: 'Intel Core i7-6700', gpu: 'RTX 3060', ram: '16GB', storage: '70GB SSD', os: 'Windows 10 64-bit', directx: 'DirectX 12', img: 'https://picsum.photos/seed/cyberpunk/800/600' },
    { titre: 'Elden Ring', prix: 55000, desc: 'Rise, Tarnished.', cpu: 'Intel Core i5-8400', gpu: 'GTX 1070', ram: '12GB', storage: '60GB', os: 'Windows 10', directx: 'DirectX 12', img: 'https://picsum.photos/seed/elden/800/600' },
  ];
  const insertGame = db.prepare('INSERT INTO Games (titre, prix, description, cpu, gpu, ram, storage, os, directx, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  sampleGames.forEach(g => insertGame.run(g.titre, g.prix, g.desc, g.cpu, g.gpu, g.ram, g.storage, g.os, g.directx, g.img));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- Auth Routes ---
  app.post('/api/register', async (req, res) => {
    const { nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays } = req.body;
    try {
      const hashedPw = bcrypt.hashSync(mot_de_passe, 10);
      const result = db.prepare('INSERT INTO Users (nom, prenom, email, whatsapp, mot_de_passe, ville, quartier, pays) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(nom, prenom, email, whatsapp, hashedPw, ville, quartier, pays);
      
      // Send Welcome Email
      await sendEmail(
        email,
        'Bienvenue chez SolchDisk Gaming !',
        `<h1>Bienvenue ${prenom} !</h1><p>Merci de vous être inscrit sur SolchDisk Gaming. Votre compte est maintenant actif.</p>`
      );

      res.status(201).json({ id: result.lastInsertRowid, message: 'Inscription réussie !' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, mot_de_passe } = req.body;
    // email parameter can be either email or whatsapp number
    const user = db.prepare('SELECT * FROM Users WHERE email = ? OR whatsapp = ?').get(email, email) as any;

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
  });

  app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT * FROM Users WHERE email = ?').get(email) as any;
    
    if (!user) {
      // For security, don't reveal if user exists or not
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare('INSERT INTO PasswordResets (email, token, expires_at) VALUES (?, ?, ?)').run(email, token, expiresAt);

    // Send Reset Email
    const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password/${token}`;
    await sendEmail(
      email,
      'Réinitialisation de votre mot de passe',
      `<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour continuer :</p><a href="${resetLink}">${resetLink}</a><p>Ce lien expirera dans 1 heure.</p>`
    );
    
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  });

  app.post('/api/reset-password', (req, res) => {
    const { token, mot_de_passe } = req.body;
    const reset = db.prepare('SELECT * FROM PasswordResets WHERE token = ? AND expires_at > ?').get(token, new Date().toISOString()) as any;

    if (!reset) {
      return res.status(400).json({ error: 'Lien invalide ou expiré' });
    }

    const hashedPw = bcrypt.hashSync(mot_de_passe, 10);
    db.prepare('UPDATE Users SET mot_de_passe = ? WHERE email = ?').run(hashedPw, reset.email);
    db.prepare('DELETE FROM PasswordResets WHERE email = ?').run(reset.email);

    res.json({ success: true });
  });

  // Keep old routes for backward compatibility or alias them
  app.post('/api/auth/register', (req, res) => res.redirect(307, '/api/register'));
  app.post('/api/auth/login', (req, res) => res.redirect(307, '/api/login'));
  app.post('/api/auth/forgot-password', (req, res) => res.redirect(307, '/api/forgot-password'));
  app.post('/api/auth/reset-password', (req, res) => res.redirect(307, '/api/reset-password'));

  // --- Games Routes ---
  app.get('/api/games', (req, res) => {
    const games = db.prepare('SELECT * FROM Games ORDER BY date_ajout DESC').all();
    res.json(games);
  });

  app.get('/api/games/:id', (req, res) => {
    const game = db.prepare('SELECT * FROM Games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: 'Jeu non trouvé' });
    res.json(game);
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

  app.get('/api/profile', authMiddleware, (req: any, res) => {
    const user = db.prepare('SELECT id, nom, prenom, email, whatsapp, role, ville, quartier, pays, photo_profil FROM Users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ user });
  });

  app.put('/api/profile', authMiddleware, (req: any, res) => {
    const { nom, prenom, whatsapp, ville, quartier, pays, photo_profil } = req.body;
    try {
      db.prepare('UPDATE Users SET nom = ?, prenom = ?, whatsapp = ?, ville = ?, quartier = ?, pays = ?, photo_profil = ? WHERE id = ?')
        .run(nom, prenom, whatsapp, ville, quartier, pays, photo_profil, req.user.id);
      
      const updatedUser = db.prepare('SELECT * FROM Users WHERE id = ?').get(req.user.id) as any;
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

  app.post('/api/games', authMiddleware, verifyRole('admin'), (req: any, res) => {
    const { titre, description, prix, cpu, gpu, ram, storage, os, directx, image } = req.body;
    const result = db.prepare('INSERT INTO Games (titre, description, prix, cpu, gpu, ram, storage, os, directx, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(titre, description, prix, cpu, gpu, ram, storage, os, directx, image);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.put('/api/games/:id', authMiddleware, verifyRole('admin'), (req: any, res) => {
    const { titre, description, prix, cpu, gpu, ram, storage, os, directx, image } = req.body;
    db.prepare('UPDATE Games SET titre = ?, description = ?, prix = ?, cpu = ?, gpu = ?, ram = ?, storage = ?, os = ?, directx = ?, image = ? WHERE id = ?').run(titre, description, prix, cpu, gpu, ram, storage, os, directx, image, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/games/:id', authMiddleware, verifyRole('admin'), (req: any, res) => {
    db.prepare('DELETE FROM Games WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Orders Routes ---
  app.post('/api/orders', authMiddleware, verifyRole('client'), (req: any, res) => {
    const { game_id, disque_dur_option, livraison_societe, preuve_paiement } = req.body;
    const result = db.prepare('INSERT INTO Orders (user_id, game_id, disque_dur_option, livraison_societe, preuve_paiement) VALUES (?, ?, ?, ?, ?)').run(req.user.id, game_id, disque_dur_option, livraison_societe, preuve_paiement);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.get('/api/my-orders', authMiddleware, (req: any, res) => {
    const orders = db.prepare(`
      SELECT o.*, g.titre as game_title, g.image as game_image 
      FROM Orders o 
      LEFT JOIN Games g ON o.game_id = g.id 
      WHERE o.user_id = ? 
      ORDER BY o.date_commande DESC
    `).all(req.user.id);
    res.json(orders);
  });

  app.get('/api/admin/orders', authMiddleware, verifyRole('admin'), (req: any, res) => {
    const orders = db.prepare(`
      SELECT o.*, g.titre as game_title, 
             u.nom as user_nom, u.prenom as user_prenom, u.email as user_email, u.whatsapp as user_whatsapp,
             u.ville as user_ville, u.quartier as user_quartier, u.pays as user_pays
      FROM Orders o 
      LEFT JOIN Games g ON o.game_id = g.id 
      JOIN Users u ON o.user_id = u.id 
      ORDER BY o.date_commande DESC
    `).all();
    res.json(orders);
  });

  app.get('/api/admin/users', authMiddleware, verifyRole('admin'), (req: any, res) => {
    const users = db.prepare('SELECT id, nom, prenom, email, whatsapp, role, ville, quartier, pays, date_creation FROM Users ORDER BY date_creation DESC').all();
    res.json(users);
  });

  app.patch('/api/admin/orders/:id', authMiddleware, verifyRole('admin'), (req: any, res) => {
    const { statut } = req.body;
    db.prepare('UPDATE Orders SET statut = ? WHERE id = ?').run(statut, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/orders/:id', authMiddleware, (req: any, res) => {
    const order = db.prepare('SELECT * FROM Orders WHERE id = ?').get(req.params.id) as any;
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
    
    // Client can cancel their own pending order, Admin can delete any order
    if (req.user.role === 'admin') {
      db.prepare('DELETE FROM Orders WHERE id = ?').run(req.params.id);
      return res.json({ success: true });
    }

    if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
    if (order.statut !== 'En attente') return res.status(400).json({ error: 'Impossible d\'annuler une commande déjà traitée' });
    
    db.prepare('DELETE FROM Orders WHERE id = ?').run(req.params.id);
    res.json({ success: true });
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
