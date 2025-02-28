# 📍 Real-Time Device Tracker

![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-8BC34A?style=for-the-badge&logo=ejs&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-FF5722?style=for-the-badge&logo=websocket&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![QR Code Scanner](https://img.shields.io/badge/QR_Code_Scanner-0078D7?style=for-the-badge&logo=qrcode&logoColor=white)

## 🌍 Real-Time Location Sharing & Tracking

🚀 **Live Demo:** [🔗 [Try It Here](https://trackor.onrender.com/)]

## 🚀 Introduction

Trackor is a web-based application that allows users to share their live locations via a unique link. Other users who join through the link can see the shared location on an interactive map. The location updates dynamically as users move, providing a seamless tracking experience.

---

## 🛠 Tech Stack

- **Express.js** - Backend server 
- **EJS** - Template engine for rendering views
- **WebSockets (Socket.IO)** - Enables real-time communication
- **Leaflet.js** - Interactive map visualization
- **QR Code Scanner** - Generates and scans QR codes for easy location sharing

---

## 🔥 Features

- 📍 **Real-Time Location Sharing** - Users can check and share their live location.
- 🔗 **Share Location via Link** - Generate a shareable link for tracking.
- 👥 **Multi-User Tracking** - All users who join via the link appear on the same map.
- 🔄 **Live Updates** - If a user moves, the location updates instantly for everyone.
- 📲 **QR Code Support** - Scan a QR code for quick location access.
- 🌎 **Interactive Map** - Uses Leaflet.js for a smooth tracking experience.
- 🔐 **Secure & Lightweight** - Built with Express.js and WebSockets for efficient tracking.

---

## 🏗 How It Works

1. **User Accesses the App**
   - Opens the website and allows location access.
2. **Shares Location**
   - Generates a shareable link or QR code.
3. **Others Join via Link/QR Code**
   - New users appear on the map in real-time.
4. **Live Updates**
   - Locations update dynamically as users move.

---

## 🛠️ Technical Overview

- **Real-Time Communication:**
  - Uses WebSockets (Socket.IO) for instant updates.
- **Location Sharing:**
  - Browser Geolocation API retrieves user coordinates.
- **Map Rendering:**
  - Leaflet.js displays users on an interactive map.
- **QR Code Handling:**
  - Generates QR codes using a library for easy sharing.

---

## 🚀 Getting Started

### 📌 Installation & Setup

```sh
# Clone the repository
git clone https://github.com/your-username/real-time-tracker.git

# Navigate to the project directory
cd real-time-tracker

# Install dependencies
npm install

# Start the server
node app.js
```

### 📌 Usage

- Open `http://localhost:5000` in your browser.
- Allow location access and start tracking!

---

## 🎭 Made with ❤️ by Sounabho

Thank you for checking out Trackor! 🚀📍
