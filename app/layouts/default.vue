<template>
  <v-app>
    <Header />
    <Navigation />
    <v-main>
      <v-container fluid>
        <StepBar v-if="mdAndUp" />
        <Messages />
        <div class="page-area">
          <UpdateRequired v-if="metadataStore.updateRequired" />
          <NuxtPage v-else />
          <PageLoadingOverlay />
        </div>
      </v-container>
    </v-main>
    <div class="mt-6">
      <Footer />
    </div>
  </v-app>
</template>

<script setup lang="ts">
import Header from "@/components/Header.vue";
import Navigation from "@/components/Navigation.vue";
import StepBar from "@/components/StepBar.vue";
import PageLoadingOverlay from "@/components/PageLoadingOverlay.vue";
import Messages from "@/components/Messages.vue";
import Footer from "@/components/Footer.vue";
import UpdateRequired from "@/components/UpdateRequired.vue";
import { watch } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import { useMessagesStore } from "@/stores/messages";
import { useMetadataStore } from "@/stores/metadata";

const route = useRoute();
const { mdAndUp } = useDisplay();
const messagesStore = useMessagesStore();
const metadataStore = useMetadataStore();

// Messages belong to the page that raised them.
watch(
  () => route.path,
  () => messagesStore.clearOnNavigation(),
);
</script>

<style scoped>
/* Holds the loading overlay over the page. Tall enough for it even when the
   page being left has already cleared. */
.page-area {
  position: relative;
  min-height: 50vh;
}
</style>
