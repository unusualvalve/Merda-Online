import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('../frontend/public/cards');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Neapolitan suits and values
const suits = ['Spade', 'Coppe', 'Denari', 'Bastoni'];
const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Colors and symbols for placeholder cards
const getSuitColor = (suit) => {
    switch (suit) {
        case 'Spade': return '#333333'; // Black/Dark Grey
        case 'Coppe': return '#E53E3E'; // Red
        case 'Denari': return '#D69E2E'; // Gold/Yellow
        case 'Bastoni': return '#38A169'; // Green
    }
};

const getSuitSymbol = (suit) => {
    switch (suit) {
        case 'Spade': return '⚔️';
        case 'Coppe': return '🏆';
        case 'Denari': return '🪙';
        case 'Bastoni': return '🥖';
    }
};

const getCardName = (value) => {
    if (value === 8) return 'Donna';
    if (value === 9) return 'Cavallo';
    if (value === 10) return 'Re';
    return value.toString();
};

const cardWidth = 300;
const cardHeight = 450;

console.log('Generating dummy Neapolitan cards...');

suits.forEach(suit => {
    values.forEach(value => {
        const canvas = createCanvas(cardWidth, cardHeight);
        const ctx = canvas.getContext('2d');

        // Card Border and Background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cardWidth, cardHeight);

        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, cardWidth - 10, cardHeight - 10);

        ctx.strokeStyle = getSuitColor(suit);
        ctx.lineWidth = 5;
        ctx.strokeRect(15, 15, cardWidth - 30, cardHeight - 30);

        // Value in corners
        ctx.fillStyle = getSuitColor(suit);
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';

        const cardDisplay = getCardName(value);

        // Top Left
        ctx.fillText(cardDisplay, 50, 60);
        ctx.font = '24px Arial';
        ctx.fillText(suit.substring(0, 1), 50, 90);

        // Bottom Right (Inverted)
        ctx.save();
        ctx.translate(cardWidth - 50, cardHeight - 60);
        ctx.rotate(Math.PI);
        ctx.font = 'bold 40px Arial';
        ctx.fillText(cardDisplay, 0, 0);
        ctx.font = '24px Arial';
        ctx.fillText(suit.substring(0, 1), 0, -30);
        ctx.restore();

        // Center Graphic
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Number of symbols or face card type
        if (value <= 7) {
            ctx.font = '60px Arial';
            ctx.fillText(getSuitSymbol(suit).repeat(Math.min(value, 3)), cardWidth / 2, cardHeight / 2 - 40);
            if (value > 3) {
                ctx.fillText(getSuitSymbol(suit).repeat(value - 3), cardWidth / 2, cardHeight / 2 + 40);
            }
        } else {
            // Face cards
            ctx.font = '80px Arial';
            ctx.fillText(getSuitSymbol(suit), cardWidth / 2, cardHeight / 2 - 40);

            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = '#000000';
            ctx.fillText(cardDisplay, cardWidth / 2, cardHeight / 2 + 40);
        }

        // Save image
        const buffer = canvas.toBuffer('image/png');
        const filename = `${suit.toLowerCase()}-${value}.png`;
        fs.writeFileSync(path.join(outDir, filename), buffer);
    });
});

console.log(`Generated 40 cards in ${outDir}`);
