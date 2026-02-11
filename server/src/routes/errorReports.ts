import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, isAdmin, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/error-reports
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const admin = isAdmin(req);
    const isManagement = req.userRoles?.includes('management');
    const isTeamleader = req.userRoles?.includes('teamleader');

    let sql = `SELECT er.*, p_approver.name as approver_name 
               FROM error_reports er
               LEFT JOIN profiles p_approver ON p_approver.id = COALESCE(er.approved_by_id, er.rejected_by_id)`;
    const params: any[] = [];

    if (admin || isManagement) {
      // Alle Reports sehen
      sql += ' ORDER BY er.created_at DESC';
    } else if (isTeamleader) {
      // Zugewiesene + eigene Reports
      sql += ` WHERE er.assigned_team_leader_id = $1 OR er.creator_id = $1 OR er.approval_status = 'approved'
               ORDER BY er.created_at DESC`;
      params.push(req.userId);
    } else {
      // Nur eigene + genehmigte
      sql += ` WHERE er.creator_id = $1 OR er.approval_status = 'approved'
               ORDER BY er.created_at DESC`;
      params.push(req.userId);
    }

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Berichte' });
  }
});

// GET /api/error-reports/for-teamleader
router.get('/for-teamleader', authenticate, requireRole('teamleader', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Ressourcen des Teamleiters
    const resourcesResult = await query(
      'SELECT resource_name FROM teamleader_resources WHERE teamleader_id = $1',
      [req.userId]
    );
    const resources = resourcesResult.rows.map(r => r.resource_name);

    // Department des Teamleiters
    const profileResult = await query(
      'SELECT department_id FROM profiles WHERE id = $1',
      [req.userId]
    );
    const departmentId = profileResult.rows[0]?.department_id;

    // Stellvertreter
    const deputyResult = await query(
      'SELECT deputy_id FROM deputy_assignments WHERE team_leader_id = $1 AND is_active = true',
      [req.userId]
    );
    const deputyIds = deputyResult.rows.map(d => d.deputy_id);

    // Query bauen
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (resources.length > 0) {
      conditions.push(`er.resource_name = ANY($${paramIdx})`);
      params.push(resources);
      paramIdx++;
    }

    if (departmentId) {
      conditions.push(`er.department_id = $${paramIdx}`);
      params.push(departmentId);
      paramIdx++;
    }

    conditions.push(`er.assigned_team_leader_id = $${paramIdx}`);
    params.push(req.userId);
    paramIdx++;

    if (deputyIds.length > 0) {
      conditions.push(`er.assigned_team_leader_id = ANY($${paramIdx})`);
      params.push(deputyIds);
      paramIdx++;
    }

    const sql = `SELECT er.*, p_approver.name as approver_name 
                 FROM error_reports er
                 LEFT JOIN profiles p_approver ON p_approver.id = COALESCE(er.approved_by_id, er.rejected_by_id)
                 WHERE ${conditions.join(' OR ')}
                 ORDER BY er.created_at DESC`;

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching teamleader reports:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Berichte' });
  }
});

// GET /api/error-reports/next-id
router.get('/next-id', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT id FROM error_reports');
    let highestId = 0;
    rows.forEach(row => {
      const num = parseInt(row.id);
      if (!isNaN(num) && num > highestId) highestId = num;
    });
    res.json({ nextId: (highestId + 1).toString() });
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler beim Generieren der ID' });
  }
});

// GET /api/error-reports/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT er.*, p_approver.name as approver_name 
       FROM error_reports er
       LEFT JOIN profiles p_approver ON p_approver.id = COALESCE(er.approved_by_id, er.rejected_by_id)
       WHERE er.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Bericht nicht gefunden' });
    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler beim Laden des Berichts' });
  }
});

// POST /api/error-reports
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const r = req.body;
    const { rows } = await query(
      `INSERT INTO error_reports (
        id, order_number, afo_number, machine_id, defective_quantity, total_defective_quantity,
        quantity_type, detection_location, problem_description, error_cause, corrective_action,
        creator_id, creator_name, personal_number, approval_status, assigned_team_leader_id,
        department_id, additional_info, additional_excel_data, resource_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [
        r.id, r.order_number, r.afo_number, r.machine_id || null,
        r.defective_quantity, r.total_defective_quantity,
        r.quantity_type || null, r.detection_location || null,
        r.problem_description, r.error_cause, r.corrective_action,
        req.userId, r.creator_name, r.personal_number || null,
        r.approval_status || 'pending', r.assigned_team_leader_id || null,
        r.department_id || null, r.additional_info || null,
        r.additional_excel_data ? JSON.stringify(r.additional_excel_data) : null,
        r.resource_name || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Berichts' });
  }
});

// PUT /api/error-reports/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const r = req.body;
    const { rows } = await query(
      `UPDATE error_reports SET
        order_number=$2, afo_number=$3, machine_id=$4, defective_quantity=$5,
        total_defective_quantity=$6, quantity_type=$7, detection_location=$8,
        problem_description=$9, error_cause=$10, corrective_action=$11,
        creator_name=$12, personal_number=$13, approval_status=$14,
        rejection_reason=$15, assigned_team_leader_id=$16, approved_by_id=$17,
        approved_at=$18, rejected_by_id=$19, rejected_at=$20, department_id=$21,
        additional_info=$22, additional_excel_data=$23, resource_name=$24,
        edited_at=$25, edited_by_id=$26
      WHERE id=$1 RETURNING *`,
      [
        req.params.id, r.order_number, r.afo_number, r.machine_id || null,
        r.defective_quantity, r.total_defective_quantity,
        r.quantity_type || null, r.detection_location || null,
        r.problem_description, r.error_cause, r.corrective_action,
        r.creator_name, r.personal_number || null, r.approval_status,
        r.rejection_reason || null, r.assigned_team_leader_id || null,
        r.approved_by_id || null, r.approved_at || null,
        r.rejected_by_id || null, r.rejected_at || null, r.department_id || null,
        r.additional_info || null,
        r.additional_excel_data ? JSON.stringify(r.additional_excel_data) : null,
        r.resource_name || null, r.edited_at || null, r.edited_by_id || null
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Bericht nicht gefunden' });
    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Berichts' });
  }
});

// PATCH /api/error-reports/:id/status
router.patch('/:id/status', authenticate, requireRole('teamleader', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, rejectionReason } = req.body;
    const updateData: any = { approval_status: status, rejection_reason: rejectionReason || null };

    if (status === 'approved') {
      updateData.approved_by_id = req.userId;
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_by_id = req.userId;
      updateData.rejected_at = new Date().toISOString();
    }

    const { rows } = await query(
      `UPDATE error_reports SET approval_status=$2, rejection_reason=$3,
       approved_by_id=$4, approved_at=$5, rejected_by_id=$6, rejected_at=$7
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, updateData.approval_status, updateData.rejection_reason,
        updateData.approved_by_id || null, updateData.approved_at || null,
        updateData.rejected_by_id || null, updateData.rejected_at || null
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Bericht nicht gefunden' });
    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
});

// DELETE /api/error-reports/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const admin = isAdmin(req);
    let sql = 'DELETE FROM error_reports WHERE id = $1';
    const params: any[] = [req.params.id];

    if (!admin) {
      // Teamleader können nur abgelehnte löschen
      sql += ` AND assigned_team_leader_id = $2 AND approval_status = 'rejected'`;
      params.push(req.userId);
    }

    const result = await query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Bericht nicht gefunden oder keine Berechtigung' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler beim Löschen des Berichts' });
  }
});

// GET /api/error-reports/search/order/:term
router.get('/search/order/:term', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const normalized = req.params.term.replace(/\s+/g, '').trim();
    const { rows } = await query(
      `SELECT * FROM error_reports WHERE REPLACE(order_number, ' ', '') ILIKE $1 ORDER BY created_at DESC`,
      [`%${normalized}%`]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Suchfehler' });
  }
});

// GET /api/error-reports/statistics
router.get('/statistics/overview', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE approval_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected
      FROM error_reports
    `);
    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

export default router;
