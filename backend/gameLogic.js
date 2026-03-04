const rooms = new Map();

export function setupGameHandlers(io, socket) {
    function handleLeave() {
        const roomId = socket.roomId;
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1) return;

        const playerName = room.players[playerIndex].name;
        room.players.splice(playerIndex, 1);
        console.log(`[i] Player ${playerName} left room ${roomId}`);

        if (room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`[i] Room ${roomId} deleted (empty)`);
        } else {
            if (room.status !== 'waiting') {
                room.status = 'waiting';
                room.players.forEach(p => {
                    p.hand = [];
                    p.status = 'waiting';
                    delete p.selectedCard;
                });
                io.to(roomId).emit('game_canceled', `Il giocatore ${playerName} ha abbandonato. Partita annullata.`);
            }
            io.to(roomId).emit('room_update', room.players);
        }

        socket.leave(roomId);
        delete socket.roomId;
    }

    socket.on('leave_room', () => {
        handleLeave();
    });

    socket.on('disconnect', () => {
        handleLeave();
    });

    // 1. Create and Join Room
    socket.on('create_room', ({ playerName }) => {
        if (socket.roomId) handleLeave();

        let roomId;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        do {
            roomId = '';
            for (let i = 0; i < 5; i++) {
                roomId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (rooms.has(roomId));

        socket.join(roomId);
        socket.roomId = roomId;

        const player = {
            id: socket.id,
            name: playerName || 'Creatore',
            hand: [],
            chili: 0,
            status: 'waiting'
        };

        rooms.set(roomId, {
            id: roomId,
            creatorId: socket.id,
            players: [player],
            status: 'waiting',
        });

        const room = rooms.get(roomId);
        socket.emit('room_created', roomId);
        io.to(roomId).emit('room_update', room.players);
        console.log(`[i] Room ${roomId} created by ${player.name}`);
    });

    socket.on('join_room', ({ roomId, playerName }) => {
        if (socket.roomId && socket.roomId !== roomId) handleLeave();

        if (!rooms.has(roomId)) {
            socket.emit('error', 'Stanza non trovata. Controlla il codice.');
            return;
        }

        const room = rooms.get(roomId);

        if (room.players.length >= 9) {
            socket.emit('error', 'Stanza piena. Massimo 9 giocatori.');
            return;
        }
        if (room.status !== 'waiting') {
            socket.emit('error', 'La partita è già iniziata.');
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        const player = {
            id: socket.id,
            name: playerName || `Player ${room.players.length + 1}`,
            hand: [],
            chili: 0,
            status: 'waiting'
        };

        room.players.push(player);
        io.to(roomId).emit('room_update', room.players);
        console.log(`[i] Player ${player.name} joined room ${roomId}`);
    });

    // 2. Start Game (Deck creation and split)
    socket.on('start_game', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        if (room.creatorId !== socket.id) {
            socket.emit('error', 'Solo il creatore può avviare la partita.');
            return;
        }

        if (room.players.length < 2) {
            socket.emit('error', 'Servono almeno 2 giocatori per iniziare la partita.');
            return;
        }

        const N = room.players.length;

        // Generate Deck
        const suits = ['Spade', 'Coppe', 'Denari', 'Bastoni'];
        let fullDeck = [];
        suits.forEach(suit => {
            for (let i = 1; i <= 10; i++) {
                fullDeck.push({ suit, value: i, id: `${suit}-${i}` });
            }
        });

        // Shuffle
        fullDeck.sort(() => Math.random() - 0.5);

        // Split deck dynamically based on N
        let playDeck = fullDeck.filter(c => c.value >= 1 && c.value <= N);
        room.penaltyDeck = fullDeck.filter(c => c.value > N);

        // Shuffle playdeck again just in case
        playDeck.sort(() => Math.random() - 0.5);

        // Deal 4 cards each
        room.players.forEach(p => {
            p.hand = playDeck.splice(0, 4);
            p.status = 'playing';
        });

        room.status = 'playing';
        console.log(`[i] Game started in room ${roomId}`);

        // Send state securely to each player so they only see their hand
        room.players.forEach(p => {
            io.to(p.id).emit('game_started', {
                hand: p.hand,
                players: room.players.map(op => ({ id: op.id, name: op.name, chili: op.chili, status: op.status }))
            });
        });
    });

    // 3. Select Card to Pass
    socket.on('select_card_to_pass', ({ roomId, cardId }) => {
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.status === 'ready_to_pass') return;

        player.selectedCard = player.hand.find(c => c.id === cardId);
        if (player.selectedCard) {
            player.status = 'ready_to_pass';
            io.to(roomId).emit('player_ready', { playerId: player.id });
        }

        // Check if all 4 players are ready
        if (room.players.every(p => p.status === 'ready_to_pass')) {
            // Execute pass
            // Player i passes to Player i-1 (left) cyclicly
            const passedCards = room.players.map(p => {
                p.hand = p.hand.filter(c => c.id !== p.selectedCard.id);
                return { card: p.selectedCard };
            });

            room.players.forEach((p, i) => {
                const prevPlayerIndex = (i === 0) ? 3 : i - 1;
                const receivedCard = passedCards[prevPlayerIndex].card;
                p.hand.push(receivedCard);
                p.status = 'playing';
                delete p.selectedCard;

                io.to(p.id).emit('execute_pass', { hand: p.hand });
            });

            io.to(roomId).emit('turn_started'); // all clear
        }
    });

    // 4. Merda Shouted
    socket.on('merda_shouted', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Validate 4 cards of same value
        if (player.hand.length === 4) {
            const firstValue = player.hand[0].value;
            const isWin = player.hand.every(c => c.value === firstValue);

            if (isWin) {
                room.status = 'merda_called';
                room.merdaReactions = [];
                // Alert others to show the button
                io.to(roomId).emit('merda_reaction_phase', { winnerId: player.id });

                // Failsafe timer: 10 seconds max
                room.merdaTimeout = setTimeout(() => {
                    handleRoundEnd(roomId, io);
                }, 10000);
            }
        }
    });

    // 5. Merda Reaction Click
    socket.on('merda_reaction', ({ roomId, timestamp }) => {
        const room = rooms.get(roomId);
        if (!room || room.status !== 'merda_called') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Verify it's not the winner themselves registering a reaction
        const winnerId = room.players.find(p => p.hand.length === 4 && p.hand.every(c => c.value === p.hand[0].value))?.id;
        if (socket.id === winnerId) return;

        if (!room.merdaReactions.find(r => r.id === socket.id)) {
            room.merdaReactions.push({ id: socket.id, timestamp });

            // If 3 people clicked, end round
            if (room.merdaReactions.length === 3) {
                clearTimeout(room.merdaTimeout);
                handleRoundEnd(roomId, io);
            }
        }
    });

    function handleRoundEnd(roomId, io) {
        const room = rooms.get(roomId);
        if (!room || room.status !== 'merda_called') return;

        room.merdaReactions.sort((a, b) => a.timestamp - b.timestamp);

        const winnerId = room.players.find(p => p.hand.length === 4 && p.hand.every(c => c.value === p.hand[0].value))?.id;
        const reactors = room.merdaReactions.map(r => r.id);

        let loserId = null;
        const missingPlayers = room.players.filter(p => p.id !== winnerId && !reactors.includes(p.id));

        if (missingPlayers.length > 0) {
            loserId = missingPlayers[0].id; // Assign to first missing if timeout
        } else {
            loserId = room.merdaReactions[room.merdaReactions.length - 1].id;
        }

        const loser = room.players.find(p => p.id === loserId);

        // If penalty deck is empty, reset it based on N.
        if (room.penaltyDeck.length === 0) {
            const N = room.players.length;
            const suits = ['Spade', 'Coppe', 'Denari', 'Bastoni'];
            let fullDeck = [];
            suits.forEach(suit => {
                for (let i = N + 1; i <= 10; i++) {
                    fullDeck.push({ suit, value: i, id: `${suit}-${i}` });
                }
            });
            fullDeck.sort(() => Math.random() - 0.5);
            room.penaltyDeck = fullDeck;
        }

        const penaltyCard = room.penaltyDeck.pop() || { suit: 'Denari', value: 1 };
        if ((penaltyCard.value === 7 || penaltyCard.value === 10) && penaltyCard.suit === 'Denari') {
            loser.chili = 0;
        } else {
            loser.chili += penaltyCard.value;
        }

        room.status = 'waiting';
        room.players.forEach(p => {
            p.hand = [];
            p.status = 'waiting';
        });

        io.to(roomId).emit('round_end', {
            loserId,
            penaltyCard,
            players: room.players.map(p => ({ id: p.id, name: p.name, chili: p.chili, status: p.status }))
        });
    }

}
