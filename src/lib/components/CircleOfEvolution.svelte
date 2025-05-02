<script lang="ts">
  import { FRUITS } from '../constants';

  import Fruit from './Fruit.svelte';

  const fruitsMidpoint = Math.ceil(FRUITS.length / 2);
  const fruitGroups = [
    FRUITS.slice(0, fruitsMidpoint),
    FRUITS.slice(fruitsMidpoint, FRUITS.length)
  ];
</script>

<div class="fruits">
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <div class="fruitLoop" />
  <div class="fruitGroups">
    {#each fruitGroups as fruitGroup, i (i)}
      <div class="fruitGroup">
        {#each fruitGroup as fruit (fruit.name)}
          <Fruit {...fruit} radius="1.5em" />
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .fruits {
    position: relative;
    padding: 10px 0;
  }

  .fruitLoop {
    position: absolute;
    border: var(--color-border) 1px solid;
    top: 0;
    right: 10px;
    bottom: 0;
    left: 10px;
    border-radius: 25px;
  }

  .fruitGroups {
    position: relative;
    display: flex;
    gap: 0.75em;
  }

  .fruitGroup {
    display: flex;
    flex-direction: column;
    gap: 0.75em;
    justify-content: center;

    &:nth-child(even) {
      flex-direction: column-reverse;
    }
  }

  @media (max-width: 420px) {
    .fruits {
      padding: 0 10px;
    }

    .fruitLoop {
      top: 0.75em;
      right: 0;
      bottom: 0.75em;
      left: 0;
    }

    .fruitGroups {
      flex-direction: column;
    }

    .fruitGroup {
      flex-direction: row;

      &:nth-child(even) {
        flex-direction: row-reverse;
      }
    }
  }
</style>
