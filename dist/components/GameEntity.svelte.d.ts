declare const GameEntity: import("svelte").Component<{
    x?: number;
    y?: number;
    rotation?: number;
    scale?: number;
    children: any;
}, {}, "">;
type GameEntity = ReturnType<typeof GameEntity>;
export default GameEntity;
