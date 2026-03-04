import React, { useState, useEffect } from 'react';
import type { Player, Card } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

interface GameTableProps {
    player: Player | null;
    players: Player[];
    hand: Card[];
    gameState: 'lobby' | 'playing' | 'merda_called';
    winnerId: string | null;
    onPassCard: (cardId: string) => void;
    onMerdaShouted: () => void;
    onMerdaReaction: () => void;
    onLeaveRoom: () => void;
}

const getCardImagePath = (suit: string, value: number) => {
    return `/cards/${suit.toLowerCase()}-${value}.png`;
};

const GameTable: React.FC<GameTableProps> = ({
    player, players, hand, gameState, winnerId,
    onPassCard, onMerdaShouted, onMerdaReaction, onLeaveRoom
}) => {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Reset selection when hand changes (new turn)
    useEffect(() => {
        setSelectedCardId(null);
    }, [hand]);

    // Handle auto-shouting if 4 cards match
    useEffect(() => {
        if (hand.length === 4) {
            const firstVal = hand[0].value;
            hand.every(c => c.value === firstVal);
            // Wait for user to shout? Our specs say "Applica pulsante grosso, il giocatore DEVE cliccarlo"
            // So we don't auto shout, we just show a button for them to trigger it.
        }
    }, [hand]);

    if (!player) return null;

    const isWinCondition = hand.length === 4 && hand.every(c => c.value === hand[0].value);
    const opponents = players.filter(p => p.id !== player.id);
    // Simple mapping: 0 -> Left, 1 -> Top, 2 -> Right
    const leftOpponent = opponents[0];
    const topOpponent = opponents[1];
    const rightOpponent = opponents[2];

    const handleCardClick = (cardId: string) => {
        if (gameState !== 'playing' || selectedCardId) return;
        setSelectedCardId(cardId);
        onPassCard(cardId);
    };

    return (
        <div className="relative w-full h-screen bg-[#1c3a26] overflow-hidden flex flex-col justify-between p-4 isolate">
            {/* Table Texture/Border */}
            <div className="absolute inset-0 border-[10px] md:border-[20px] border-amber-900/50 rounded-2xl md:rounded-3xl m-2 md:m-4 pointer-events-none mix-blend-overlay shadow-inner z-0" />
            <div className="absolute inset-[20px] md:inset-[40px] border-2 border-white/5 rounded-xl pointer-events-none z-0" />

            {/* Top and Sides Opponents */}
            <div className="relative z-10 flex-1 flex flex-col">
                {topOpponent && (
                    <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 text-center text-white p-2 md:p-3 bg-black/40 rounded-xl border border-white/10 backdrop-blur-sm">
                        <p className="font-bold text-xs md:text-base">{topOpponent.name}</p>
                        <p className="text-[10px] md:text-xs text-orange-400">💩 {topOpponent.chili} Kg</p>
                    </div>
                )}

                {leftOpponent && (
                    <div className="absolute top-1/2 left-0 md:left-8 -translate-y-1/2 rotate-90 md:rotate-0 origin-left md:origin-center text-center text-white p-2 md:p-3 bg-black/40 rounded-xl border border-white/10 backdrop-blur-sm ml-2 md:ml-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px] md:max-w-none">
                        <p className="font-bold text-xs md:text-base">{leftOpponent.name}</p>
                        <p className="text-[10px] md:text-xs text-orange-400">💩 {leftOpponent.chili} Kg</p>
                    </div>
                )}

                {rightOpponent && (
                    <div className="absolute top-1/2 right-0 md:right-8 -translate-y-1/2 -rotate-90 md:rotate-0 origin-right md:origin-center text-center text-white p-2 md:p-3 bg-black/40 rounded-xl border border-white/10 backdrop-blur-sm mr-2 md:mr-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px] md:max-w-none">
                        <p className="font-bold text-xs md:text-base">{rightOpponent.name}</p>
                        <p className="text-[10px] md:text-xs text-orange-400">💩 {rightOpponent.chili} Kg</p>
                    </div>
                )}
            </div>

            {/* Center of the Table (Reaction / Shout Buttons) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                <AnimatePresence>
                    {gameState === 'playing' && isWinCondition && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            onClick={onMerdaShouted}
                            className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-red-500 to-red-800 shadow-[0_0_50px_rgba(220,38,38,0.6)] border-4 md:border-8 border-red-900 flex items-center justify-center text-white font-black text-2xl md:text-4xl cursor-pointer active:scale-95 transition-transform"
                        >
                            MERDA!
                        </motion.button>
                    )}

                    {gameState === 'merda_called' && winnerId !== player.id && (
                        <motion.button
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1.2, rotate: 0 }}
                            onClick={onMerdaReaction}
                            className="w-40 h-40 md:w-64 md:h-64 rounded-full bg-gradient-to-tr from-orange-600 to-red-600 shadow-[0_0_100px_rgba(234,88,12,0.8)] border-4 border-white flex flex-col items-center justify-center text-white font-black cursor-pointer active:scale-90 transition-transform hover:rotate-12"
                        >
                            <span className="text-2xl md:text-5xl uppercase drop-shadow-lg">SALVATI!</span>
                            <span className="text-[10px] md:text-sm mt-1 md:mt-2 font-normal opacity-80">(Clicca ORA!)</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Top Left Leave Button */}
            <div className="absolute top-3 left-3 md:top-6 md:left-6 z-40">
                <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-[10px] md:text-xs font-bold uppercase tracking-wider px-2 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl flex items-center gap-1 md:gap-2 transition-all shadow-lg backdrop-blur-md active:scale-95"
                >
                    <span className="text-base md:text-lg leading-none font-normal">&times;</span>
                    <span className="hidden sm:inline">Abbandona</span>
                </button>
            </div>

            {/* Leave Confirmation Modal */}
            <AnimatePresence>
                {showLeaveConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-2">Vuoi abbandonare?</h3>
                            <p className="text-neutral-400 mb-6 text-sm">
                                Se abbandoni ora, la partita in corso verrà annullata per tutti i giocatori al tavolo.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowLeaveConfirm(false)}
                                    className="px-4 py-2 font-medium text-neutral-300 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLeaveConfirm(false);
                                        onLeaveRoom();
                                    }}
                                    className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-colors cursor-pointer"
                                >
                                    Sì, Abbandona
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scoreboard Sidebar */}
            <div className="absolute top-3 right-3 md:top-6 md:right-6 z-40 bg-black/60 backdrop-blur-md p-2 md:p-4 rounded-lg md:rounded-xl border border-white/10 w-32 md:w-48 shadow-2xl">
                <h3 className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-3 pb-1 md:pb-2 border-b border-white/10">Scoreboard</h3>
                <div className="space-y-1 md:space-y-2">
                    {players.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-[10px] md:text-sm">
                            <span className={`truncate mr-1 md:mr-2 ${p.id === player.id ? 'text-white font-bold' : 'text-neutral-400'}`}>
                                {p.name}
                            </span>
                            <span className="text-orange-400 font-mono font-bold bg-orange-500/10 px-1 md:px-1.5 rounded">
                                {p.chili}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Player Hand */}
            <div className="relative z-20 flex flex-col items-center pb-4 md:pb-8 pt-10 md:pt-20">
                <p className="text-white mb-2 md:mb-4 text-[10px] md:text-sm font-bold bg-black/40 px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                    {gameState === 'playing' ? (
                        selectedCardId ? 'In attesa degli altri...' : 'Scegli la carta da passare'
                    ) : 'Round Terminato'}
                </p>

                <div className="flex gap-2 sm:gap-4 items-end h-36 sm:h-44 md:h-60 mt-auto">
                    <AnimatePresence>
                        {hand.map((card, i) => {
                            const isSelected = selectedCardId === card.id;

                            return (
                                <motion.div
                                    key={card.id}
                                    layoutId={card.id}
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{
                                        y: isSelected ? -20 : 0,
                                        opacity: 1,
                                        scale: isSelected ? 1.05 : 1,
                                    }}
                                    whileHover={!selectedCardId && gameState === 'playing' ? { y: -10, rotate: (i - 1.5) * 2 } : {}}
                                    exit={{ y: -100, x: -100, opacity: 0, scale: 0.5 }}
                                    onClick={() => handleCardClick(card.id)}
                                    className={`relative w-16 h-28 sm:w-20 sm:h-32 md:w-32 md:h-52 lg:w-40 lg:h-60 bg-transparent rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all 
                                        ${isSelected ? 'shadow-[0_0_20px_rgba(255,255,255,0.4)] ring-2 md:ring-4 ring-white z-50' : 'hover:shadow-xl md:hover:shadow-2xl'}
                                        ${gameState !== 'playing' ? 'opacity-70 pointer-events-none' : ''}
                                    `}
                                    style={{ transformOrigin: 'bottom center' }}
                                >
                                    <img
                                        src={getCardImagePath(card.suit, card.value)}
                                        alt={`${card.value} di ${card.suit}`}
                                        className="w-full h-full object-cover rounded-xl shadow-lg border-2 border-white/10"
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

        </div>
    );
};

export default GameTable;
