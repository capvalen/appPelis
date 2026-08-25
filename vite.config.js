import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        juegos: 'juegos.html',
        config: 'config.html',
        reportes: 'reportes.html',
        etiquetas: 'etiquetas.html'
      }
    }
  }
});
