import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server;

export const initializeSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.WEB_APP_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    console.log(`✅ User connected: ${user.userId} (${user.role})`);

    // Join user-specific room
    socket.join(`user:${user.userId}`);

    // Join clinic-specific room
    if (user.clinicId) {
      socket.join(`clinic:${user.clinicId}`);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initializeSocket first.');
  }
  return io;
};

export default { initializeSocket, getIO };
