<script>
	import { Tween } from 'svelte/motion';
	import { circOut } from 'svelte/easing'; // Or choose another easing function

	const { number } = $props();

	const numberTween = Tween.of(() => number, {
		easing: circOut,
		duration: 2000
	});

	// We still need to round the potentially fractional intermediate
	// value during the tween for the desired display effect.
	let roundedDisplay = $derived(Math.round(numberTween.current));
</script>

<span class="interpolating-number">
	{Intl.NumberFormat().format(roundedDisplay)}
</span>
