import { GAME_HEIGHT, GAME_WIDTH, FRUITS } from './constants';
// Checks if a point is within the game boundaries
export function isWithinBounds(x, y) {
    return x >= 0 && x <= GAME_WIDTH && y >= 0 && y <= GAME_HEIGHT;
}
// Calculates the distance between two points
export function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
// Checks if two circles are overlapping
export function areCirclesOverlapping(x1, y1, r1, x2, y2, r2) {
    const distance = getDistance(x1, y1, x2, y2);
    return distance < r1 + r2;
}
// Calculates the midpoint between two points
export function getMidpoint(x1, y1, x2, y2) {
    return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2
    };
}
// Formats a score number with comma separators
export function formatScore(score) {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
// Gets the next fruit tier based on current fruit index
export function getNextFruitTier(currentIndex) {
    return currentIndex + 1 >= FRUITS.length ? currentIndex : currentIndex + 1;
}
// Formats a date for the scoreboard
export function formatDate(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
// Calculates points based on merged fruit sizes
export function calculateMergePoints(fruitIndex) {
    const basePoints = FRUITS[fruitIndex].points;
    const multiplier = Math.floor(fruitIndex / 2) + 1;
    return basePoints * multiplier;
}
// Checks if a position would result in a valid fruit placement
export function isValidDropPosition(x, radius) {
    return x >= radius && x <= GAME_WIDTH - radius;
}
// Clamps a value between a minimum and maximum
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
// Converts radians to degrees
export function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}
// Linear interpolation between two values
export function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}
