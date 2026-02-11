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

// GET /api/excel/data
router.get('/data', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : null;
    const sql = limit
      ? 'SELECT * FROM excel_data ORDER BY row_index LIMIT $1'
      : 'SELECT * FROM excel_data ORDER BY row_index';
    const { rows } = await query(sql, limit ? [limit] : []);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Excel-Daten' });
  }
});

// POST /api/excel/data (batch insert)
router.post('/data', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const rows = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'Array erwartet' });

    for (const row of rows) {
      await query(
        'INSERT INTO excel_data (row_data, row_index) VALUES ($1, $2)',
        [JSON.stringify(row.row_data), row.row_index]
      );
    }
    res.json({ success: true, count: rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Excel-Daten' });
  }
});

// POST /api/excel/settings (save/update)
router.post('/settings', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const s = req.body;
    // Upsert: delete old + insert new
    await query('DELETE FROM excel_settings');
    await query(
      `INSERT INTO excel_settings (file_name, order_number_column, afo_number_column, article_number_column, article_description_column, department_column, resource_column, additional_columns, column_order, row_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [s.file_name, s.order_number_column, s.afo_number_column, s.article_number_column, s.article_description_column, s.department_column, s.resource_column, JSON.stringify(s.additional_columns || null), JSON.stringify(s.column_order || null), s.row_count || null]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Excel-Einstellungen' });
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
