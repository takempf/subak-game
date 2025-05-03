import { onMount } from 'svelte';
export function useBoundingRect() {
    let ref = $state(null);
    let rect = $state(null);
    const update = () => {
        if (!ref)
            return;
        rect = ref.getBoundingClientRect();
    };
    onMount(() => {
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update);
        update();
    });
    // so... when ref changes, fire
    $effect(() => {
        update();
    });
    return {
        get ref() {
            return ref;
        },
        get rect() {
            return rect;
        },
        set ref(el) {
            ref = el;
        },
        update
    };
}
