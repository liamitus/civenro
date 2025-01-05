// cypress.config.ts

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173/'
        : 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
