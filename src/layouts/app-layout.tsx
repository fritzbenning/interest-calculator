import { Outlet } from 'react-router-dom'
import { AppTabs } from '../components/app-tabs'

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppTabs />
      <Outlet />
    </div>
  )
}
