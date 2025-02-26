// Initialize Socket.IO with explicit connection options
const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000 // Increased timeout for connection
});

let userId = null;

// Generate a unique ID for this user
userId = generateUserId();

// Initialize QR Code
const qrcode = new QRCode(document.getElementById("qrcode"), {
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
});

// Initialize the map with default location
const map = L.map('map').setView([0, 0], 2); // Start with a global view until we get location

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Store device markers
const deviceMarkers = {};

// Custom marker icons for different user types
const icons = {
    self: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
    tracked: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconSize: [30, 46],
        iconAnchor: [15, 46],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41],
        className: 'tracked-marker' // Add custom class for styling
    }),
    viewer: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconSize: [20, 36],
        iconAnchor: [10, 36],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41],
        className: 'viewer-marker' // Add custom class for styling
    })
};

// Add CSS for marker styling
const style = document.createElement('style');
style.textContent = `
    .tracked-marker {
        filter: hue-rotate(120deg); /* Green */
    }
    .viewer-marker {
        filter: hue-rotate(240deg); /* Blue */
    }
    .users-list {
        position: absolute;
        left: 20px;
        top: 20px;
        background: white;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 300px;
        overflow-y: auto;
        min-width: 200px;
    }
    .users-list h3 {
        margin-top: 0;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
    }
    .user-item {
        padding: 5px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .user-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 5px;
    }
    .user-actions {
        margin-left: 10px;
    }
    .center-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #007bff;
        font-size: 14px;
    }
`;
document.head.appendChild(style);

// Users list panel
const usersListPanel = document.createElement('div');
usersListPanel.className = 'users-list';
usersListPanel.innerHTML = '<h3>Connected Users</h3><div id="users-container"></div>';
document.body.appendChild(usersListPanel);

// Socket connection status indicator in UI
const statusIndicator = document.createElement('div');
statusIndicator.style.position = 'absolute';
statusIndicator.style.bottom = '20px';
statusIndicator.style.left = '20px';
statusIndicator.style.padding = '8px 12px';
statusIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
statusIndicator.style.color = 'white';
statusIndicator.style.borderRadius = '4px';
statusIndicator.style.zIndex = '1000';
statusIndicator.textContent = 'Connecting...';
document.body.appendChild(statusIndicator);

// Keep track of all connected users
const connectedUsers = {};

// Socket event listeners with better error handling
socket.on('connect', () => {
    console.log('Connected to server with ID:', userId);
    statusIndicator.textContent = 'Connected';
    statusIndicator.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
    
    // Once connected, try to initialize location tracking
    initializeLocationTracking();
    
    // Identify user role to server
    const urlParams = new URLSearchParams(window.location.search);
    const trackingId = urlParams.get('track');
    
    // Emit "join" event with user info
    socket.emit('join', {
        id: userId,
        isViewer: !!trackingId,
        trackingId: trackingId || null
    });
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    statusIndicator.textContent = 'Connection error - retrying...';
    statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    statusIndicator.textContent = 'Disconnected';
    statusIndicator.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
});

// Add this function to avoid multiple userId generations on page refresh
function initializeUserId() {
    // Try to get existing userId from localStorage
    let storedId = null;
    try {
        storedId = localStorage.getItem('locationTrackingUserId');
    } catch (e) {
        console.warn('Could not access localStorage:', e);
    }
    
    if (storedId) {
        console.log('Using stored user ID:', storedId);
        return storedId;
    } else {
        // Generate new ID
        const newId = 'user_' + Math.random().toString(36).substr(2, 9);
        
        // Try to save in localStorage
        try {
            localStorage.setItem('locationTrackingUserId', newId);
        } catch (e) {
            console.warn('Could not save user ID to localStorage:', e);
        }
        
        return newId;
    }
}

// Generate a unique user ID
function generateUserId() {
    return initializeUserId();
}

// Initialize location tracking
function initializeLocationTracking() {
    if (navigator.geolocation) {
        // Show loading indicator
        statusIndicator.textContent = 'Getting location...';
        
        // More reliable options - force high accuracy and don't use cached positions
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,         // Increased timeout to 15 seconds
            maximumAge: 0           // Force fresh position, don't use cache
        };
        
        // Get position with better options
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                
                console.log(`Got initial position - Lat: ${latitude}, Lng: ${longitude}, Accuracy: ${accuracy}m`);
                statusIndicator.textContent = `Location acquired (±${Math.round(accuracy)}m)`;
                
                setTimeout(() => {
                    statusIndicator.style.display = 'none';
                }, 3000);
                
                // Set initial map view
                map.setView([latitude, longitude], 16);
                
                // Create initial marker with appropriate icon type
                const urlParams = new URLSearchParams(window.location.search);
                const trackingId = urlParams.get('track');
                const iconType = trackingId ? 'viewer' : 'self';
                
                // Store position in localStorage to help with refreshes
                try {
                    localStorage.setItem('lastPosition', JSON.stringify({
                        latitude,
                        longitude,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    console.warn('Could not save position to localStorage:', e);
                }
                
                deviceMarkers[userId] = L.marker([latitude, longitude], {icon: icons[iconType]})
                    .bindPopup(`Your Location (±${Math.round(accuracy)}m)`)
                    .addTo(map);
                
                // Register this user in the local list
                connectedUsers[userId] = {
                    id: userId,
                    type: trackingId ? 'viewer' : 'self',
                    latitude,
                    longitude,
                    accuracy,
                    lastUpdate: new Date()
                };
                
                // Start continuous tracking with better options
                startLocationTracking();
                
                // Update QR code with initial location
                if (!trackingId) {
                    updateQRCode(userId);
                }
                
                // Update users list UI
                updateUsersListUI();
            },
            (error) => {
                console.error("Error getting initial position:", error);
                
                // Try to use last known position from localStorage
                try {
                    const lastPos = JSON.parse(localStorage.getItem('lastPosition'));
                    if (lastPos && Date.now() - lastPos.timestamp < 24 * 60 * 60 * 1000) { // Less than 24 hours old
                        console.log('Using last known position:', lastPos);
                        statusIndicator.textContent = 'Using last known location';
                        
                        // Use last known coordinates
                        const position = {
                            coords: {
                                latitude: lastPos.latitude,
                                longitude: lastPos.longitude,
                                accuracy: 500 // Assume lower accuracy for cached position
                            }
                        };
                        
                        // Call success handler with cached position
                        navigator.geolocation.getCurrentPosition(
                            () => {}, // Empty success handler
                            () => {}, // Empty error handler
                            { timeout: 0 }
                        );
                        
                        // Process the cached position
                        const urlParams = new URLSearchParams(window.location.search);
                        const trackingId = urlParams.get('track');
                        const iconType = trackingId ? 'viewer' : 'self';
                        
                        map.setView([lastPos.latitude, lastPos.longitude], 16);
                        
                        deviceMarkers[userId] = L.marker([lastPos.latitude, lastPos.longitude], {icon: icons[iconType]})
                            .bindPopup(`Your Location (cached)`)
                            .addTo(map);
                        
                        connectedUsers[userId] = {
                            id: userId,
                            type: trackingId ? 'viewer' : 'self',
                            latitude: lastPos.latitude,
                            longitude: lastPos.longitude,
                            accuracy: 500,
                            lastUpdate: new Date()
                        };
                        
                        startLocationTracking();
                        
                        if (!trackingId) {
                            updateQRCode(userId);
                        }
                        
                        updateUsersListUI();
                        return;
                    }
                } catch (e) {
                    console.warn('Could not use cached position:', e);
                }
                
                handleGeolocationError(error);
            },
            options
        );
    } else {
        alert("Geolocation is not supported by your browser");
        statusIndicator.textContent = 'Geolocation not supported';
        statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    }
}

// Start continuous location tracking with better error handling
function startLocationTracking() {
    // Clear any existing watch
    if (window.locationWatchId) {
        navigator.geolocation.clearWatch(window.locationWatchId);
    }
    
    const watchOptions = {
        enableHighAccuracy: true,
        maximumAge: 0,         // Don't use cached positions
        timeout: 10000         // Increased timeout to 10 seconds
    };
    
    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Only use position if accuracy is acceptable
            if (accuracy > 1000) {
                console.log(`Ignoring inaccurate position (${Math.round(accuracy)}m)`);
                return; // Skip this update
            }
            
            // Store position in localStorage
            try {
                localStorage.setItem('lastPosition', JSON.stringify({
                    latitude,
                    longitude,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('Could not save position to localStorage:', e);
            }
            
            // Emit location with user ID and viewer status
            if (socket.connected) {
                const urlParams = new URLSearchParams(window.location.search);
                const trackingId = urlParams.get('track');
                
                socket.emit("update-location", {
                    id: userId,
                    latitude,
                    longitude,
                    accuracy,
                    isViewer: !!trackingId,
                    trackingId: trackingId || null
                });
                
                // Update local user data
                if (connectedUsers[userId]) {
                    connectedUsers[userId].latitude = latitude;
                    connectedUsers[userId].longitude = longitude;
                    connectedUsers[userId].accuracy = accuracy;
                    connectedUsers[userId].lastUpdate = new Date();
                }
            }

            // Update own marker immediately
            if (deviceMarkers[userId]) {
                deviceMarkers[userId].setLatLng([latitude, longitude]);
                
                // Update popup to show accuracy
                deviceMarkers[userId].getPopup().setContent(
                    `Your Location (±${Math.round(accuracy)}m)`
                );
            }

            console.log('Location updated:', { latitude, longitude, accuracy });
        },
        (error) => {
            console.error("Geolocation watching error:", error);
            
            // Only show error if persistent
            if (error.code !== error.TIMEOUT) {
                handleGeolocationError(error);
            }
        },
        watchOptions
    );
    
    // Store watch ID to allow cancellation if needed
    window.locationWatchId = watchId;
}

// Handle geolocation errors with more detailed feedback
function handleGeolocationError(error) {
    let errorMessage = "Unable to get your location. ";
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage += "Please enable location services in your browser settings and refresh the page.";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable. Try moving to an area with better GPS coverage.";
            break;
        case error.TIMEOUT:
            errorMessage += "Location request timed out. Try again or move to an area with better GPS signal.";
            break;
        default:
            errorMessage += "An unknown error occurred. Please refresh and try again.";
            break;
    }
    
    alert(errorMessage);
    statusIndicator.textContent = 'Location error';
    statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
}

// Listen for user list updates from server
socket.on('users-update', (usersList) => {
    console.log('Received users update:', usersList);
    
    // Update local list with server data
    for (const user of usersList) {
        connectedUsers[user.id] = user;
        
        // If we already have a marker for this user, update it
        // Otherwise create a new one
        if (deviceMarkers[user.id]) {
            deviceMarkers[user.id].setLatLng([user.latitude, user.longitude]);
            
            // Update popup content
            let popupContent = user.id === userId ? `Your Location (±${user.accuracy || 0}m)` : 
                               user.type === 'tracked' ? `Tracked User (${user.id})` : `Viewer (${user.id})`;
            deviceMarkers[user.id].getPopup().setContent(popupContent);
            
        } else if (user.id !== userId) { // Don't create duplicate marker for self
            // Determine icon type
            let iconType = user.type === 'tracked' ? 'tracked' : 'viewer';
            
            // Create marker with appropriate icon
            deviceMarkers[user.id] = L.marker([user.latitude, user.longitude], {icon: icons[iconType]})
                .bindPopup(user.type === 'tracked' ? `Tracked User (${user.id})` : `Viewer (${user.id})`)
                .addTo(map);
        }
    }
    
    // Update UI
    updateUsersListUI();
    
    // If we're tracking someone, make sure to focus the map on them
    const urlParams = new URLSearchParams(window.location.search);
    const trackingId = urlParams.get('track');
    if (trackingId && connectedUsers[trackingId]) {
        map.setView([connectedUsers[trackingId].latitude, connectedUsers[trackingId].longitude]);
    }
});

// Listen for user disconnection
socket.on('user-disconnected', (userId) => {
    console.log('User disconnected:', userId);
    
    // Remove from connected users
    delete connectedUsers[userId];
    
    // Remove marker if exists
    if (deviceMarkers[userId]) {
        map.removeLayer(deviceMarkers[userId]);
        delete deviceMarkers[userId];
    }
    
    // Update UI
    updateUsersListUI();
});

// Update QR code with current tracking URL
function updateQRCode(userId) {
    const trackingUrl = `${window.location.origin}${window.location.pathname}?track=${userId}`;
    qrcode.clear();
    qrcode.makeCode(trackingUrl);
}

// Share location function with improved error handling
async function shareLocation() {
    const trackingUrl = `${window.location.origin}${window.location.pathname}?track=${userId}`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Track My Location',
                text: 'Click here to track my location in real-time',
                url: trackingUrl
            });
        } else {
            // Fallback to copying to clipboard
            await navigator.clipboard.writeText(trackingUrl);
            alert('Tracking link copied to clipboard!');
        }
    } catch (err) {
        console.error('Error sharing:', err);
        // More specific error message
        if (err.name === 'NotAllowedError') {
            alert('Permission to share was denied');
        } else {
            alert('Error sharing location link. You can manually copy this URL: ' + trackingUrl);
        }
    }
}

// Update the users list UI
function updateUsersListUI() {
    const container = document.getElementById('users-container');
    container.innerHTML = '';
    
    // Sort users: self first, then tracked user, then viewers
    const sortedUsers = Object.values(connectedUsers).sort((a, b) => {
        if (a.id === userId) return -1;
        if (b.id === userId) return 1;
        if (a.type === 'tracked') return -1;
        if (b.type === 'tracked') return 1;
        return 0;
    });
    
    for (const user of sortedUsers) {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        // Determine user color
        let color = '#1E90FF'; // Default blue
        let label = 'Viewer';
        
        if (user.id === userId) {
            color = '#000000'; // Black for self
            label = 'You';
        } else if (user.type === 'tracked') {
            color = '#228B22'; // Green for tracked user
            label = 'Tracked';
        }
        
        userItem.innerHTML = `
            <div>
                <span class="user-color" style="background-color: ${color}"></span>
                ${label} ${user.id === userId ? '' : `(${user.id.slice(0, 6)}...)`}
            </div>
            <div class="user-actions">
                <button class="center-btn" data-id="${user.id}">Center</button>
            </div>
        `;
        
        // Add click event for centering
        userItem.querySelector('.center-btn').addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            if (connectedUsers[userId]) {
                map.setView([connectedUsers[userId].latitude, connectedUsers[userId].longitude], 16);
            }
        });
        
        container.appendChild(userItem);
    }
    
    // Show "no users" message if empty
    if (sortedUsers.length === 0) {
        container.innerHTML = '<p>No users connected</p>';
    }
}

// Check if we're in tracking mode
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const trackingId = urlParams.get('track');
    
    if (trackingId) {
        // We're in tracking mode, hide sharing UI
        document.querySelector('.qr-container').style.display = 'none';
        statusIndicator.textContent = 'Tracking mode: waiting for updates...';
        
        // Still initialize our own location (needed for multi-user visibility)
        if (socket.connected) {
            initializeLocationTracking();
        }
    } else {
        // Only initialize location tracking after socket connects
        if (socket.connected) {
            initializeLocationTracking();
        }
        // Otherwise it will be initialized when socket connects
    }
}

// Run initialization
initializeApp();

// Handle page visibility changes to optimize performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, could implement power saving measures here
        console.log('Page hidden, could pause updates');
    } else {
        // Page is visible again, check connection status
        console.log('Page visible, resuming updates');
        if (!socket.connected) {
            socket.connect(); // Try to reconnect if necessary
        }
    }
});

// Add reconnect button to UI for manual reconnection
const reconnectButton = document.createElement('button');
reconnectButton.textContent = 'Reconnect';
reconnectButton.style.position = 'absolute';
reconnectButton.style.bottom = '20px';
reconnectButton.style.left = '150px';
reconnectButton.style.padding = '8px 16px';
reconnectButton.style.backgroundColor = '#007bff';
reconnectButton.style.color = 'white';
reconnectButton.style.border = 'none';
reconnectButton.style.borderRadius = '4px';
reconnectButton.style.cursor = 'pointer';
reconnectButton.style.zIndex = '1000';
reconnectButton.style.display = 'none'; // Hide initially

reconnectButton.onclick = () => {
    socket.connect();
    statusIndicator.textContent = 'Reconnecting...';
    reconnectButton.style.display = 'none';
};

document.body.appendChild(reconnectButton);

// Show reconnect button when disconnected
socket.on('disconnect', () => {
    reconnectButton.style.display = 'block';
});

// Hide reconnect button when connected
socket.on('connect', () => {
    reconnectButton.style.display = 'none';
});