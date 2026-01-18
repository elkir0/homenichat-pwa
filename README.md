# Homenichat-PWA

> Progressive Web App for Homenichat Unified Communication Platform

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](#features)

---

## Overview

Homenichat-PWA is the web frontend for the Homenichat unified communication platform. It's a Progressive Web App that can be installed on any device and works offline.

## Features

- **WhatsApp Integration** - View and send WhatsApp messages
- **SMS Management** - Send and receive SMS
- **VoIP Calls** - Make and receive calls via WebRTC
- **Push Notifications** - Real-time notifications
- **Offline Support** - Works without internet connection
- **Installable** - Add to home screen on any device

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### With Homenichat-Serv

```bash
# Clone the server
git clone https://github.com/elkir0/homenichat-serv.git

# Start with Docker
cd homenichat-serv
docker compose up -d

# Access at http://localhost:8080
```

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

## Project Structure

```
homenichat-pwa/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── services/        # API and WebSocket services
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utility functions
├── public/
│   ├── manifest.json    # PWA manifest
│   └── service-worker.js
└── package.json
```

## Related Projects

| Project | Description |
|---------|-------------|
| [homenichat-serv](https://github.com/elkir0/homenichat-serv) | Backend Server |
| [homenichat-app-android](https://github.com/elkir0/homenichat-app-android) | Android App |
| [homenichat-app-ios](https://github.com/elkir0/homenichat-app-ios) | iOS App |

## License

MIT License - see [LICENSE](LICENSE)

---

**Homenichat** - Home + Omni + Chat
*Self-hosted unified communication, your way.*
