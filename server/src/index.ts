import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import adminRoutes from './routes/admin';
import masterSettingsRoutes from './routes/masterSettings';
import { authenticateGroupSession } from './middleware/auth';
import { accessControl } from './middleware/accessControl';
import { setupSocket } from './socket';
import { startExpirationJob } from './jobs/expiration';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

const prisma = new PrismaClient();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Serve static files from client
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Routes
app.use('/auth', authRoutes);
app.use('/users', authenticateGroupSession, userRoutes);
app.use('/messages', authenticateGroupSession, accessControl, messageRoutes);
app.use('/admin', authenticateGroupSession, accessControl, adminRoutes);
app.use('/master-settings', authenticateGroupSession, accessControl, masterSettingsRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

setupSocket(io);
startExpirationJob(prisma);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});