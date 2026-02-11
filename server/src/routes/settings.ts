import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/settings/:key
router.get('/:key', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM app_settings WHERE key = $1', [req.params.key]);
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Einstellung' });
  }
});

// PUT /api/settings/:key
router.put('/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { value } = req.body;
    await query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [req.params.key, value]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellung' });
  }
});

// DELETE /api/settings/:key
router.delete('/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM app_settings WHERE key = $1', [req.params.key]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Einstellung' });
  }
});

// === DEPUTY ASSIGNMENTS ===

// GET /api/settings/deputies/list
router.get('/deputies/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT da.*, p_leader.name as leader_name, p_deputy.name as deputy_name
       FROM deputy_assignments da
       LEFT JOIN profiles p_leader ON p_leader.id = da.team_leader_id
       LEFT JOIN profiles p_deputy ON p_deputy.id = da.deputy_id
       WHERE da.team_leader_id = $1 OR da.deputy_id = $1 OR $2`,
      [req.userId, req.userRoles?.includes('admin') || false]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Stellvertretungen' });
  }
});

// === TEAMLEADER RESOURCES ===

// GET /api/settings/resources/:teamleaderId
router.get('/resources/:teamleaderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT * FROM teamleader_resources WHERE teamleader_id = $1',
      [req.params.teamleaderId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Ressourcen' });
  }
});

export default router;
