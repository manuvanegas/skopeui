<template>
  <v-app>
    <Header />
    <Navigation />
    <v-main>
      <v-container fluid>
        <Messages />
        <NuxtPage />
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
import Messages from "@/components/Messages.vue";
import Footer from "@/components/Footer.vue";
</script>
