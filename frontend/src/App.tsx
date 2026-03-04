import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';

// Connect to the backend server dynamically (uses proxy in dev, same origin in prod)
const socket: Socket = io({
  autoConnect: false,
});

export type Player = {
  id: string;
  name: string;
  avatar?: string;
  chili: number;
  status: string;
};

export type Card = {
  id: string;
  suit: string;
  value: number;
};

function App() {
  const [roomId, setRoomId] = useState('');
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'merda_called'>('lobby');
  const [hand, setHand] = useState<Card[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [lastPenalty, setLastPenalty] = useState<{ card: Card, loserId: string } | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => { });
    socket.on('disconnect', () => {
      setRoomId('');
      setPlayer(null);
      setPlayers([]);
      setGameState('lobby');
      setHand([]);
      setLastPenalty(null);
      setIsCreator(false);
      setErrorMsg('Connessione persa al Server. Rientra nella stanza.');
      setTimeout(() => setErrorMsg(''), 6000);
    });

    socket.on('room_update', (roomPlayers: Player[]) => {
      setPlayers(roomPlayers);
      const me = roomPlayers.find(p => p.id === socket.id);
      if (me) setPlayer(me);
    });

    socket.on('room_created', (newRoomId: string) => {
      setRoomId(newRoomId);
      setIsCreator(true);
    });

    socket.on('game_started', ({ hand, players }) => {
      setHand(hand);
      setPlayers(players);
      setGameState('playing');
      setLastPenalty(null);
    });

    socket.on('execute_pass', ({ hand }) => {
      setHand(hand);
    });

    socket.on('player_ready', () => {
      // Could show a checkmark next to players who are ready
    });

    socket.on('turn_started', () => {
      // Re-enable selecting card
    });

    socket.on('merda_reaction_phase', ({ winnerId }) => {
      setGameState('merda_called');
      setWinnerId(winnerId);
    });

    socket.on('round_end', ({ loserId, penaltyCard, players }) => {
      setGameState('lobby'); // Go back to waiting to restart or auto-restart
      setLastPenalty({ card: penaltyCard, loserId });
      setPlayers(players);
      setHand([]);
      const me = players.find((p: Player) => p.id === socket.id);
      if (me) setPlayer(me);
    });

    socket.on('game_canceled', (msg) => {
      setGameState('lobby');
      setHand([]);
      setLastPenalty(null);
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    });

    socket.on('error', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_update');
      socket.off('game_started');
      socket.off('execute_pass');
      socket.off('player_ready');
      socket.off('turn_started');
      socket.off('merda_reaction_phase');
      socket.off('round_end');
      socket.off('game_canceled');
      socket.off('error');
      socket.off('room_created');
    };
  }, []);

  const handleJoin = (room: string, name: string, avatar?: string) => {
    setRoomId(room);
    setIsCreator(false);
    socket.emit('join_room', { roomId: room, playerName: name, avatar });
  };

  const handleCreateRoom = (name: string, avatar?: string) => {
    socket.emit('create_room', { playerName: name, avatar });
  };

  const handleStartGame = () => {
    socket.emit('start_game', roomId);
  };

  const handlePassCard = (cardId: string) => {
    socket.emit('select_card_to_pass', { roomId, cardId });
  };

  const handleMerdaShouted = () => {
    socket.emit('merda_shouted', roomId);
  };

  const handleMerdaReaction = () => {
    socket.emit('merda_reaction', { roomId, timestamp: Date.now() });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room');
    setRoomId('');
    setPlayer(null);
    setPlayers([]);
    setGameState('lobby');
    setHand([]);
    setLastPenalty(null);
    setIsCreator(false);
    setErrorMsg('Hai abbandonato la partita');
    setTimeout(() => setErrorMsg(''), 5000);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-900 text-neutral-100 font-sans selection:bg-red-500/30">

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-bounce">
          {errorMsg}
        </div>
      )}

      {/* Main Views */}
      {gameState === 'lobby' ? (
        <Lobby
          onJoin={handleJoin}
          onCreate={handleCreateRoom}
          roomId={roomId}
          players={players}
          player={player}
          onStart={handleStartGame}
          lastPenalty={lastPenalty}
          onLeaveRoom={handleLeaveRoom}
          isCreator={isCreator}
        />
      ) : (
        <GameTable
          player={player}
          players={players}
          hand={hand}
          gameState={gameState}
          winnerId={winnerId}
          onPassCard={handlePassCard}
          onMerdaShouted={handleMerdaShouted}
          onMerdaReaction={handleMerdaReaction}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
