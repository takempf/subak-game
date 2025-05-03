import Dexie from 'dexie';
export declare const db: Dexie;
export declare const saveScore: (score: any) => Promise<void>;
export declare const getHighScores: () => Promise<any>;
