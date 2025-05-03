export default GameHeader;
type GameHeader = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const GameHeader: import("svelte").Component<{
    gameState: any;
}, {}, "">;
type $$ComponentProps = {
    gameState: any;
};
