import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        config: 'config.html'
      }
    }
  }
});
