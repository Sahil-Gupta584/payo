import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Payo — Powering AI to shop online',
      },
      {
        name: 'theme-color',
        content: '#1A6FEF',
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon.png' },
      { rel: 'shortcut icon', href: '/favicon.png' },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: ({ error }: { error?: any }) => {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Something went wrong</h1>
        <p className="mt-1 text-sm text-neutral-500">{(error as any)?.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-neutral-800"
        >
          Try again
        </button>
      </div>
    )
  },
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
