import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, personalNumber } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, Passwort und Name sind erforderlich' });
    }

    // Prüfen ob User existiert
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email bereits registriert' });
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(password, 12);

    // User erstellen
    const userResult = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash]
    );
    const userId = userResult.rows[0].id;

    // Profil erstellen
    await query(
      'INSERT INTO profiles (id, name, personal_number) VALUES ($1, $2, $3)',
      [userId, name, personalNumber || null]
    );

    // Standard-Rolle zuweisen
    await query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [userId, 'employee']
    );

    // Token erstellen
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, email, name }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
    }

    // User suchen
    const userResult = await query(
      'SELECT u.id, u.email, u.password_hash, p.name FROM users u JOIN profiles p ON p.id = u.id WHERE u.email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const user = userResult.rows[0];

    // Passwort prüfen
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Rollen laden
    const rolesResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [user.id]
    );
    const roles = rolesResult.rows.map(r => r.role);

    // Token erstellen
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
  }
});

// POST /api/auth/login-with-credential (Personalnummer + Name)
router.post('/login-with-credential', async (req: Request, res: Response) => {
  try {
    const { personalNumber, name } = req.body;

    if (!personalNumber || !name) {
      return res.status(400).json({ error: 'Personalnummer und Name sind erforderlich' });
    }

    const result = await query(
      `SELECT u.id, u.email, p.name FROM users u 
       JOIN profiles p ON p.id = u.id 
       WHERE p.personal_number = $1 AND LOWER(p.name) = LOWER($2)`,
      [personalNumber, name]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const user = result.rows[0];

    const rolesResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [user.id]
    );
    const roles = rolesResult.rows.map(r => r.role);

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, roles }
    });
  } catch (error: any) {
    console.error('Credential login error:', error);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, p.name, p.personal_number, p.department_id, p.username
       FROM users u JOIN profiles p ON p.id = u.id WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json({
      user: result.rows[0],
      roles: req.userRoles
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Profils' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen lang sein' });
    }

    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    if (currentPassword) {
      const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
  }
});

export default router;
