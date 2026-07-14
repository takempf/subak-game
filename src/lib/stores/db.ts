import Dexie, { type Table } from 'dexie';

interface ScoreRecord {
	id?: number;
	score: number;
	date: Date;
}

interface PendingSubmission {
	id?: number;
	payload: Record<string, unknown>;
	createdAt: Date;
}

const db = new Dexie('FruitMergerDB') as Dexie & {
	scores: Table<ScoreRecord, number>;
	pendingSubmissions: Table<PendingSubmission, number>;
};

db.version(1).stores({
	scores: '++id, score, date'
});

db.version(2).stores({
	pendingSubmissions: '++id, createdAt'
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

export const queueSubmission = async (payload: Record<string, unknown>): Promise<void> => {
	try {
		await db.pendingSubmissions.add({
			payload,
			createdAt: new Date()
		});
	} catch (error) {
		console.error('Failed to queue submission:', error);
	}
};

export const getPendingSubmissions = async (): Promise<PendingSubmission[]> => {
	try {
		return await db.pendingSubmissions.orderBy('createdAt').toArray();
	} catch (error) {
		console.error('Failed to get pending submissions:', error);
		return [];
	}
};

export const deletePendingSubmission = async (id: number): Promise<void> => {
	try {
		await db.pendingSubmissions.delete(id);
	} catch (error) {
		console.error('Failed to delete pending submission:', error);
	}
};
