import { defineStore } from "pinia";

type MessageItem = {
  type: string;
  message: string;
};

export const useMessagesStore = defineStore("messages", {
  state: () => ({
    messages: [] as MessageItem[],
  }),
  actions: {
    dismiss(index: number) {
      this.messages.splice(index, 1);
    },
    info(message: string) {
      this.messages.push({ type: "info", message });
    },
    error(message: string) {
      this.messages.push({ type: "error", message });
    },
    clearMessages() {
      this.messages.splice(0, this.messages.length);
    },
  },
});
