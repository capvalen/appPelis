import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [],
  define: {
    // Expone la versión de package.json en el código del cliente
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        peliculas: 'peliculas.html',
        juegos: 'juegos.html',
        config: 'config.html',
        reportes: 'reportes.html',
        etiquetas: 'etiquetas.html'
      }
    }
  }
});
