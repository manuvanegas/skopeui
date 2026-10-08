<template>
  <!-- Short enough for the navigation drawer; the tooltip names the file. -->
  <v-tooltip
    location="bottom"
    text="Load the skope-request.json from a downloaded analysis (experimental)"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        color="primary"
        rounded
        prepend-icon="mdi-upload"
        class="mt-1"
        @click="selectLoadRequestDataFile"
      >
        <input
          id="loadRequestDataFile"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleLoadRequestDataFile"
        >
        Load saved analysis
      </v-btn>
    </template>
  </v-tooltip>
</template>
<script setup lang="ts">
import { useRouter } from "vue-router";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";

const router = useRouter();

function selectLoadRequestDataFile() {
  document.getElementById("loadRequestDataFile")!.click();
}

function handleLoadRequestDataFile(event: Event) {
  const file = (event.target as HTMLInputElement).files![0];
  file.text().then((text) => {
    try {
      const requestData = JSON.parse(text);
      console.log(
        "going to",
        requestData.dataset_id,
        "/",
        requestData.variable_id,
      );
      const legacyActions = useLegacyStoreActions();
      router
        .push({
          name: "dataset-id-analyze-variable",
          params: {
            id: requestData.dataset_id,
            variable: requestData.variable_id,
          },
        })
        .finally(async () => {
          console.log("router push settled", requestData);
          await legacyActions.initializeDataset(
            requestData.dataset_id,
            requestData.variable_id,
          );
          legacyActions.loadRequestData(requestData);
        });
    } catch (error) {
      console.error(error);
      alert("Unable to import the request file.");
    }
  });
}
</script>

<style scoped></style>
