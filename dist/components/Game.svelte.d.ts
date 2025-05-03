import { DEFAULT_IMAGES_PATH, DEFAULT_SOUNDS_PATH } from '../constants';
declare const Game: import("svelte").Component<{
    imagesPath?: typeof DEFAULT_IMAGES_PATH;
    soundsPath?: typeof DEFAULT_SOUNDS_PATH;
}, {}, "">;
type Game = ReturnType<typeof Game>;
export default Game;
