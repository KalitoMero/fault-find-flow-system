import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Verzeichnis erstellen falls nötig
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

const router = Router();

// POST /api/upload/audio
router.post('/audio', authenticate, upload.single('audio'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    const { reportId, fieldName } = req.body;
    const storagePath = req.file.filename;

    await query(
      'INSERT INTO audio_files (report_id, field_name, storage_path) VALUES ($1, $2, $3)',
      [reportId, fieldName, storagePath]
    );

    res.json({ path: storagePath });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// GET /api/upload/audio/:reportId
router.get('/audio/:reportId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT * FROM audio_files WHERE report_id = $1',
      [req.params.reportId]
    );
    const filesWithUrls = rows.map(f => ({
      ...f,
      url: `/api/upload/files/${f.storage_path}`
    }));
    res.json(filesWithUrls);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Audio-Dateien' });
  }
});

// GET /api/upload/files/:filename - Datei ausliefern
router.get('/files/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
  res.sendFile(path.resolve(filePath));
});

export default router;
