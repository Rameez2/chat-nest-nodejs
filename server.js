const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Allow cross-origin requests from any origin
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

// Initialize a new Socket.IO server with CORS settings
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Queue to hold users waiting to be matched
let queue = [];

// Listen for new socket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user joins the system
  socket.on('join', ({ username }) => {
    socket.username = username; // Store username on the socket
    queue.push(socket); // Add the user to the waiting queue

    // If at least 2 users are in the queue, match them
    if (queue.length >= 2) {
      const [user1, user2] = queue.splice(0, 2); // Take first two users from the queue

      // Set partner IDs on each socket
      user1.partnerId = user2.id;
      user2.partnerId = user1.id;

      // Inform both users they are matched and assign roles
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

  // When a user sends a WebRTC offer
  socket.on('send-offer', ({ offer }) => {
    const partnerSocket = io.sockets.sockets.get(socket.partnerId);
    if (partnerSocket) {
      // Forward the offer to the matched partner
      partnerSocket.emit('receive-offer', { offer });
    }
  });

  // When a user sends a WebRTC answer
  socket.on('send-answer', ({ answer }) => {
    const partnerSocket = io.sockets.sockets.get(socket.partnerId);
    if (partnerSocket) {
      // Forward the answer to the matched partner
      partnerSocket.emit('receive-answer', { answer });
    }
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove the disconnected user from the queue if they were in it
    queue = queue.filter((s) => s.id !== socket.id);

    // Notify their partner, if any, that they've left
    if (socket.partnerId) {
      const partnerSocket = io.sockets.sockets.get(socket.partnerId);
      if (partnerSocket) {
        partnerSocket.emit('partner-left');
        partnerSocket.partnerId = null;
      }
    }
  });
});

// Start the HTTP server on port 4000
server.listen(4000, () => {
  console.log('✅ Server running on http://localhost:4000');
});
