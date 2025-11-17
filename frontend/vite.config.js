import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Import path

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Define the '@' alias to point to 'src'
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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