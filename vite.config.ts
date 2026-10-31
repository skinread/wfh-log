import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { voidPlugin } from 'void';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [voidPlugin(), react(), tailwindcss()],
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: {
            // Split React and other vendor code from the app so the browser bundle stays under 500 kB per chunk.
            codeSplitting: {
              groups: [
                { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
                { name: 'vendor', test: /node_modules[\\/]/ },
              ],
            },
          },
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
