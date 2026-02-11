import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/excel/settings
router.get('/settings', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM excel_settings LIMIT 1');
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Excel-Einstellungen' });
  }
});

// POST /api/excel/search
router.post('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderNumber, afoNumber, orderColumn, afoColumn, articleColumn, articleDescColumn, departmentColumn, resourceColumn, additionalColumns } = req.body;

    // Normalisierung
    const normOrder = orderNumber.replace(/-/g, '').replace(/\s/g, '').trim();
    const normAfo = afoNumber.replace(/-/g, '').replace(/\s/g, '').trim();

    const { rows } = await query(
      `SELECT * FROM excel_data WHERE 
       REPLACE(REPLACE(row_data->>$1, '-', ''), ' ', '') = $3
       AND REPLACE(REPLACE(row_data->>$2, '-', ''), ' ', '') = $4
       ORDER BY row_index LIMIT 1`,
      [orderColumn, afoColumn, normOrder, normAfo]
    );

    if (rows.length === 0) return res.json(null);

    const row = rows[0].row_data;
    const additionalData: Record<string, any> = {};

    if (articleColumn && row[articleColumn]) additionalData.Artikelnummer = row[articleColumn];
    if (articleDescColumn && row[articleDescColumn]) additionalData.Artikelbezeichnung = row[articleDescColumn];
    if (resourceColumn && row[resourceColumn]) additionalData.Ressource = row[resourceColumn];

    if (additionalColumns) {
      for (const col of additionalColumns) {
        if (row[col.column]) additionalData[col.name] = row[col.column];
      }
    }

    res.json({
      row,
      additionalData,
      department: departmentColumn ? row[departmentColumn] : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler bei der Excel-Suche' });
  }
});

// DELETE /api/excel/clear
router.delete('/clear', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    await query('TRUNCATE TABLE excel_data');
    await query('TRUNCATE TABLE excel_settings');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Excel-Daten' });
  }
});

export default router;
