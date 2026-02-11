import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM machines ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Maschinen' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const { rows } = await query('INSERT INTO machines (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Maschine' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM machines WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Maschine' });
  }
});

export default router;
