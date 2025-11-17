import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url' // <-- Make sure this line is here

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // --- THIS IS THE FIX ---
  // We are defining the '@' alias in the modern, ES-Module-safe way.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url))
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173, 
    hmr: {
      host: 'skateplan.bradnet.net',
      protocol: 'wss',
      clientPort: 443
    }
  }
})