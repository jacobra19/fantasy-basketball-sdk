import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'espn/index': resolve(__dirname, 'src/espn/index.ts'),
        'yahoo/index': resolve(__dirname, 'src/yahoo/index.ts'),
        'fantrax/index': resolve(__dirname, 'src/fantrax/index.ts'),
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'runtime/index': resolve(__dirname, 'src/runtime/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
