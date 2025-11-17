import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './AuthContext.jsx' // Import the provider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider> {/* Wrap the App in the AuthProvider */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
)