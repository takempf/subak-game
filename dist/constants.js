export const GAME_WIDTH = 0.6; // meters
export const GAME_HEIGHT = 0.9; // meters
export const GAME_WIDTH_PX = 600;
export const GAME_HEIGHT_PX = 900;
export const WALL_THICKNESS = GAME_WIDTH / 20;
export const MERGE_THRESHOLD = 100; // ms to detect if fruits are touching
export const GAME_OVER_HEIGHT = GAME_HEIGHT / 6; // Y position above which game ends
export const FRUIT_NAMES = [
    'blueberry',
    'grape',
    'lemon',
    'orange',
    'apple',
    'dragonfruit',
    'pear',
    'peach',
    'pineapple',
    'honeydew',
    'watermelon'
];
export const FRUITS = [];
let currentSize = 3.75;
for (let i = 0; i < FRUIT_NAMES.length; i++) {
    const currentRadius = GAME_WIDTH * (currentSize / 100);
    const fruitName = FRUIT_NAMES[i];
    FRUITS.push({
        name: fruitName,
        color: '#000000',
        size: currentSize,
        radius: currentRadius,
        points: (i + 1) * 2
    });
    currentSize = currentSize * 1.25;
}
export const DEFAULT_IMAGES_PATH = '/images';
export const DEFAULT_SOUNDS_PATH = '/sounds';
