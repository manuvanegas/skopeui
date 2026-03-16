import { saveAs } from "file-saver";

export default defineNuxtPlugin(() => {
  return {
    provide: {
      download: { saveAs },
    },
  };
});
