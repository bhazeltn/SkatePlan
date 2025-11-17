import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // --- THIS IS THE FIX ---
  server: {
    // This tells Vite to listen on all network interfaces,
    // which is required for it to work inside a container.
    host: '0.0.0.0',
    port: 5173, // This is the port Vite is running on

    // This config is for the Hot Module Replacement (HMR) WebSocket
    // It tells the browser how to connect back to Vite *through* Traefik.
    hmr: {
      // This must be the *public* URL your browser uses
      host: 'skateplan.bradnet.net',
      // Your Traefik is on 'websecure', so we use 'wss' (Secure WebSocket)
      protocol: 'wss',
      // Traefik listens on 443
      clientPort: 443
    }
  }
})