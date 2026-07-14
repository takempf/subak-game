<script lang="ts">
import type { HTMLInputAttributes } from 'svelte/elements';

interface InitialsInputProps {
	value: string;
	id?: string;
	onkeydown?: HTMLInputAttributes['onkeydown'];
}
let { value = $bindable(), id, onkeydown }: InitialsInputProps = $props();
</script>

<input
  {id}
  class="initials-input"
  type="text"
  bind:value={
    () => value,
    (v) => {
      value = v.toUpperCase();
    }
  }
  maxlength="3"
  autocomplete="off"
  data-1p-ignore
  {onkeydown}
  placeholder="???"
/>

<style>
  .initials-input {
    width: 3.25em;
    padding: 0.2em 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: bold;
    font-size: 1em;
    letter-spacing: 0.1em;
    text-align: center;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-background-light);
    color: var(--color-text);
    text-transform: uppercase;
  }

  .initials-input:focus {
    outline: var(--color-focus-outline) 2px solid;
    border-color: transparent;
  }
</style>
