import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/settings/:key
router.get('/:key', authenticate, async (req: AuthRequest, res: Response) => {
  // Skip special routes handled below
  if (['n8n', 'deputies', 'resources'].includes(req.params.key)) return;
  try {
    const { rows } = await query('SELECT * FROM app_settings WHERE key = $1', [req.params.key]);
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Einstellung' });
  }
});

// PUT /api/settings/:key
router.put('/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  if (['n8n', 'deputies', 'resources'].includes(req.params.key)) return;
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

// === N8N SETTINGS ===

// GET /api/settings/n8n
router.get('/n8n', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT * FROM n8n_settings WHERE user_id = $1 OR user_id IS NULL ORDER BY user_id DESC NULLS LAST LIMIT 1',
      [req.userId]
    );
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der N8N-Einstellungen' });
  }
});

// PUT /api/settings/n8n
router.put('/n8n', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { webhook_url, is_enabled } = req.body;
    const existing = await query('SELECT id FROM n8n_settings WHERE user_id = $1', [req.userId]);
    if (existing.rows.length > 0) {
      await query(
        'UPDATE n8n_settings SET webhook_url = $1, is_enabled = $2 WHERE user_id = $3',
        [webhook_url, is_enabled, req.userId]
      );
    } else {
      await query(
        'INSERT INTO n8n_settings (user_id, webhook_url, is_enabled) VALUES ($1, $2, $3)',
        [req.userId, webhook_url, is_enabled]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der N8N-Einstellungen' });
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

// PUT /api/settings/deputies
router.put('/deputies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { deputyId } = req.body;
    await query(
      'UPDATE deputy_assignments SET is_active = false WHERE team_leader_id = $1',
      [req.userId]
    );
    if (deputyId) {
      await query(
        'INSERT INTO deputy_assignments (team_leader_id, deputy_id, is_active) VALUES ($1, $2, true)',
        [req.userId, deputyId]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Stellvertretung' });
  }
});

// === TEAMLEADER RESOURCES ===

// GET /api/settings/resources/by-resource/:name
router.get('/resources/by-resource/:name', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT * FROM teamleader_resources WHERE LOWER(resource_name) = LOWER($1)',
      [req.params.name]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Suchen der Ressource' });
  }
});

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

// PUT /api/settings/resources/:teamleaderId
router.put('/resources/:teamleaderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { resources } = req.body;
    const teamleaderId = req.params.teamleaderId;
    await query('DELETE FROM teamleader_resources WHERE teamleader_id = $1', [teamleaderId]);
    for (const name of resources) {
      await query(
        'INSERT INTO teamleader_resources (teamleader_id, resource_name) VALUES ($1, $2)',
        [teamleaderId, name]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Ressourcen' });
  }
});

export default router;
