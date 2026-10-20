import { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext, createRoute, createRouter } from '@tanstack/react-router'
import type { WindowStatus } from '../shared/drinkWindow.ts'
import { winesQuery } from './api.ts'
import { Icon, type IconName } from './components/Icon.tsx'
import { Cellar } from './pages/Cellar.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Import } from './pages/Import.tsx'
import { EditWine, NewWine } from './pages/WineForm.tsx'

const NAV: { to: '/' | '/cellar' | '/add' | '/import'; label: string; icon: IconName }[] = [
  { to: '/', label: 'Tonight', icon: 'glass' },
  { to: '/cellar', label: 'Cellar', icon: 'bottles' },
  { to: '/add', label: 'Add wine', icon: 'plus' },
  { to: '/import', label: 'Import', icon: 'upload' },
]

function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          Varietal
        </Link>
        <nav className="nav">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === '/' }} activeProps={{ className: 'active' }}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <p className="sidebar-note">Every bottle, in its own time.</p>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Layout,
  // Every page reads the (small) cellar, so load it once up front.
  loader: ({ context }) => context.queryClient.ensureQueryData(winesQuery),
  pendingComponent: () => <p className="muted">Opening the cellar…</p>,
  errorComponent: ({ error }) => <p className="error">Couldn’t load your cellar: {(error as Error).message}</p>,
})

const STATUSES = ['not-ready', 'ready', 'last-call', 'past'] as const

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Dashboard })
const cellarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cellar',
  validateSearch: (search: Record<string, unknown>): { status?: WindowStatus } => ({
    status: STATUSES.find((s) => s === search.status),
  }),
  component: Cellar,
})
const addRoute = createRoute({ getParentRoute: () => rootRoute, path: '/add', component: NewWine })
const wineRoute = createRoute({ getParentRoute: () => rootRoute, path: '/wine/$id', component: EditWine })
const importRoute = createRoute({ getParentRoute: () => rootRoute, path: '/import', component: Import })

const routeTree = rootRoute.addChildren([indexRoute, cellarRoute, addRoute, wineRoute, importRoute])

export const queryClient = new QueryClient()

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
