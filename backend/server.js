import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupGameHandlers } from './gameLogic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // We'll restrict this to the Vite frontend port in production
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[+] User connected: ${socket.id}`);

  // Setup game logic handlers for this socket
  setupGameHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`[-] User disconnected: ${socket.id}`);
  });
});

// --- Serve React Frontend in Production ---
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[i] Merda Online server running on http://localhost:${PORT}`);
});
