import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// ─── React Query client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,        // 2 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// ─── Toast config ─────────────────────────────────────────────────────────────
const toastOptions = {
  duration: 4000,
  style: {
    background: '#1e293b',
    color: '#f1f5f9',
    border: '1px solid #334155',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    padding: '12px 16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  success: {
    iconTheme: { primary: '#22c55e', secondary: '#1e293b' },
    style: {
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #166534',
    },
  },
  error: {
    iconTheme: { primary: '#f43f5e', secondary: '#1e293b' },
    style: {
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #9f1239',
    },
    duration: 5000,
  },
  loading: {
    iconTheme: { primary: '#3b82f6', secondary: '#1e293b' },
    style: {
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #1d4ed8',
    },
  },
};

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={toastOptions}
        />
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);