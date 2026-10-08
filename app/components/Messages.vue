<template>
  <v-row>
    <v-col>
      <!-- The store decides which alerts show, so each stays open until it's
           dismissed from the store. -->
      <v-alert
        v-for="(alert, index) in messages"
        :key="index"
        :model-value="true"
        prominent
        closable
        close-label="Dismiss"
        :type="alert.type"
        :icon="ALERT_ICONS[alert.type]"
        class="mb-2"
        @click:close="dismiss(index)"
      >
        {{ alert.message }}
      </v-alert>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useMessagesStore } from "@/stores/messages";

// Vuetify's default error icon is a circled X, which reads like a second close
// button next to the alert's own.
const ALERT_ICONS: Record<string, string | undefined> = {
  error: "mdi-alert-circle",
};

const messagesStore = useMessagesStore();
const messages = computed(() => messagesStore.messages);

function dismiss(index: number) {
  messagesStore.dismiss(index);
}
</script>

<style scoped>
/* Vuetify places the close button in the first of the alert's two grid rows.
   Span both and centre it, level with the icon and the text. */
.v-alert :deep(.v-alert__close) {
  grid-row: 1 / -1;
  align-self: center;
}
</style>
