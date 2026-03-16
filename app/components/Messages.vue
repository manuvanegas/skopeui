<template>
  <v-row>
    <v-col>
      <v-alert
        v-for="(alert, index) in messages"
        :key="index"
        prominent
        :type="alert.type"
        color="warning"
      >
        {{ alert.message }}
        <v-btn icon class="float-right" @click="dismiss(index)"
          ><v-icon>mdi-close-circle</v-icon></v-btn
        >
      </v-alert>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useMessagesStore } from "@/stores/messages";

const messagesStore = useMessagesStore();
const messages = computed(() => messagesStore.messages);

function dismiss(index: number) {
  messagesStore.dismiss(index);
}
</script>
