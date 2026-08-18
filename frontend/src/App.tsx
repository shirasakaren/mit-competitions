import { Routes, Route } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { AppShell } from '@/app/shell/AppShell'
import Overview from '@/pages/Overview'
import Search from '@/pages/Search'
import Quality from '@/pages/Quality'
import Duplicates from '@/pages/Duplicates'
import System from '@/pages/System'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="search" element={<Search />} />
          <Route path="quality" element={<Quality />} />
          <Route path="duplicates" element={<Duplicates />} />
          <Route path="system" element={<System />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AppProviders>
  )
}
