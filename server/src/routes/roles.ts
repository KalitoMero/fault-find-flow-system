import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// POST /api/roles
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.body;
    await query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT (user_id, role) DO NOTHING',
      [userId, role]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Hinzufügen der Rolle' });
  }
});

// DELETE /api/roles
router.delete('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.body;
    await query('DELETE FROM user_roles WHERE user_id = $1 AND role = $2', [userId, role]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Entfernen der Rolle' });
  }
});

export default router;
