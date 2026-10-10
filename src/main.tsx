import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './lib/i18n'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/Toast'

registerSW({ immediate: true })

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, networkMode: 'offlineFirst', refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
