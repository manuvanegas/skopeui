import { defineStore } from "pinia";

type AppStep = {
  id: number;
  name: string;
  label: string;
  icon: string;
};

const steps: AppStep[] = [
  { id: 1, name: "index", label: "Select Dataset", icon: "mdi-database" },
  { id: 2, name: "dataset-id", label: "Select Area", icon: "mdi-map-marker" },
  {
    id: 3,
    name: "dataset-id-visualize-variable",
    label: "Visualize",
    icon: "mdi-chart-bar",
  },
  {
    id: 4,
    name: "dataset-id-analyze-variable",
    label: "Analyze",
    icon: "mdi-chart-line",
  },
];

export const useAppStore = defineStore("app", {
  state: () => ({
    isNavigationVisible: false,
    isFirstVisit: true,
    steps,
  }),
  getters: {
    stepNames: (state) => state.steps.map((step) => step.name),
    isVisible: () => true,
  },
  actions: {
    setNavigationVisible(value: boolean) {
      this.isNavigationVisible = value;
    },
    setVisited() {
      this.isFirstVisit = false;
    },
    toggleNavigationDrawer() {
      this.isNavigationVisible = !this.isNavigationVisible;
    },
  },
});
