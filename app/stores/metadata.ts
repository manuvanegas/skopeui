import { defineStore } from "pinia";
import type { Dataset } from "@/types/metadata";

function matchesYearFilter(minYear: number, maxYear: number, dataset: any) {
  const dMinYear = parseInt(dataset?.timespan?.period?.gte || "0", 10);
  const dMaxYear = parseInt(dataset?.timespan?.period?.lte || "0", 10);
  if (dMaxYear < minYear) {
    return false;
  }
  return dMinYear <= maxYear;
}

function matchesVariableFilter(
  selectedVariableClasses: string[],
  dataset: any,
) {
  if (selectedVariableClasses.length === 0) {
    return true;
  }
  for (const selectedVariableClass of selectedVariableClasses) {
    for (const variable of dataset?.variables || []) {
      if (variable.class === selectedVariableClass) {
        return true;
      }
    }
  }
  return false;
}

function matchesQueryFilter(query: string, dataset: any) {
  if (query.length === 0) {
    return true;
  }
  const q = query.toLowerCase();
  const variableCorpus = (dataset?.variables || [])
    .map((v: any) => `${v.class} ${v.name} ${v.description}`.toLowerCase())
    .join(" ");
  return (
    (dataset?.title || "").toLowerCase().includes(q) ||
    (dataset?.description || "").toLowerCase().includes(q) ||
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
      selectedVariableClasses: [] as string[],
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
    setAllDatasetMetadata(datasets: Dataset[]) {
      const sorted = [...datasets].sort(
        (a: any, b: any) => (a.ordering || 0) - (b.ordering || 0),
      );
      this.allDatasetMetadata = sorted;
      this.filteredDatasets = sorted;
    },
    setFilteredDatasets(datasets: Dataset[]) {
      this.filteredDatasets = datasets;
    },
    setFilterCriteria(filterCriteria: {
      selectedVariableClasses: string[];
      yearStart: number;
      yearEnd: number;
      query?: string;
    }) {
      this.filterCriteria = {
        ...filterCriteria,
        query: filterCriteria.query || "",
      };
      this.filteredDatasets = this.allDatasetMetadata.filter((dataset) => {
        const selectedVariableClasses =
          this.filterCriteria.selectedVariableClasses;
        const minYear = this.filterCriteria.yearStart;
        const maxYear = this.filterCriteria.yearEnd;
        const query = this.filterCriteria.query || "";

        return (
          matchesYearFilter(minYear, maxYear, dataset) &&
          matchesQueryFilter(query, dataset) &&
          matchesVariableFilter(selectedVariableClasses, dataset)
        );
      });
    },
  },
});
