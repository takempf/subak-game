<script lang="ts">
	import TKIcon from '../icons/tk.svelte';
</script>

<div class="footer">
	<a class="credit" href="https://kempf.dev/#subak" target="_blank">
		Crafted by <span class="tk-logo"><TKIcon /></span></a>
	<span class="version">v2.0.0 <em>alpha</em></span>
</div>

<style>
	.footer {
		display: flex;
		justify-content: space-between;
		color: var(--color-very-light-text);

		a {
			color: inherit;

			&:hover {
				color: var(--color-light-text);
			}
		}
	}

	.tk-logo {
		font-size: 0.8em;
	}
</style>
