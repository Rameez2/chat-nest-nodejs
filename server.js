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


function matchTwoUsers(currentUser) {
  if (queue.length >= 2) {

  }
}

// Listen for new socket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user joins the system
  socket.on('join', ({ user, filters }) => {
    let username = user.username;
    console.log('user joined:', user.username);
    console.log('user filters', filters);


    socket.username = username; // Store username on the socket
    socket.userData = user;
    socket.filters = filters;

    console.log('QUEUE', queue);

    // Function to check if two sockets are a match based on filters
    const isMatch = (queuedSocket, joiningSocket) => {
      const requestedGender = joiningSocket.filters.gender;
      const candidateGender = queuedSocket.userData.gender;

      // If a gender filter is specified, enforce it
      if (requestedGender && requestedGender !== '') {
        if (candidateGender !== requestedGender) {
          return false;
        }
      }

      // ✅ Add more filters here in future (e.g., age, language, etc.)
      // e.g.:
      // if (joiningSocket.filters.age && queuedSocket.userData.age !== joiningSocket.filters.age) return false;

      return true; // Passed all filters
    };


    // Try to find a match in the queue
    const matchIndex = queue.findIndex((queuedSocket) => {
      return isMatch(queuedSocket, socket);
    });


    if (matchIndex !== -1) {
      const matchedSocket = queue.splice(matchIndex, 1)[0];

      // Link both users
      socket.partnerId = matchedSocket.id;
      matchedSocket.partnerId = socket.id;

      // Send match info
      socket.emit('matched', {
        role: 'offerer',
        partnerUsername: matchedSocket.username,
      });

      matchedSocket.emit('matched', {
        role: 'answerer',
        partnerUsername: socket.username,
      });

    } else {
      // No match found, add to queue
      queue.push(socket);
    }

    console.log('QUEUE LENGTH:', queue.length);
    console.log('Queued users:', queue.map(s => s.userData.username));


    // Inside the isMatch() function, just add conditions like:

    // js
    // Copy
    // Edit
    // if (joiningSocket.filters.language && queuedSocket.userData.language !== joiningSocket.filters.language) {
    //   return false;
    // }
    // Keep each condition inside isMatch() clean and readable.




    // OLD CODE


    // let username = user.username;
    // console.log('user joined:',user.username);
    // console.log('user filters',filters);


    // socket.username = username; // Store username on the socket
    // socket.userData = user;
    // queue.push(socket); // Add the user to the waiting queue

    // console.log('QUEUE',queue);

    // // If at least 2 users are in the queue, match them
    // if (queue.length >= 2) {
    //   const [user1, user2] = queue.splice(0, 2); // Take first two users from the queue

    //   // Set partner IDs on each socket
    //   user1.partnerId = user2.id;
    //   user2.partnerId = user1.id;

    //   // Inform both users they are matched and assign roles
    //   user1.emit('matched', {
    //     role: 'offerer',
    //     partnerUsername: user2.username,
    //   });
    //   user2.emit('matched', {
    //     role: 'answerer',
    //     partnerUsername: user1.username,
    //   });
    // }
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
