export default InterpolatingNumber;
type InterpolatingNumber = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const InterpolatingNumber: import("svelte").Component<{
    number: any;
}, {}, "">;
type $$ComponentProps = {
    number: any;
};
