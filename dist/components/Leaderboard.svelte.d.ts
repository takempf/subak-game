interface Score {
    id: number;
    score: number;
    date: Date;
}
interface LeaderboardProps {
    scores: Score[];
    highlightScore?: number;
}
declare const Leaderboard: import("svelte").Component<LeaderboardProps, {}, "">;
type Leaderboard = ReturnType<typeof Leaderboard>;
export default Leaderboard;
