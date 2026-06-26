# ⚡ Speed Card Match - Multiplayer Card Game

A real-time multiplayer card game built with Next.js, React, Node.js, Express, and Socket.io.

## 🎮 Game Rules

- **Players**: 2-4 players per room
- **Setup**: Deck is split equally among players
- **Gameplay**:
  - Players take turns drawing cards in sequence
  - Current "call" cycles: 2 → 3 → ... → 14 → A → 2 (where J=11, Q=12, K=13, A=14)
  - If your drawn card matches the current call, you claim all cards on the stack
  - First to click/claim the stack wins it
  - When a player runs out of cards, they're eliminated
  - Last player standing wins! 🏆

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14+ with React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io Client
- **Package Manager**: npm

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Language**: TypeScript
- **Package Manager**: npm

## 📁 Project Structure

```
multiplayergame/
├── frontend/           # Next.js React app
│   ├── src/
│   │   ├── app/       # Next.js App Router pages
│   │   ├── components/
│   │   ├── hooks/     # useGameSocket hook
│   │   ├── types/     # Game types
│   │   └── utils/     # Card utilities
│   └── package.json
├── backend/           # Node.js Express server
│   ├── src/
│   │   ├── server.ts
│   │   ├── game/      # Game logic (Deck, GameLogic, Player)
│   │   ├── rooms/     # RoomManager
│   │   ├── events/    # Socket.io handlers
│   │   └── utils/     # Card utilities
│   └── package.json
└── shared/           # Shared types
    └── types.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Clone & Navigate**
   ```bash
   cd multiplayergame
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   cd ..
   ```

### Running the Application

**Terminal 1 - Start Backend (port 4000)**
```bash
cd backend
npm run dev
```

**Terminal 2 - Start Frontend (port 3000)**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the home screen.

## 🎯 How to Play

1. **Create or Join a Room**
   - Enter your name and click "Create New Room" to start a new game
   - Or click "Join Existing Room" and enter a room code to join friends

2. **Wait for Players**
   - Room host can start the game once at least 2 players have joined (max 4)
   - Share the room code with friends to invite them

3. **Play the Game**
   - Players draw cards in turn order
   - When your card matches the current "call", the stack is on the table
   - Click "Claim Stack" quickly to win all the cards!
   - Match advances to the next number (2→3, etc.)
   - Last player with cards wins!

## 📡 Socket.io Events

### Client → Server
- `JOIN_ROOM`: Join a room
- `START_GAME`: Start the game (host only)
- `DRAW_CARD`: Draw a card (current player)
- `CLAIM_STACK`: Claim the matched stack (any player, fastest wins)
- `LEAVE_ROOM`: Leave the room

### Server → Client
- `ROOM_UPDATED`: Room state changed
- `GAME_STARTED`: Game has begun
- `CARD_DRAWN`: A player drew a card
- `TURN_ADVANCED`: Next player's turn
- `STACK_CLAIMED`: Stack was claimed
- `PLAYER_ELIMINATED`: Player ran out of cards
- `GAME_WON`: Game winner announced

## 🔧 Development

### Backend Commands
- `npm run dev` - Start dev server with auto-reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled server

### Frontend Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production build

## 🚢 Deployment

### Backend (Heroku / Railway / Fly.io)
1. Deploy to your hosting platform
2. Set `FRONTEND_URL` environment variable
3. Start the server

### Frontend (Vercel)
1. Connect repo to Vercel
2. Set `NEXT_PUBLIC_BACKEND_URL` environment variable
3. Deploy

## 📝 Future Enhancements

- [ ] Chat system during games
- [ ] Spectator mode
- [ ] Elo ranking system
- [ ] Game history & stats
- [ ] Mobile app with React Native
- [ ] AI opponent
- [ ] Custom card themes
- [ ] Audio effects & animations

## 📄 License

MIT
