import React, { useState, useEffect } from 'react';
import type { Player, Card } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Check } from 'lucide-react';

interface GameTableProps {
    player: Player | null;
    players: Player[];
    hand: Card[];
    gameState: 'lobby' | 'playing' | 'merda_called';
    winnerId: string | null;
    reactedPlayers?: string[];
    onPassCard: (cardId: string) => void;
    onMerdaShouted: () => void;
    onMerdaReaction: () => void;
    onLeaveRoom: () => void;
}

const getCardImagePath = (suit: string, value: number) => {
    // Il pack bastoni ha i primi 5 valori in jpeg
    const ext = (suit.toLowerCase() === 'bastoni' && value <= 5) ? 'jpeg' : 'png';
    return `/cards/${suit.toLowerCase()}-${value}.${ext}?v=2`;
};

const GameTable: React.FC<GameTableProps> = ({
    player, players, hand, gameState, winnerId, reactedPlayers = [],
    onPassCard, onMerdaShouted, onMerdaReaction, onLeaveRoom
}) => {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [hasLocalReacted, setHasLocalReacted] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Reset selection when hand changes (new turn)
    useEffect(() => {
        setSelectedCardId(null);
        setHasLocalReacted(false);
    }, [hand, gameState]);

    if (!player) return null;

    const handSize = players.length >= 5 ? 5 : 4;
    const isWinCondition = hand.length >= 4 && hand.some(c => hand.filter(c2 => c2.value === c.value).length === 4);
    const opponents = players.filter(p => p.id !== player.id);

    const getOpponentPosition = (index: number, total: number): React.CSSProperties => {
        // Distribute strictly around the top arc (180 to 0 degrees)
        const startAngle = Math.PI * 1.05;
        const endAngle = -Math.PI * 0.05;

        let angle;
        if (total === 1) {
            angle = Math.PI / 2; // Top center
        } else {
            angle = startAngle - (index / (total - 1)) * (startAngle - endAngle);
        }

        const rx = 42; // Horizontal radius (%)
        const ry = 38; // Vertical radius (%) - Reduced to bring players down

        const x = 50 + rx * Math.cos(angle);
        const y = 52 - ry * Math.sin(angle); // Center Y shifted down to 52 for more top headroom

        return {
            position: 'absolute',
            top: `${y}%`,
            left: `${x}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10
        };
    };

    const handleCardClick = (cardId: string) => {
        if (gameState !== 'playing' || selectedCardId) return;
        setSelectedCardId(cardId);
        onPassCard(cardId);
    };

    return (
        <div className="relative w-full h-screen bg-[#1c3a26] overflow-hidden flex flex-col justify-between items-center p-4 isolate">
            {/* Table Texture/Border */}
            <div className="absolute inset-0 border-[10px] md:border-[20px] border-amber-900/50 rounded-2xl md:rounded-3xl m-2 md:m-4 pointer-events-none mix-blend-overlay shadow-inner z-0" />
            <div className="absolute inset-[20px] md:inset-[40px] border-2 border-white/5 rounded-xl pointer-events-none z-0" />

            {/* Central Table Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-96 md:h-96 border border-white/5 rounded-full pointer-events-none" />

            {/* Opponents Container (Circular/Edge Layout) */}
            <div className="absolute inset-0 pointer-events-none z-10">
                {opponents.map((opp, index) => (
                    <div key={opp.id} style={getOpponentPosition(index, opponents.length)} className="flex flex-col items-center">
                        <div className="relative text-center">
                            {/* Avatar Circolare */}
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-white/30 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] bg-neutral-800 flex items-center justify-center shrink-0">
                                {opp.avatar ? (
                                    <img src={opp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-neutral-500" />
                                )}
                            </div>

                            {/* Nome (Badge) */}
                            <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-2 py-0.5 md:px-4 md:py-1 rounded-full backdrop-blur-md whitespace-nowrap shadow-xl">
                                <p className="font-bold text-[10px] md:text-xs text-white tracking-widest uppercase">{opp.name}</p>
                            </div>

                            {/* Chili Merda Badge */}
                            <div className="absolute -top-1 -right-4 bg-orange-600 border border-white/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg text-[10px] md:text-xs font-bold text-white shadow-xl flex items-center gap-1">
                                💩 {opp.chili}
                            </div>

                            {/* Stato Reazione (SALVO/MERDA) */}
                            <AnimatePresence>
                                {gameState === 'merda_called' && (
                                    <>
                                        {winnerId === opp.id && (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -20 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded border-2 border-white shadow-lg z-50 uppercase whitespace-nowrap"
                                            >
                                                MERDA!
                                            </motion.div>
                                        )}
                                        {reactedPlayers.includes(opp.id) && (
                                            <motion.div
                                                initial={{ scale: 0, y: 10 }}
                                                animate={{ scale: 1, y: 0 }}
                                                className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded border-2 border-white shadow-lg z-50 flex items-center gap-1 uppercase whitespace-nowrap"
                                            >
                                                <Check className="w-3 h-3" /> SALVO
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Fanned Cards (UNO Style) */}
                        <div className="flex justify-center -space-x-3 md:-space-x-5 mt-4 md:mt-10 scale-75 md:scale-100">
                            {Array.from({ length: handSize }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        transform: `rotate(${(i - (handSize - 1) / 2) * 15}deg) translateY(${Math.abs(i - (handSize - 1) / 2) * 4}px)`,
                                        transformOrigin: 'bottom center'
                                    }}
                                    className="w-6 h-9 md:w-10 md:h-15 rounded-md shadow-[0_0_15px_rgba(0,0,0,1)] border border-white/20 bg-gradient-to-br from-red-600 to-red-950"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Right Scoreboard (PC Only) */}
            <div className="hidden lg:block absolute top-6 right-6 z-40 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 w-48 shadow-2xl">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-3 pb-2 border-b border-white/10">Scoreboard</h3>
                <div className="space-y-2">
                    {players.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-sm">
                            <span className={`truncate mr-2 ${p.id === player.id ? 'text-white font-bold' : 'text-neutral-400'}`}>
                                {p.name}
                            </span>
                            <span className="text-orange-400 font-mono font-bold bg-orange-500/10 px-1.5 rounded">
                                {p.chili}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Center Top Info Indicator */}
            <div className="relative z-30 pt-4 flex flex-col items-center gap-4">
                <AnimatePresence>
                    {gameState === 'playing' && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-lg"
                        >
                            <p className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest">
                                {selectedCardId ? 'In attesa del turno...' : 'Scegli la carta da passare'}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                            className="w-32 h-32 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-red-500 to-red-800 shadow-[0_0_80px_rgba(220,38,38,0.8)] border-4 md:border-8 border-red-900 flex items-center justify-center text-white font-black text-2xl md:text-5xl cursor-pointer active:scale-95 transition-transform animate-pulse"
                        >
                            MERDA!
                        </motion.button>
                    )}

                    {gameState === 'merda_called' && winnerId !== player.id && !hasLocalReacted && (
                        <motion.button
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1.2, rotate: 0 }}
                            onClick={() => {
                                setHasLocalReacted(true);
                                onMerdaReaction();
                            }}
                            className="w-44 h-44 md:w-72 md:h-72 rounded-full bg-gradient-to-tr from-orange-600 to-red-600 shadow-[0_0_120px_rgba(234,88,12,0.9)] border-4 border-white flex flex-col items-center justify-center text-white font-black cursor-pointer active:scale-90 transition-transform hover:rotate-12"
                        >
                            <span className="text-3xl md:text-6xl uppercase drop-shadow-lg">SALVATI!</span>
                            <span className="text-[10px] md:text-sm mt-1 md:mt-2 font-normal opacity-80">(Tocca ORA!)</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Top Left Leave Button */}
            <div className="absolute top-4 left-4 z-40">
                <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all shadow-lg backdrop-blur-md active:scale-95"
                >
                    <span className="text-lg leading-none font-normal">&times;</span>
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
                                Se abbandoni ora, la partita in corso verrà annullata per tutti i partecipanti.
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
                                    className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-xl transition-colors cursor-pointer"
                                >
                                    Sì, Abbandona
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Player Hand - Anchored to Bottom */}
            <div className="w-full max-w-4xl relative z-40 flex flex-col items-center pb-8 md:pb-12">
                <AnimatePresence>
                    {gameState === 'merda_called' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                        >
                            {winnerId === player.id ? (
                                <div className="bg-red-600 text-white font-black px-8 py-3 rounded-2xl border-4 border-white shadow-2xl text-2xl animate-bounce">
                                    HAI FATTO MERDA!
                                </div>
                            ) : (hasLocalReacted || (reactedPlayers && reactedPlayers.includes(player.id))) && (
                                <div className="bg-green-600 text-white font-black px-8 py-3 rounded-2xl border-4 border-white shadow-2xl text-2xl flex items-center gap-3">
                                    <Check className="w-8 h-8" /> SEI SALVO!
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex justify-center items-end h-44 sm:h-52 md:h-72 w-full gap-1 md:gap-4 px-4">
                    <AnimatePresence>
                        {hand.map((card, i) => {
                            const isSelected = selectedCardId === card.id;

                            return (
                                <motion.div
                                    key={card.id}
                                    layoutId={card.id}
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{
                                        y: isSelected ? -40 : 0,
                                        opacity: 1,
                                        scale: isSelected ? 1.05 : 1,
                                        rotate: (i - (hand.length - 1) / 2) * 5
                                    }}
                                    whileHover={!selectedCardId && gameState === 'playing' ? { y: -20, scale: 1.05 } : {}}
                                    exit={{ y: -300, opacity: 0, scale: 0.5 }}
                                    onClick={() => handleCardClick(card.id)}
                                    className={`relative aspect-[2/3] w-auto h-full max-h-[140px] sm:max-h-[180px] md:max-h-[260px] cursor-pointer transition-all 
                                        ${isSelected ? 'shadow-[0_0_30px_rgba(255,255,255,0.6)] ring-4 ring-white z-50' : 'hover:shadow-2xl'}
                                        ${gameState !== 'playing' ? 'opacity-90 pointer-events-none' : ''}
                                    `}
                                    style={{ transformOrigin: 'bottom center' }}
                                >
                                    <img
                                        src={getCardImagePath(card.suit, card.value)}
                                        alt={`${card.value} di ${card.suit}`}
                                        className="w-full h-full object-cover rounded-xl shadow-lg border-2 border-white/20"
                                    />
                                    {/* Selected Indicator Overlay */}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-white/10 rounded-xl flex items-center justify-center">
                                            <div className="bg-white text-black font-black px-2 py-1 rounded text-[10px] uppercase">Passata</div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Mobile Bottom Info (Optional) */}
            <div className="md:hidden absolute bottom-2 left-4 text-white/40 text-[8px] font-mono tracking-widest uppercase">
                {player.name} &bull; {player.chili} Chili
            </div>
        </div>
    );
};

export default GameTable;
