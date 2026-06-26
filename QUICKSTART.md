# 🚀 Quick Start Guide - Speed Card Match

## ✅ What's Been Built

Your multiplayer card game is now **fully functional** with:

### Backend (Node.js + Express + Socket.io)
- ✓ Room management (create/join)
- ✓ Game state logic (deck distribution, turns, matching)
- ✓ Real-time player synchronization
- ✓ Elimination & winner detection
- ✓ Socket.io event handling for all game actions

### Frontend (Next.js + React)
- ✓ Home screen (create/join rooms)
- ✓ Lobby (wait for players, start game)
- ✓ Game board (draw cards, claim stack)
- ✓ Player list with live updates
- ✓ Current call display (2-14, J-Q-K-A)
- ✓ Stack display
- ✓ Real-time Socket.io connection

### Tech Stack
- **Frontend**: Next.js 16+, React, TypeScript, Tailwind CSS, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, TypeScript
- **Database**: In-memory (can upgrade to Redis)

---

## 🎮 How to Play (Local Testing)

### Step 1: Open Multiple Browser Windows
1. Open 2-4 browser tabs to `http://localhost:3000`

### Step 2: Create a Game (Window 1)
- Enter your name (e.g., "Alice")
- Click "**➕ Create New Room**"
- Note the room code (e.g., "ABC123")

### Step 3: Join as Other Players (Windows 2, 3, 4)
- Enter different names (e.g., "Bob", "Charlie")
- Click "**Join Existing Room**"
- Enter the room code
- Click "**✓ Join Room**"

### Step 4: Start the Game (Window 1)
- Once you have 2+ players, click "**🎮 Start Game**"

### Step 5: Play!
- Players take turns in order
- Current player clicks "**Draw Card**"
- If your card matches the "**Current Call**" (2-14), you can click "**🎯 Claim Stack (Speed Click)**"
- First to click claims all the cards!
- Last player with cards wins! 🏆

---

## 📁 Project Structure

```
multiplayergame/
├── frontend/                    # Next.js React app
│   ├── src/app/page.tsx        # Main game page
│   ├── src/components/         # Game UI components
│   ├── src/hooks/useGameSocket.ts  # Socket.io hook
│   ├── src/types/game.ts       # TypeScript types
│   └── src/utils/              # Card utilities
│
├── backend/                     # Node.js Express server
│   ├── src/server.ts           # Express + Socket.io entry
│   ├── src/game/               # Game logic
│   ├── src/rooms/              # Room manager
│   ├── src/events/             # Socket.io handlers
│   └── src/utils/              # Card utilities
│
└── README.md                    # Full documentation
```

---

## 🔗 Server URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:3000 | ✅ Running |
| Backend API | http://localhost:4000 | ✅ Running |
| WebSocket | ws://localhost:4000 | ✅ Running |

---

## 🎯 Key Features Implemented

### Game Mechanics ✓
- [x] Fair deck shuffling and distribution
- [x] Sequential turn-based gameplay
- [x] Card matching logic (current call detection)
- [x] Stack claiming with conflict resolution
- [x] Player elimination when out of cards
- [x] Automatic winner detection
- [x] Current call cycling (2→3→...→14→2)

### Real-time Multiplayer ✓
- [x] Room codes for easy joining
- [x] Live player list updates
- [x] Real-time card draws
- [x] Turn advancement notifications
- [x] Player elimination announcements
- [x] Win condition announcements
- [x] Disconnect handling

### UI/UX ✓
- [x] Home screen with create/join options
- [x] Lobby screen with player list
- [x] Game board with current call display
- [x] Stack preview
- [x] Player hand (when implemented)
- [x] Turn indicator
- [x] Message feed for game events
- [x] Responsive Tailwind CSS design

---

## 🔧 Troubleshooting

### "Cannot connect to server"
- ✓ Ensure backend is running: `npm run dev` in `/backend`
- ✓ Check `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000` in `.env.local`
- ✓ Check CORS is enabled (it is by default)

### "Socket not connected"
- ✓ Refresh the page
- ✓ Check browser console for errors
- ✓ Ensure both servers are running

### "TypeScript errors"
- ✓ Backend imports now use local types in `src/types/game.ts`
- ✓ Frontend types are in `src/types/game.ts`

---

## 🚀 Next Steps (Optional Enhancements)

### Phase 1 (Current)
- ✓ Core game logic
- ✓ Real-time multiplayer
- ✓ Basic UI

### Phase 2 (Future)
- [ ] Player hand display (cards in hand)
- [ ] Chat system during games
- [ ] Game history & stats
- [ ] Elo ranking system
- [ ] Spectator mode
- [ ] Sound effects & animations
- [ ] Mobile optimization

### Phase 3 (Production)
- [ ] Database (PostgreSQL + Redis)
- [ ] User authentication
- [ ] Deployment (Vercel + Heroku)
- [ ] Load balancing for multiple rooms
- [ ] Cloud deployment configuration

---

## 📞 Terminal Commands

**Backend (Terminal 1)**
```bash
cd backend
npm run dev        # Start development server
npm run build      # Compile TypeScript
npm start          # Run compiled server
```

**Frontend (Terminal 2)**
```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Run production build
```

---

## 🎉 You're All Set!

Open http://localhost:3000 and start playing! 🎮

Share the room code with friends to invite them to your game.
