import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/departments
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM departments ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Abteilungen' });
  }
});

// POST /api/departments
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, code } = req.body;
    const { rows } = await query(
      'INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *',
      [name, code || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Abteilung' });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Abteilung' });
  }
});

export default router;
