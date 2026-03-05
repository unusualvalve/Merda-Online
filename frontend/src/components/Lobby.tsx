import React, { useState } from 'react';
import type { Player, Card } from '../App';
import { User, Users, Play, ImagePlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LobbyProps {
    onJoin: (room: string, name: string, avatar?: string) => void;
    onCreate: (name: string, avatar?: string) => void;
    roomId: string;
    players: Player[];
    player: Player | null;
    onStart: () => void;
    lastPenalty: { card: Card; loserId: string; loserName?: string } | null;
    onLeaveRoom: () => void;
    isCreator: boolean;
}

const getCardImagePath = (suit: string, value: number) => {
    const ext = (suit.toLowerCase() === 'bastoni' && value <= 5) ? 'jpeg' : 'png';
    return `/cards/${suit.toLowerCase()}-${value}.${ext}?v=2`;
};

const Lobby: React.FC<LobbyProps> = ({ onJoin, onCreate, roomId, players, player, onStart, lastPenalty, onLeaveRoom, isCreator }) => {
    const [inputRoom, setInputRoom] = useState('');
    const [inputName, setInputName] = useState('');
    const [avatarBase64, setAvatarBase64] = useState<string | undefined>();
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputRoom.trim() && inputName.trim()) {
            onJoin(inputRoom.trim(), inputName.trim(), avatarBase64);
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 150;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                setAvatarBase64(canvas.toDataURL('image/jpeg', 0.8));
            };
            if (typeof event.target?.result === 'string') {
                img.src = event.target.result;
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-neutral-900 to-black">

            {/* Brand Header */}
            <div className="text-center mb-6 md:mb-10">
                <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 transform -rotate-2">
                    MERDA ONLINE
                </h1>
                <p className="text-neutral-400 mt-2 font-medium tracking-wider text-xs md:text-base">IL GIOCO DI CARTE PIÙ CATTIVO</p>
            </div>

            <div className="bg-neutral-800/50 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-2xl border border-white/5 w-full max-w-md">

                {/* Last Round Result */}
                {lastPenalty && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-4">
                        <img
                            src={getCardImagePath(lastPenalty.card.suit, lastPenalty.card.value)}
                            alt={`${lastPenalty.card.value} di ${lastPenalty.card.suit}`}
                            className="w-12 h-16 object-cover rounded shadow-md border border-white/10"
                        />
                        <div>
                            <h3 className="font-bold text-red-400">Fine Round!</h3>
                            <p className="text-sm text-neutral-300">
                                Il giocatore <span className="font-bold text-white">{lastPenalty.loserName || players.find(p => p.id === lastPenalty.loserId)?.name || 'Sconosciuto'}</span> ha pescato il{' '}
                                <span className="font-bold text-orange-400">{lastPenalty.card.value} di {lastPenalty.card.suit}</span>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Join Form vs Waiting Room */}
                {!player ? (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4 mb-4">
                            <label className="relative cursor-pointer group">
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                <div className={`w-24 h-24 rounded-full border-2 ${avatarBase64 ? 'border-green-500' : 'border-white/20 border-dashed group-hover:border-red-500/50'} flex items-center justify-center overflow-hidden bg-black/50 transition-all`}>
                                    {avatarBase64 ? (
                                        <img src={avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-neutral-500 group-hover:text-red-400 transition-colors">
                                            <ImagePlus className="w-8 h-8 mb-1" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Foto Profilo</span>
                                        </div>
                                    )}
                                </div>
                                {avatarBase64 && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); setAvatarBase64(undefined); }}
                                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 text-white shadow-lg hover:bg-red-400 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Il tuo Nome</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 w-5 h-5 text-neutral-500" />
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    maxLength={12}
                                    value={inputName}
                                    onChange={e => setInputName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-bold"
                                    placeholder="Es. Ciro"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <button
                                onClick={() => {
                                    if (inputName.trim()) onCreate(inputName.trim(), avatarBase64);
                                }}
                                disabled={!inputName.trim()}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all active:scale-[0.98] mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Crea Nuova Stanza
                            </button>

                            <div className="relative flex items-center mb-4">
                                <div className="flex-grow border-t border-white/10"></div>
                                <span className="flex-shrink-0 mx-4 text-neutral-500 text-sm">OPPURE</span>
                                <div className="flex-grow border-t border-white/10"></div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-3.5 w-5 h-5 text-neutral-500" />
                                        <input
                                            type="text"
                                            maxLength={5}
                                            value={inputRoom}
                                            onChange={e => setInputRoom(e.target.value.toUpperCase())}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all uppercase font-mono tracking-widest font-bold"
                                            placeholder="CODICE (es. A9K2M)"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!inputRoom.trim() || !inputName.trim()}
                                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Unisci a Stanza
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <p className="text-xs md:text-sm text-neutral-400 mb-1">Codice Stanza</p>
                                <h2 className="text-3xl md:text-4xl font-black tracking-[0.2em] text-white font-mono">{roomId}</h2>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="bg-black/30 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-sm font-mono text-neutral-300">{players.length}/8 max</span>
                                </div>
                                <button onClick={() => setShowLeaveConfirm(true)} className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors cursor-pointer">
                                    Esci dalla Stanza
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Giocatori Connessi</p>
                            {players.map((p, i) => (
                                <div key={p.id} className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 flex items-center justify-center font-bold text-sm border border-white/10 overflow-hidden shrink-0">
                                            {p.avatar ? (
                                                <img src={p.avatar} alt="P" className="w-full h-full object-cover" />
                                            ) : (
                                                i + 1
                                            )}
                                        </div>
                                        <span className={`font-medium ${p.id === player.id ? 'text-red-400' : 'text-neutral-200'}`}>
                                            {p.name} {p.id === player.id && '(Tu)'}
                                        </span>
                                    </div>
                                    {p.chili > 0 && (
                                        <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                                            💩 {p.chili} Kg
                                        </span>
                                    )}
                                </div>
                            ))}

                            {/* Placeholder for empty slots */}
                            {players.length < 8 && (
                                <div className="flex items-center justify-between border border-dashed border-white/10 p-3 rounded-lg opacity-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full border border-dashed border-white/20 flex items-center justify-center" />
                                        <span className="text-neutral-500 italic">In attesa di altri giocatori... (Min: 2, Max: 8)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isCreator ? (
                            <button
                                onClick={onStart}
                                disabled={players.length < 2}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                {players.length < 2 ? 'ATTESA GIOCATORI...' : 'INIZIA PARTITA'}
                            </button>
                        ) : (
                            <p className="text-center text-sm font-bold text-neutral-400 italic bg-black/30 p-4 rounded-xl border border-white/5">
                                In attesa che l'organizzatore avvii la partita...
                            </p>
                        )}
                    </div>
                )}
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
                            <h3 className="text-xl font-bold text-white mb-2">Esci dalla stanza?</h3>
                            <p className="text-neutral-400 mb-6 text-sm">
                                Sei sicuro di voler tornare al menu principale?
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
                                    Sì, Esci
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Lobby;
