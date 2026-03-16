export default defineNuxtConfig({
  compatibilityDate: "2025-01-15",
  devtools: { enabled: process.env.NODE_ENV !== "production" },

  plugins: [
    "~/plugins/markdown.ts",
    "~/plugins/download.client.ts",
    "~/plugins/leaflet.client.ts",
  ],

  modules: [
    "@pinia/nuxt",
    "vuetify-nuxt-module",
    "@nuxtjs/robots",
    "nuxt-gtag",
    "@sentry/nuxt",
  ],

  app: {
    head: {
      title: "skopeui",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Nuxt 3 migration target for SkopeUI dataset discovery and analysis UI.",
        },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css?family=Material+Icons",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css?family=Bitter:400,700",
        },
        {
          rel: "stylesheet",
          href: "https://use.fontawesome.com/releases/v5.11.2/css/all.css",
        },
      ],
    },
  },

  css: ["leaflet/dist/leaflet.css", "leaflet-draw/dist/leaflet.draw.css"],

  runtimeConfig: {
    sentry: {
      dsn:
        process.env.NUXT_SENTRY_DSN ||
        "https://9b9dc2f60562380edeb675c39fe1c896@sentry.comses.net/4",
    },
    public: {
      gtagId: process.env.NUXT_PUBLIC_GTAG_ID || "G-M0NVBT90BT",
    },
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GTAG_ID || "G-M0NVBT90BT",
    enabled: process.env.NODE_ENV === "production",
  },

  robots: {
    enabled: true,
  },

  sentry: {
    telemetry: false,
  },

  vuetify: {
    vuetifyOptions: {
      theme: {
        defaultTheme: "light",
        themes: {
          light: {
            colors: {
              primary: "#001E6B",
              accent: "#EE6C4D",
              secondary: "#6DB1BF",
              success: "#008148",
              error: "#CC0000",
              info: "#E0FBFC",
              warning: "#FAB716",
            },
          },
        },
      },
    },
  },

  vite: {
    build: {
      cssMinify: "lightningcss",
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/style/variables.scss" as *;',
        },
      },
    },
  },

})