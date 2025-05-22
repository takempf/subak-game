import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Leaderboard from '../Leaderboard.svelte';
const sampleScores = [
    { id: 1, score: 1200, date: new Date('2024-01-01') },
    { id: 2, score: 800, date: new Date('2024-01-02') }
];
describe('Leaderboard component', () => {
    it('renders provided scores', () => {
        const { container } = render(Leaderboard, { props: { scores: sampleScores } });
        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).toBe(sampleScores.length);
        const firstRow = rows[0];
        expect(firstRow.querySelector('.rank')?.textContent).toBe('1');
        expect(firstRow.querySelector('.score')?.textContent).toContain('1,200');
    });
});
