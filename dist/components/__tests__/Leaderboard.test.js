import { render } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
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
    it('highlights and scrolls to a score', () => {
        const longScores = Array.from({ length: 15 }, (_, i) => ({
            id: i + 1,
            score: 1000 - i * 10,
            date: new Date()
        }));
        const highlight = longScores[5].score;
        const scrollSpy = vi.fn();
        // jsdom may not implement scrollIntoView
        Object.defineProperty(Element.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollSpy
        });
        const { container } = render(Leaderboard, {
            props: { scores: longScores, highlightScore: highlight }
        });
        const row = container.querySelector(`tr[data-score="${highlight}"]`);
        expect(row?.classList.contains('highlight')).toBe(true);
        expect(scrollSpy).toHaveBeenCalled();
        // clean up
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete Element.prototype.scrollIntoView;
    });
});
