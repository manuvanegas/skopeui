import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators";

@Module({ stateFactory: true, namespaced: true, name: "app" })
class App extends VuexModule {
  isNavigationVisible = false;

  isFirstVisit = true;

  steps = [
    {
      id: 1,
      name: "index",
      label: "Select Dataset",
      icon: "mdi-database",
    },
    {
      id: 2,
      name: "dataset-id",
      label: "Select Area",
      icon: "mdi-map-marker",
    },
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

  get stepNames() {
    return this.steps.map((step) => step.name);
  }

  /**
   * Toggle drawer with options click filter datasets.
   * @param {*} isNavigationVisible
   */
  @Mutation
  setNavigationVisible(isNavigationVisible) {
    this.isNavigationVisible = isNavigationVisible;
  }

  @Mutation
  setVisited() {
    this.isFirstVisit = false;
  }

  /**
   * Toggle navigation drawer visibility on / off.
   */
  @Action({ commit: "setNavigationVisible" })
  toggleNavigationDrawer() {
    return !this.isNavigationVisible;
  }
}

export { App };
