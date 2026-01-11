import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { Provider } from '../integrations/tanstack-query/root-provider'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
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
        title: 'red2video - Convert Reddit Posts to Videos',
      },
      {
        name: 'description',
        content:
          'Transform Reddit posts into engaging videos with AI-generated TTS audio and images. Create viral content in minutes.',
      },
      {
        name: 'theme-color',
        content: '#6366f1',
      },
      {
        property: 'og:title',
        content: 'red2video - Convert Reddit Posts to Videos',
      },
      {
        property: 'og:description',
        content:
          'Transform Reddit posts into engaging videos with AI-generated TTS audio and images.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: 'https://red2video.app',
      },
      {
        property: 'og:site_name',
        content: 'red2video',
      },
      {
        property: 'og:image',
        content: 'https://red2video.app/og-image.png',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:site',
        content: '@red2video',
      },
      {
        name: 'twitter:title',
        content: 'red2video - Convert Reddit Posts to Videos',
      },
      {
        name: 'twitter:description',
        content:
          'Transform Reddit posts into engaging videos with AI-generated TTS audio and images.',
      },
      {
        name: 'twitter:image',
        content: 'https://red2video.app/og-image.png',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'canonical',
        href: 'https://red2video.app',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return (
    <Provider queryClient={queryClient}>
      <Outlet />
    </Provider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
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
