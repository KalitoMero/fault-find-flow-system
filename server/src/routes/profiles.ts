import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, isAdmin, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/profiles
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows: profiles } = await query(`
      SELECT p.*, u.email FROM profiles p JOIN users u ON u.id = p.id ORDER BY p.name
    `);

    const { rows: roles } = await query('SELECT user_id, role FROM user_roles');

    const result = profiles.map(p => {
      const userRoles = roles.filter(r => r.user_id === p.id);
      return {
        ...p,
        roles: userRoles.map(r => r.role),
        isTeamLeader: userRoles.some(r => r.role === 'teamleader'),
        isAdmin: userRoles.some(r => r.role === 'admin')
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Profile' });
  }
});

// GET /api/profiles/by-department/:departmentId
router.get('/by-department/:departmentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT id, name, personal_number FROM profiles WHERE department_id = $1 ORDER BY name',
      [req.params.departmentId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Mitarbeiter' });
  }
});

// PUT /api/profiles/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id !== req.userId && !isAdmin(req)) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    const { name, personal_number, department_id, username } = req.body;
    const { rows } = await query(
      'UPDATE profiles SET name=$2, personal_number=$3, department_id=$4, username=$5 WHERE id=$1 RETURNING *',
      [req.params.id, name, personal_number || null, department_id || null, username || null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Profil nicht gefunden' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Profils' });
  }
});

// DELETE /api/profiles/:id (admin only - deletes user entirely)
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
  }
});

export default router;
