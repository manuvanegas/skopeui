<template>
  <v-app-bar src="/header.png">
    <template #img="{ props }">
      <v-img v-bind="props" cover></v-img>
    </template>
    <v-app-bar-nav-icon @click.stop="toggleNavigationDrawer()">
      <v-icon color="primary" x-large>mdi-menu</v-icon>
    </v-app-bar-nav-icon>
    <v-app-bar-title>
      <a
        class="skope-title pa-0 ma-0"
        href="https://www.openskope.org"
        target="_blank"
      >
        SKOPE
      </a>
      <div class="skope-subtitle">
        Synthesizing Knowledge of Past Environments
      </div>
    </v-app-bar-title>
    <template v-if="display.mdAndUp">
      <v-spacer />
      <LoadAnalysis />
    </template>
  </v-app-bar>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useDisplay } from "vuetify";
import { useRoute } from "vue-router";
import LoadAnalysis from "@/components/dataset/LoadAnalysis.vue";
import { useAppStore } from "@/stores/app";

const route = useRoute();
const appStore = useAppStore();
const display = useDisplay();

const stepNames = computed(() => appStore.stepNames);
const steps = computed(() => appStore.steps);
const currentStepIndex = computed(() =>
  stepNames.value.findIndex((x) => x === (route.name as string))
);

function toggleNavigationDrawer() {
  appStore.toggleNavigationDrawer();
}
</script>
<style lang="scss" scoped>
.skope-title {
  text-decoration: none;
  color: $skope-title-color;
  font-family: $skope-title-font;
  font-weight: bold;
  font-size: 2.3em;
}

.skope-subtitle {
  color: $skope-dark-blue;
  font-family: $skope-title-font;
  font-weight: bolder;
  font-size: 1.2rem;
}
</style>
