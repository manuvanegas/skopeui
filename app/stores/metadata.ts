import { defineStore } from "pinia";
import type { Dataset } from "@/types/metadata";
import { timeSpan } from "@/utils/timeAxis";

function matchesYearFilter(minYear: number, maxYear: number, dataset: Dataset) {
  const [start, end] = timeSpan(dataset.time);
  return end >= minYear && start <= maxYear;
}

function matchesCategoryFilter(selectedCategories: string[], dataset: Dataset) {
  if (selectedCategories.length === 0) {
    return true;
  }
  return dataset.variables.some(
    (variable) =>
      variable.category != null &&
      selectedCategories.includes(variable.category),
  );
}

function matchesQueryFilter(query: string, dataset: Dataset) {
  if (query.length === 0) {
    return true;
  }
  const q = query.toLowerCase();
  const variableCorpus = dataset.variables
    .map((v) => `${v.category ?? ""} ${v.title} ${v.description}`.toLowerCase())
    .join(" ");
  return (
    dataset.title.toLowerCase().includes(q) ||
    dataset.description.toLowerCase().includes(q) ||
    variableCorpus.includes(q)
  );
}

export const useMetadataStore = defineStore("metadata", {
  state: () => ({
    // Set when the API serves a /metadata major version this UI can't read.
    updateRequired: false,
    allDatasetMetadata: [] as Dataset[],
    filteredDatasets: [] as Dataset[],
    filterCriteria: {
      selectedCategories: [] as string[],
      yearStart: 1,
      yearEnd: new Date().getFullYear(),
      query: "",
    },
  }),
  actions: {
    find(metadataId: string) {
      return (
        this.allDatasetMetadata.find((dataset) => dataset.id === metadataId) ||
        null
      );
    },
    setUpdateRequired() {
      this.updateRequired = true;
    },
    // The API sends datasets already sorted by `order`, then ID.
    setAllDatasetMetadata(datasets: Dataset[]) {
      this.allDatasetMetadata = datasets;
      this.filteredDatasets = datasets;
    },
    setFilteredDatasets(datasets: Dataset[]) {
      this.filteredDatasets = datasets;
    },
    setFilterCriteria(filterCriteria: {
      selectedCategories: string[];
      yearStart: number;
      yearEnd: number;
      query?: string;
    }) {
      this.filterCriteria = {
        ...filterCriteria,
        query: filterCriteria.query || "",
      };
      this.filteredDatasets = this.allDatasetMetadata.filter((dataset) => {
        const selectedCategories = this.filterCriteria.selectedCategories;
        const minYear = this.filterCriteria.yearStart;
        const maxYear = this.filterCriteria.yearEnd;
        const query = this.filterCriteria.query || "";

        return (
          matchesYearFilter(minYear, maxYear, dataset) &&
          matchesQueryFilter(query, dataset) &&
          matchesCategoryFilter(selectedCategories, dataset)
        );
      });
    },
  },
});
