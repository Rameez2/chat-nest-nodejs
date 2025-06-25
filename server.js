const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS settings
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));


const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

let queue = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', ({ username }) => {
    socket.username = username;
    queue.push(socket);

    if (queue.length >= 2) {
      const [user1, user2] = queue.splice(0, 2);

      user1.partnerId = user2.id;
      user2.partnerId = user1.id;

      user1.emit('matched', {
        role: 'offerer',
        partnerUsername: user2.username,
      });
      user2.emit('matched', {
        role: 'answerer',
        partnerUsername: user1.username,
      });
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

    queue = queue.filter((s) => s.id !== socket.id);

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
  console.log('✅ Server running on http://localhost:4000');
});
