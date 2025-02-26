const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Store connected users with their data
const connectedUsers = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let userId = null;
    
    // Handle user joining
    socket.on('join', (data) => {
        console.log('User joined:', data);
        userId = data.id;
        
        // Store user data
        connectedUsers[userId] = {
            id: userId,
            socketId: socket.id,
            type: data.isViewer ? 'viewer' : 'tracked',
            trackingId: data.trackingId,
            // Default location until we get an update
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            isViewer: data.isViewer,
            lastSeen: new Date()
        };
        
        // Send the full users list to all clients
        io.emit('users-update', Object.values(connectedUsers));
    });
    
    // Handle location updates
    socket.on('update-location', (data) => {
        console.log('Received location update from', data.id);
        
        // Update user data
        if (connectedUsers[data.id]) {
            connectedUsers[data.id].latitude = data.latitude;
            connectedUsers[data.id].longitude = data.longitude;
            connectedUsers[data.id].accuracy = data.accuracy || 0;
            connectedUsers[data.id].lastSeen = new Date();
            
            // If this is a viewer, update their tracked target
            if (data.isViewer && data.trackingId) {
                connectedUsers[data.id].trackingId = data.trackingId;
                
                // Ensure the tracked user has the correct type
                if (connectedUsers[data.trackingId]) {
                    connectedUsers[data.trackingId].type = 'tracked';
                }
            }
        }
        
        // Broadcast updated users list to all clients
        io.emit('users-update', Object.values(connectedUsers));
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove user from connected list
        if (userId && connectedUsers[userId]) {
            delete connectedUsers[userId];
            
            // Notify all clients
            io.emit('user-disconnected', userId);
            io.emit('users-update', Object.values(connectedUsers));
        }
    });
});

// Cleanup inactive users periodically (every 30 seconds)
setInterval(() => {
    const now = new Date();
    let changed = false;
    
    for (const userId in connectedUsers) {
        const lastSeen = connectedUsers[userId].lastSeen;
        const timeDiff = now - lastSeen;
        
        // If user hasn't updated for 5 minutes, remove them
        if (timeDiff > 5 * 60 * 1000) {
            console.log(`Removing inactive user: ${userId}`);
            delete connectedUsers[userId];
            io.emit('user-disconnected', userId);
            changed = true;
        }
    }
    
    // Only emit update if we removed any users
    if (changed) {
        io.emit('users-update', Object.values(connectedUsers));
    }
}, 30000);

app.get("/", (req, res) => {
    res.render("index");
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});