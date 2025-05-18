import Dexie from 'dexie';

export const db = new Dexie('FruitMergerDB');

db.version(1).stores({
	scores: '++id, score, date'
});

export const saveScore = async (score) => {
	try {
		await db.scores.add({
			score,
			date: new Date()
		});
	} catch (error) {
		console.error('Failed to save score:', error);
	}
};

export const getHighScores = async () => {
	try {
		return await db.scores.orderBy('score').reverse().limit(10).toArray();
	} catch (error) {
		console.error('Failed to get high scores:', error);
		return [];
	}
};
