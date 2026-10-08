import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import DefaultLayout from "@/layouts/default.vue";
import { useMessagesStore } from "@/stores/messages";

const route = reactive({ path: "/dataset/paleocar_v3" });

vi.mock("vue-router", () => ({ useRoute: () => route }));
vi.mock("vuetify", () => ({ useDisplay: () => ({ mdAndUp: ref(true) }) }));

describe("default layout", () => {
  it("clears messages when the page changes", async () => {
    setActivePinia(createPinia());
    const messages = useMessagesStore();
    mount(DefaultLayout, {
      global: {
        stubs: {
          "v-app": { template: "<div><slot /></div>" },
          "v-main": { template: "<div><slot /></div>" },
          "v-container": { template: "<div><slot /></div>" },
          Header: true,
          Navigation: true,
          StepBar: true,
          Messages: true,
          Footer: true,
          NuxtPage: true,
        },
      },
    });

    messages.error("Extraction failed");
    route.path = "/dataset/paleocar_v3/visualize/ppt_annual";
    await flushPromises();

    expect(messages.messages).toEqual([]);
  });
});
