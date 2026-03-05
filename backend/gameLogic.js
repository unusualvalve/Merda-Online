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
    socket.on('create_room', ({ playerName, avatar }) => {
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
            avatar: avatar || null,
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

    socket.on('join_room', ({ roomId, playerName, avatar }) => {
        if (socket.roomId && socket.roomId !== roomId) handleLeave();

        if (!rooms.has(roomId)) {
            socket.emit('error', 'Stanza non trovata. Controlla il codice.');
            return;
        }

        const room = rooms.get(roomId);

        if (room.players.length >= 8) {
            socket.emit('error', 'Stanza piena. Massimo 8 giocatori.');
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
            avatar: avatar || null,
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
        const handSize = N >= 5 ? 5 : 4;

        // Numero totale di carte necessarie per poter distribuire handSize a tutti
        const requiredCards = N * handSize;
        // Moltiplichiamo il valore massimo finché non abbiamo abbastanza carte (ogni valore ha 4 semi)
        // Per N < 4 teniamo fissa la finta rotazione a 1-4 (16 carte), altrimenti copriamo
        let maxPlayValue = Math.max(4, Math.ceil(requiredCards / 4));

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
        let playDeck = fullDeck.filter(c => c.value >= 1 && c.value <= maxPlayValue);
        room.penaltyDeck = fullDeck.filter(c => c.value > maxPlayValue);

        // Shuffle playdeck again just in case
        playDeck.sort(() => Math.random() - 0.5);

        // Se N < 4, creiamo N mani fantasma per arrivare a 4 giocatori al tavolo "virtuale"
        room.dummyHands = [];
        if (N < 4) {
            const dummyCount = 4 - N;
            for (let i = 0; i < dummyCount; i++) {
                room.dummyHands.push({
                    id: `dummy-${i + 1}`,
                    name: `Bot ${i + 1}`,
                    hand: playDeck.splice(0, handSize),
                    chili: 0
                });
            }
        }

        // Deal handSize cards each to real players
        room.players.forEach(p => {
            p.hand = playDeck.splice(0, handSize);
            p.status = 'playing';
        });

        room.status = 'playing';
        console.log(`[i] Game started in room ${roomId}`);

        // Send state securely to each player so they only see their hand
        room.players.forEach(p => {
            io.to(p.id).emit('game_started', {
                hand: p.hand,
                players: room.players.map(op => ({ id: op.id, name: op.name, avatar: op.avatar, chili: op.chili, status: op.status }))
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

        // Check if all players are ready
        if (room.players.every(p => p.status === 'ready_to_pass')) {
            // Uniamo i giocatori reali e i dummy in un unico tavolo virtuale circolare
            const virtualTable = [
                ...room.players,
                ...(room.dummyHands || [])
            ];

            const totalActors = virtualTable.length; // Sarà almeno 4

            // Per i dummy, scegliamo la carta da passare causalmente
            if (room.dummyHands && room.dummyHands.length > 0) {
                room.dummyHands.forEach(dummy => {
                    const randomIndex = Math.floor(Math.random() * dummy.hand.length);
                    dummy.selectedCard = dummy.hand[randomIndex];
                });
            }

            // Prepariamo l'elenco delle carte passate e puliamo le mani
            const passedCards = virtualTable.map(actor => {
                actor.hand = actor.hand.filter(c => c.id !== actor.selectedCard.id);
                return { card: actor.selectedCard };
            });

            // Eseguiamo la rotazione per tutti
            virtualTable.forEach((actor, i) => {
                const prevActorIndex = (i === 0) ? totalActors - 1 : i - 1;
                const receivedCard = passedCards[prevActorIndex].card;
                actor.hand.push(receivedCard);
                delete actor.selectedCard;

                // Modifichiamo lo stato e inviamo aggiornamenti solo ai giocatori reali
                if (actor.status) {
                    actor.status = 'playing';
                    io.to(actor.id).emit('execute_pass', { hand: actor.hand });
                }
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
        // The player hand could be 4 or 5 cards long
        if (player.hand.length >= 4) {
            // Find if there is any value that repeats 4 times in the hand
            const isWin = player.hand.some(c => player.hand.filter(c2 => c2.value === c.value).length === 4);

            if (isWin) {
                room.status = 'merda_called';
                room.merdaReactions = [];
                room.winnerId = player.id;

                // Alert others to show the button
                io.to(roomId).emit('merda_reaction_phase', { winnerId: player.id });

                // Broadcast reaction status (initially empty)
                io.to(roomId).emit('reaction_update', []);

                // 2-3 Player Dummy Reactions
                const totalOpponents = (room.players.length + (room.dummyHands ? room.dummyHands.length : 0)) - 1;

                if (room.dummyHands && room.dummyHands.length > 0) {
                    room.dummyHands.forEach(dummy => {
                        const delay = 400 + Math.random() * 1200; // 0.4s to 1.6s
                        dummy.reactionTimer = setTimeout(() => {
                            if (room.status === 'merda_called') {
                                if (!room.merdaReactions.find(r => r.id === dummy.id)) {
                                    room.merdaReactions.push({ id: dummy.id, timestamp: Date.now() });
                                    io.to(roomId).emit('reaction_update', room.merdaReactions.map(r => r.id));

                                    if (room.merdaReactions.length >= totalOpponents) {
                                        clearTimeout(room.merdaTimeout);
                                        handleRoundEnd(roomId, io);
                                    }
                                }
                            }
                        }, delay);
                    });
                }

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
        if (socket.id === room.winnerId) return;

        if (!room.merdaReactions.find(r => r.id === socket.id)) {
            room.merdaReactions.push({ id: socket.id, timestamp });

            // Broadcast Safe Players
            io.to(roomId).emit('reaction_update', room.merdaReactions.map(r => r.id));

            // End round if everyone else has reacted
            const totalOpponents = (room.players.length + (room.dummyHands ? room.dummyHands.length : 0)) - 1;
            if (room.merdaReactions.length >= totalOpponents) {
                clearTimeout(room.merdaTimeout);
                handleRoundEnd(roomId, io);
            }
        }
    });

    function handleRoundEnd(roomId, io) {
        const room = rooms.get(roomId);
        if (!room || room.status !== 'merda_called') return;

        room.merdaReactions.sort((a, b) => a.timestamp - b.timestamp);

        const winnerId = room.winnerId;
        const reactors = room.merdaReactions.map(r => r.id);

        let loserId = null;
        // Search across real and dummy players
        const allOpponents = [
            ...room.players.map(p => ({ id: p.id, isDummy: false })),
            ...(room.dummyHands ? room.dummyHands.map(d => ({ id: d.id, isDummy: true })) : [])
        ].filter(p => p.id !== winnerId);

        const missing = allOpponents.filter(p => !reactors.includes(p.id));

        if (missing.length > 0) {
            loserId = missing[0].id; // First one who didn't react
        } else if (room.merdaReactions.length > 0) {
            loserId = room.merdaReactions[room.merdaReactions.length - 1].id; // Last one to react
        } else {
            // Extremal edge case: winner only player?
            loserId = winnerId;
        }

        if (room.penaltyDeck.length === 0) {
            const N = room.players.length;
            const requiredCards = N * (N >= 5 ? 5 : 4);
            const maxPlayValue = Math.max(4, Math.ceil(requiredCards / 4));
            const suits = ['Spade', 'Coppe', 'Denari', 'Bastoni'];
            let fullDeck = [];
            suits.forEach(suit => {
                for (let i = maxPlayValue + 1; i <= 10; i++) {
                    fullDeck.push({ suit, value: i, id: `${suit}-${i}` });
                }
            });
            fullDeck.sort(() => Math.random() - 0.5);
            room.penaltyDeck = fullDeck;
        }

        const penaltyCard = room.penaltyDeck.pop() || { suit: 'Denari', value: 1 };
        let loser = room.players.find(p => p.id === loserId);

        // If not a human, check dummies
        if (!loser && room.dummyHands) {
            loser = room.dummyHands.find(d => d.id === loserId);
        }

        if (loser) {
            if ((penaltyCard.value === 7 || penaltyCard.value === 10) && penaltyCard.suit === 'Denari') {
                loser.chili = 0;
            } else {
                if (loser.chili === undefined) loser.chili = 0;
                loser.chili += penaltyCard.value;
            }
        } else {
            console.error(`[handleRoundEnd] No loser found for ID: ${loserId}`);
        }

        room.status = 'waiting';
        room.players.forEach(p => {
            p.hand = [];
            p.status = 'waiting';
        });

        // Cleanup
        clearTimeout(room.merdaTimeout);
        if (room.dummyHands) {
            room.dummyHands.forEach(d => {
                if (d.reactionTimer) clearTimeout(d.reactionTimer);
            });
        }
        delete room.winnerId;

        io.to(roomId).emit('round_end', {
            loserId,
            loserName: loser ? loser.name : 'Sconosciuto',
            penaltyCard,
            players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, chili: p.chili, status: p.status }))
        });
    }

}
