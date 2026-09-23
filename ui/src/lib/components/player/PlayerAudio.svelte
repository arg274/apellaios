<script lang="ts">
  import { player } from '$lib/player/player.svelte'
</script>

<!-- The single audio element for the app; the engine drives it through this attachment -->
<audio {@attach player.attach} preload="auto" class="hidden"></audio>
