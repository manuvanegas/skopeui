<template>
  <v-alert
    type="warning"
    variant="tonal"
    prominent
    title="This page needs an update"
    class="my-6"
  >
    <p>
      This version of SKOPE doesn't match the data service it talks to, so it
      can't show the datasets correctly. Reload the page to get the current
      version. If this message comes back, the data service is being updated;
      please try again in a few minutes.
    </p>
    <v-btn class="mt-4" color="accent" variant="flat" @click="reload">
      Reload
    </v-btn>
  </v-alert>
</template>

<script setup lang="ts">
function reload() {
  window.location.reload();
}
</script>
