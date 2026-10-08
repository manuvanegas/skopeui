<template>
  <!-- The workflow's steps, always in view on wider screens: where the user
       is, what's done, and what's reachable. Narrow screens use the drawer. -->
  <nav class="step-bar" aria-label="SKOPE workflow">
    <template v-for="(step, index) in steps" :key="step.name">
      <v-icon v-if="index > 0" class="step-bar__separator" size="small">
        mdi-chevron-right
      </v-icon>
      <v-btn
        :to="locations[index]"
        :disabled="isDisabled(index) || !locations[index]"
        :variant="index === currentStepIndex ? 'tonal' : 'text'"
        :color="index === currentStepIndex ? 'primary' : undefined"
        :aria-current="index === currentStepIndex ? 'step' : undefined"
        exact
        class="text-none"
        data-test="workflow-step"
      >
        <template #prepend>
          <v-icon
            v-if="isStepComplete(index)"
            color="success"
            data-test="step-complete"
          >
            mdi-check-circle
          </v-icon>
          <v-icon v-else>{{ step.icon }}</v-icon>
        </template>
        {{ step.label }}
      </v-btn>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { useWorkflowSteps } from "@/composables/useWorkflowSteps";

const { steps, locations, currentStepIndex, isDisabled, isStepComplete } =
  useWorkflowSteps();
</script>

<style scoped>
.step-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.step-bar__separator {
  opacity: 0.5;
}
</style>
