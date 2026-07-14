import Dexie, { type Table } from 'dexie';

interface ScoreRecord {
	id?: number;
	score: number;
	date: Date;
}

const db = new Dexie('FruitMergerDB') as Dexie & { scores: Table<ScoreRecord, number> };

db.version(1).stores({
	scores: '++id, score, date'
});

export const saveScore = async (score: number): Promise<void> => {
	try {
		await db.scores.add({
			score,
			date: new Date()
		});
	} catch (error) {
		console.error('Failed to save score:', error);
	}
};

export const getHighScores = async (): Promise<ScoreRecord[]> => {
	try {
		return await db.scores.orderBy('score').reverse().limit(10).toArray();
	} catch (error) {
		console.error('Failed to get high scores:', error);
		return [];
	}
};
