interface FruitProps {
    radius: number | string;
    name: string;
    display?: 'block' | 'inline';
    scale?: number;
}
declare const Fruit: import("svelte").Component<FruitProps, {}, "">;
type Fruit = ReturnType<typeof Fruit>;
export default Fruit;
