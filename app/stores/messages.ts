import { defineStore } from "pinia";

type MessageItem = {
  type: string;
  message: string;
  /** Raised while opening a page, so it belongs to that page. */
  keepOnNavigation?: boolean;
};

export const useMessagesStore = defineStore("messages", {
  state: () => ({
    messages: [] as MessageItem[],
  }),
  actions: {
    dismiss(index: number) {
      this.messages.splice(index, 1);
    },
    info(message: string, options: { keepOnNavigation?: boolean } = {}) {
      this.messages.push({ type: "info", message, ...options });
    },
    error(message: string) {
      this.messages.push({ type: "error", message });
    },
    clearMessages() {
      this.messages.splice(0, this.messages.length);
    },
    /** Drops the last page's messages when another page opens. */
    clearOnNavigation() {
      this.messages = this.messages
        .filter((m) => m.keepOnNavigation)
        .map(({ keepOnNavigation: _, ...m }) => m);
    },
  },
});
