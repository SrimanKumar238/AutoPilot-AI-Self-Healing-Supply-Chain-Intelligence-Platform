import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1f3c',
            color: '#e2e8f0',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#0d1f3c' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#0d1f3c' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
