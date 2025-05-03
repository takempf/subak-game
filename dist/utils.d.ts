export declare function isWithinBounds(x: number, y: number): boolean;
export declare function getDistance(x1: number, y1: number, x2: number, y2: number): number;
export declare function areCirclesOverlapping(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean;
export declare function getMidpoint(x1: number, y1: number, x2: number, y2: number): {
    x: number;
    y: number;
};
export declare function formatScore(score: number): string;
export declare function getNextFruitTier(currentIndex: number): number;
export declare function formatDate(date: Date): string;
export declare function calculateMergePoints(fruitIndex: number): number;
export declare function isValidDropPosition(x: number, radius: number): boolean;
export declare function clamp(value: number, min: number, max: number): number;
export declare function radiansToDegrees(radians: number): number;
export declare function lerp(start: number, end: number, t: number): number;
