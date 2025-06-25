const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Allow CORS for localhost:3000 (your Next.js frontend)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
})); 

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store waiting user
let waitingUser = null;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', ({ username }) => {
    socket.username = username;

    if (!waitingUser) {
      waitingUser = socket;
      socket.emit('wait-for-offer');
    } else {
      // Pair users
      const partner = waitingUser;
      waitingUser = null;

      socket.partnerId = partner.id;
      partner.partnerId = socket.id;

      // Ask partner to create an offer
      partner.emit('create-offer', { partnerUsername: socket.username });
      socket.emit('wait-for-offer', { partnerUsername: partner.username });
    }
  });

  socket.on('send-offer', ({ offer }) => {
    const partnerSocket = io.sockets.sockets.get(socket.partnerId);
    if (partnerSocket) {
      partnerSocket.emit('receive-offer', { offer });
    }
  });

  socket.on('send-answer', ({ answer }) => {
    const partnerSocket = io.sockets.sockets.get(socket.partnerId);
    if (partnerSocket) {
      partnerSocket.emit('receive-answer', { answer });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }

    if (socket.partnerId) {
      const partnerSocket = io.sockets.sockets.get(socket.partnerId);
      if (partnerSocket) {
        partnerSocket.emit('partner-left');
        partnerSocket.partnerId = null;
      }
    }
  });
});

server.listen(4000, () => {
  console.log('✅ Socket.IO server running on http://localhost:4000');
});
