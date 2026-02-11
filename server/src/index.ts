import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import errorReportsRoutes from './routes/errorReports';
import departmentsRoutes from './routes/departments';
import machinesRoutes from './routes/machines';
import profilesRoutes from './routes/profiles';
import rolesRoutes from './routes/roles';
import uploadRoutes from './routes/upload';
import settingsRoutes from './routes/settings';
import excelRoutes from './routes/excel';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/error-reports', errorReportsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/excel', excelRoutes);

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files (Uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.listen(PORT, () => {
  console.log(`🚀 API-Server läuft auf Port ${PORT}`);
  console.log(`📁 Uploads: ${process.env.UPLOAD_DIR || './uploads'}`);
});

export default app;
