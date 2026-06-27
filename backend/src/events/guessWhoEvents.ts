import { Server, Socket } from 'socket.io';

// ── Types ──────────────────────────────────────────────────────────────────────

type SkinTone = 'Light' | 'Tan' | 'Medium' | 'Dark';
type HairColor = 'Black' | 'Brown' | 'Blonde' | 'Red' | 'Grey' | 'White';
type HairStyle = 'Short' | 'Long' | 'Curly' | 'Wavy';
type EyeColor = 'Brown' | 'Blue' | 'Green' | 'Hazel' | 'Grey';
type AgeGroup = 'Young' | 'Adult' | 'Senior';
type Gender = 'Male' | 'Female';

interface GWCharacter {
  id: number;
  name: string;
  gender: Gender;
  hairColor: HairColor;
  hairStyle: HairStyle;
  eyeColor: EyeColor;
  skinTone: SkinTone;
  glasses: boolean;
  hat: boolean;
  beard: boolean;
  mustache: boolean;
  bald: boolean;
  ageGroup: AgeGroup;
}

interface GWQuestion {
  id: string;
  category: string;
  text: string;
  attr: keyof GWCharacter;
  value: string | boolean | string[];
}

interface GWPlayer {
  playerId: string;
  currentSocketId: string;
  name: string;
  secretCharacterId: number | null;
  hasSelected: boolean;
}

type GWPhase = 'WAITING' | 'SELECTING' | 'PLAYING' | 'FINISHED';

interface GWRoom {
  roomCode: string;
  players: GWPlayer[];
  phase: GWPhase;
  currentTurnPlayerId: string | null;
  turnEndsAt: number | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
}

// ── Character data ─────────────────────────────────────────────────────────────

const CHARACTERS: GWCharacter[] = [
  { id: 1,  name: 'Sophia',  gender: 'Female', hairColor: 'Blonde', hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 2,  name: 'Marcus',  gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 3,  name: 'Elena',   gender: 'Female', hairColor: 'Brown',  hairStyle: 'Wavy',  eyeColor: 'Green', skinTone: 'Medium', glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 4,  name: 'James',   gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 5,  name: 'Aisha',   gender: 'Female', hairColor: 'Black',  hairStyle: 'Curly', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 6,  name: 'Oliver',  gender: 'Male',   hairColor: 'Blonde', hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 7,  name: 'Maya',    gender: 'Female', hairColor: 'Red',    hairStyle: 'Wavy',  eyeColor: 'Green', skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 8,  name: 'Carlos',  gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: true,  bald: false, ageGroup: 'Adult' },
  { id: 9,  name: 'Lily',    gender: 'Female', hairColor: 'Blonde', hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 10, name: 'Robert',  gender: 'Male',   hairColor: 'Grey',   hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: true,  hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Senior' },
  { id: 11, name: 'Priya',   gender: 'Female', hairColor: 'Black',  hairStyle: 'Long',  eyeColor: 'Brown', skinTone: 'Medium', glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 12, name: 'David',   gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Hazel', skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 13, name: 'Zoe',     gender: 'Female', hairColor: 'Red',    hairStyle: 'Curly', eyeColor: 'Green', skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 14, name: 'Samuel',  gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: true,  mustache: true,  bald: false, ageGroup: 'Adult' },
  { id: 15, name: 'Aria',    gender: 'Female', hairColor: 'Brown',  hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 16, name: 'Chen',    gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Medium', glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 17, name: 'Nadia',   gender: 'Female', hairColor: 'Blonde', hairStyle: 'Wavy',  eyeColor: 'Grey',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 18, name: 'Tom',     gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Green', skinTone: 'Light',  glasses: false, hat: true,  beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 19, name: 'Luna',    gender: 'Female', hairColor: 'Black',  hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Dark',   glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 20, name: 'Felix',   gender: 'Male',   hairColor: 'Blonde', hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 21, name: 'Rosa',    gender: 'Female', hairColor: 'Brown',  hairStyle: 'Curly', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 22, name: 'Hugo',    gender: 'Male',   hairColor: 'Grey',   hairStyle: 'Short', eyeColor: 'Grey',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: true,  bald: true,  ageGroup: 'Senior' },
  { id: 23, name: 'Amara',   gender: 'Female', hairColor: 'Black',  hairStyle: 'Curly', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 24, name: 'Liam',    gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Green', skinTone: 'Light',  glasses: true,  hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Young' },
  { id: 25, name: 'Ingrid',  gender: 'Female', hairColor: 'Blonde', hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 26, name: 'Diego',   gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 27, name: 'Fatima',  gender: 'Female', hairColor: 'Black',  hairStyle: 'Long',  eyeColor: 'Brown', skinTone: 'Dark',   glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 28, name: 'Patrick', gender: 'Male',   hairColor: 'Red',    hairStyle: 'Short', eyeColor: 'Green', skinTone: 'Light',  glasses: false, hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 29, name: 'Yuki',    gender: 'Female', hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Medium', glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 30, name: 'Andre',   gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: true,  mustache: false, bald: true,  ageGroup: 'Adult' },
  { id: 31, name: 'Cleo',    gender: 'Female', hairColor: 'Red',    hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 32, name: 'Viktor',  gender: 'Male',   hairColor: 'White',  hairStyle: 'Short', eyeColor: 'Grey',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Senior' },
  { id: 33, name: 'Keisha',  gender: 'Female', hairColor: 'Brown',  hairStyle: 'Wavy',  eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 34, name: 'Finn',    gender: 'Male',   hairColor: 'Blonde', hairStyle: 'Curly', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 35, name: 'Sara',    gender: 'Female', hairColor: 'Grey',   hairStyle: 'Long',  eyeColor: 'Green', skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Senior' },
  { id: 36, name: 'Omar',    gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: true,  beard: false, mustache: true,  bald: false, ageGroup: 'Adult' },
];

const QUESTIONS: GWQuestion[] = [
  { id: 'g_female',   category: 'Gender',     text: 'Is your character female?',                   attr: 'gender',    value: 'Female' },
  { id: 'g_male',     category: 'Gender',     text: 'Is your character male?',                     attr: 'gender',    value: 'Male' },
  { id: 'hc_black',   category: 'Hair Color', text: 'Does your character have black hair?',         attr: 'hairColor', value: 'Black' },
  { id: 'hc_brown',   category: 'Hair Color', text: 'Does your character have brown hair?',         attr: 'hairColor', value: 'Brown' },
  { id: 'hc_blonde',  category: 'Hair Color', text: 'Does your character have blonde hair?',        attr: 'hairColor', value: 'Blonde' },
  { id: 'hc_red',     category: 'Hair Color', text: 'Does your character have red hair?',           attr: 'hairColor', value: 'Red' },
  { id: 'hc_greyw',   category: 'Hair Color', text: 'Does your character have grey or white hair?', attr: 'hairColor', value: ['Grey', 'White'] },
  { id: 'hs_bald',    category: 'Hair Style', text: 'Is your character bald?',                     attr: 'bald',      value: true },
  { id: 'hs_long',    category: 'Hair Style', text: 'Does your character have long hair?',          attr: 'hairStyle', value: 'Long' },
  { id: 'hs_curly',   category: 'Hair Style', text: 'Does your character have curly hair?',         attr: 'hairStyle', value: 'Curly' },
  { id: 'hs_wavy',    category: 'Hair Style', text: 'Does your character have wavy hair?',          attr: 'hairStyle', value: 'Wavy' },
  { id: 'e_blue',     category: 'Eyes',       text: 'Does your character have blue eyes?',          attr: 'eyeColor',  value: 'Blue' },
  { id: 'e_brown',    category: 'Eyes',       text: 'Does your character have brown eyes?',         attr: 'eyeColor',  value: 'Brown' },
  { id: 'e_green',    category: 'Eyes',       text: 'Does your character have green eyes?',         attr: 'eyeColor',  value: 'Green' },
  { id: 'e_hazgr',    category: 'Eyes',       text: 'Does your character have hazel or grey eyes?', attr: 'eyeColor',  value: ['Hazel', 'Grey'] },
  { id: 's_light',    category: 'Skin Tone',  text: 'Does your character have light skin?',         attr: 'skinTone',  value: 'Light' },
  { id: 's_dark',     category: 'Skin Tone',  text: 'Does your character have dark skin?',          attr: 'skinTone',  value: 'Dark' },
  { id: 's_tan',      category: 'Skin Tone',  text: 'Does your character have tan skin?',           attr: 'skinTone',  value: 'Tan' },
  { id: 'a_glasses',  category: 'Accessories',text: 'Does your character wear glasses?',            attr: 'glasses',   value: true },
  { id: 'a_hat',      category: 'Accessories',text: 'Does your character wear a hat?',              attr: 'hat',       value: true },
  { id: 'f_beard',    category: 'Facial Hair',text: 'Does your character have a beard?',            attr: 'beard',     value: true },
  { id: 'f_mustache', category: 'Facial Hair',text: 'Does your character have a mustache?',         attr: 'mustache',  value: true },
  { id: 'ag_young',   category: 'Age',        text: 'Is your character young (under 30)?',          attr: 'ageGroup',  value: 'Young' },
  { id: 'ag_senior',  category: 'Age',        text: 'Is your character a senior (60+)?',            attr: 'ageGroup',  value: 'Senior' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function answerQuestion(character: GWCharacter, questionId: string): boolean {
  const q = QUESTIONS.find(q => q.id === questionId);
  if (!q) return false;
  if (q.attr === 'hairColor' && character.bald) return false;
  if (q.attr === 'hairStyle' && character.bald) return false;
  const attrValue = character[q.attr];
  if (Array.isArray(q.value)) return (q.value as string[]).includes(attrValue as string);
  return attrValue === q.value;
}

function randomCharacterId(): number {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── State ──────────────────────────────────────────────────────────────────────

const gwRooms = new Map<string, GWRoom>();
const TURN_MS = 30_000;
const RECONNECT_GRACE_MS = 60_000;
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ── Turn management ────────────────────────────────────────────────────────────

function startTurn(io: Server, room: GWRoom) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnEndsAt = Date.now() + TURN_MS;
  const pid = room.currentTurnPlayerId!;
  const player = room.players.find(p => p.playerId === pid);
  io.to(room.roomCode).emit('GW_TURN_START', {
    currentPlayerId: pid,
    currentPlayerName: player?.name ?? '',
    turnEndsAt: room.turnEndsAt,
  });
  room.turnTimer = setTimeout(() => {
    if (gwRooms.get(room.roomCode)?.phase !== 'PLAYING') return;
    advanceTurn(io, room);
  }, TURN_MS);
}

function advanceTurn(io: Server, room: GWRoom) {
  const [p0, p1] = room.players;
  room.currentTurnPlayerId =
    room.currentTurnPlayerId === p0.playerId ? p1.playerId : p0.playerId;
  startTurn(io, room);
}

// ── Setup ──────────────────────────────────────────────────────────────────────

export function setupGuessWhoEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    // ── Create room ──────────────────────────────────────────────────────────
    socket.on('GW_CREATE_ROOM', ({ playerName }: { playerName: string }) => {
      let roomCode = generateRoomCode();
      while (gwRooms.has(roomCode)) roomCode = generateRoomCode();

      const room: GWRoom = {
        roomCode,
        players: [{
          playerId: socket.id,
          currentSocketId: socket.id,
          name: playerName.trim().slice(0, 20) || 'Player',
          secretCharacterId: null,
          hasSelected: false,
        }],
        phase: 'WAITING',
        currentTurnPlayerId: null,
        turnEndsAt: null,
        turnTimer: null,
      };
      gwRooms.set(roomCode, room);
      socket.join(roomCode);
      socket.data.gwRoomCode = roomCode;
      socket.data.gwPlayerId = socket.id;
      socket.emit('GW_ROOM_CREATED', { roomCode, playerId: socket.id, playerName: playerName.trim().slice(0, 20) || 'Player' });
    });

    // ── Join room ────────────────────────────────────────────────────────────
    socket.on('GW_JOIN_ROOM', ({ playerName, roomCode }: { playerName: string; roomCode: string }) => {
      const room = gwRooms.get(roomCode.toUpperCase());
      if (!room) { socket.emit('GW_ERROR', { message: 'Room not found' }); return; }
      if (room.players.length >= 2 && room.phase === 'WAITING') {
        socket.emit('GW_ERROR', { message: 'Room is full' }); return;
      }

      // Reconnect path
      const reconnectKey = `${roomCode}:${playerName.trim()}`;
      const pendingTimer = reconnectTimers.get(reconnectKey);
      if (pendingTimer !== undefined) {
        clearTimeout(pendingTimer);
        reconnectTimers.delete(reconnectKey);
        const existingPlayer = room.players.find(p => p.name === playerName.trim());
        if (existingPlayer) {
          existingPlayer.currentSocketId = socket.id;
          socket.join(roomCode);
          socket.join(existingPlayer.playerId);
          socket.data.gwRoomCode = roomCode;
          socket.data.gwPlayerId = existingPlayer.playerId;
          const opponent = room.players.find(p => p.playerId !== existingPlayer.playerId);
          socket.emit('GW_RECONNECTED', {
            roomCode,
            playerId: existingPlayer.playerId,
            playerName: existingPlayer.name,
            phase: room.phase,
            myCharacterId: existingPlayer.secretCharacterId,
            opponentName: opponent?.name ?? '',
            opponentHasSelected: opponent?.hasSelected ?? false,
            currentTurnPlayerId: room.currentTurnPlayerId,
            turnEndsAt: room.turnEndsAt,
          });
          io.to(roomCode).emit('GW_PLAYER_RECONNECTED', { playerName: existingPlayer.name });
          return;
        }
      }

      if (room.players.length >= 2) { socket.emit('GW_ERROR', { message: 'Room is full' }); return; }

      const newPlayer: GWPlayer = {
        playerId: socket.id,
        currentSocketId: socket.id,
        name: playerName.trim().slice(0, 20) || 'Player 2',
        secretCharacterId: null,
        hasSelected: false,
      };
      room.players.push(newPlayer);
      socket.join(roomCode);
      socket.data.gwRoomCode = roomCode;
      socket.data.gwPlayerId = socket.id;

      // Notify existing player
      const existing = room.players[0];
      io.to(existing.playerId).emit('GW_PLAYER_JOINED', { player: { id: newPlayer.playerId, name: newPlayer.name } });
      socket.emit('GW_ROOM_JOINED', {
        roomCode,
        playerId: socket.id,
        playerName: newPlayer.name,
        players: room.players.map(p => ({ id: p.playerId, name: p.name })),
      });

      // Both players present — start selection phase
      room.phase = 'SELECTING';
      io.to(roomCode).emit('GW_SELECTION_PHASE', { timeoutMs: 30_000 });
    });

    // ── Select character ─────────────────────────────────────────────────────
    socket.on('GW_SELECT_CHARACTER', ({ characterId }: { characterId: number }) => {
      const roomCode = socket.data.gwRoomCode;
      const playerId = socket.data.gwPlayerId;
      const room = gwRooms.get(roomCode);
      if (!room || room.phase !== 'SELECTING') return;
      const player = room.players.find(p => p.playerId === playerId);
      if (!player) return;

      player.secretCharacterId = characterId;
      player.hasSelected = true;
      socket.emit('GW_CHARACTER_CONFIRMED', { characterId });
      const opponent = room.players.find(p => p.playerId !== playerId);
      if (opponent) io.to(opponent.playerId).emit('GW_OPPONENT_SELECTED');

      if (room.players.every(p => p.hasSelected)) {
        room.phase = 'PLAYING';
        // First turn goes to whichever player joined first
        room.currentTurnPlayerId = room.players[0].playerId;
        startTurn(io, room);
      }
    });

    // ── Ask question ─────────────────────────────────────────────────────────
    socket.on('GW_ASK_QUESTION', ({ questionId }: { questionId: string }) => {
      const roomCode = socket.data.gwRoomCode;
      const playerId = socket.data.gwPlayerId;
      const room = gwRooms.get(roomCode);
      if (!room || room.phase !== 'PLAYING') return;
      if (room.currentTurnPlayerId !== playerId) return;

      const opponent = room.players.find(p => p.playerId !== playerId);
      if (!opponent || opponent.secretCharacterId == null) return;

      const opponentChar = CHARACTERS.find(c => c.id === opponent.secretCharacterId)!;
      const answer = answerQuestion(opponentChar, questionId);
      const question = QUESTIONS.find(q => q.id === questionId);
      const asker = room.players.find(p => p.playerId === playerId);

      io.to(roomCode).emit('GW_QUESTION_RESULT', {
        questionId,
        questionText: question?.text ?? questionId,
        answer,
        askerName: asker?.name ?? '',
        askerId: playerId,
      });

      // Advance turn
      advanceTurn(io, room);
    });

    // ── Guess character ──────────────────────────────────────────────────────
    socket.on('GW_GUESS_CHARACTER', ({ characterId }: { characterId: number }) => {
      const roomCode = socket.data.gwRoomCode;
      const playerId = socket.data.gwPlayerId;
      const room = gwRooms.get(roomCode);
      if (!room || room.phase !== 'PLAYING') return;
      if (room.currentTurnPlayerId !== playerId) return;

      const opponent = room.players.find(p => p.playerId !== playerId);
      const guesser = room.players.find(p => p.playerId === playerId);
      if (!opponent || opponent.secretCharacterId == null) return;

      if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
      room.phase = 'FINISHED';

      const correct = characterId === opponent.secretCharacterId;
      const opponentChar = CHARACTERS.find(c => c.id === opponent.secretCharacterId)!;

      io.to(roomCode).emit('GW_GAME_OVER', {
        winnerId: correct ? playerId : opponent.playerId,
        winnerName: correct ? guesser!.name : opponent.name,
        loserId: correct ? opponent.playerId : playerId,
        loserName: correct ? opponent.name : guesser!.name,
        guesserId: playerId,
        guesserName: guesser!.name,
        guessedCharacterId: characterId,
        opponentCharacterId: opponent.secretCharacterId,
        opponentCharacterName: opponentChar.name,
        correct,
      });
    });

    // ── Leave room ───────────────────────────────────────────────────────────
    socket.on('GW_LEAVE_ROOM', () => cleanupPlayer(io, socket, true));

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const roomCode = socket.data.gwRoomCode;
      const playerId = socket.data.gwPlayerId;
      if (!roomCode || !playerId) return;
      const room = gwRooms.get(roomCode);
      if (!room) return;
      const player = room.players.find(p => p.playerId === playerId);
      if (!player) return;

      if (room.phase === 'PLAYING' || room.phase === 'SELECTING') {
        const reconnectKey = `${roomCode}:${player.name}`;
        io.to(roomCode).emit('GW_PLAYER_RECONNECTING', { playerName: player.name });
        const timer = setTimeout(() => {
          reconnectTimers.delete(reconnectKey);
          const r = gwRooms.get(roomCode);
          if (!r) return;
          r.phase = 'FINISHED';
          if (r.turnTimer) clearTimeout(r.turnTimer);
          io.to(roomCode).emit('GW_OPPONENT_LEFT', { playerName: player.name });
          gwRooms.delete(roomCode);
        }, RECONNECT_GRACE_MS);
        reconnectTimers.set(reconnectKey, timer);
      } else {
        cleanupPlayer(io, socket, false);
      }
    });
  });
}

function cleanupPlayer(io: Server, socket: Socket, intentional: boolean) {
  const roomCode = socket.data.gwRoomCode;
  const playerId = socket.data.gwPlayerId;
  if (!roomCode || !playerId) return;
  const room = gwRooms.get(roomCode);
  if (!room) return;

  const player = room.players.find(p => p.playerId === playerId);
  if (player) {
    const reconnectKey = `${roomCode}:${player.name}`;
    const t = reconnectTimers.get(reconnectKey);
    if (t) { clearTimeout(t); reconnectTimers.delete(reconnectKey); }
  }

  if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }

  if (intentional && room.phase === 'PLAYING') {
    room.phase = 'FINISHED';
    io.to(roomCode).emit('GW_OPPONENT_LEFT', { playerName: player?.name ?? 'Opponent' });
  }

  gwRooms.delete(roomCode);
  socket.leave(roomCode);
  socket.data.gwRoomCode = undefined;
  socket.data.gwPlayerId = undefined;
}
