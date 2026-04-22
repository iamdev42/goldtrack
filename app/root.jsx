import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import './app.css'

export function links() {
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    },
  ]
}

export function meta() {
  return [
    { title: 'GoldTrack' },
    { name: 'description', content: 'Business management for goldsmith shops' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
  ]
}

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  // Single QueryClient per app instance. useState ensures it's stable across re-renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // cached data is fresh for 30s
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  )
}

export function ErrorBoundary({ error }) {
  const message = error?.statusText || error?.message || 'Something went wrong.'
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-brand-800 mb-2">Unexpected error</h1>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <a href="/" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
          ← Back home
        </a>
      </div>
    </div>
  )
}
