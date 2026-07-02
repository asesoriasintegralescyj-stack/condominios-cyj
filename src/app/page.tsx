'use client'

import { Sidebar } from '@/components/Sidebar'
import { MainContent } from '@/components/MainContent'
import { LandingPage } from '@/components/landing/LandingPage'
import { useSession } from '@/hooks/use-session'
import { useMounted } from '@/hooks/use-mounted'

export default function Home() {
  const { authenticated } = useSession()
  const isMounted = useMounted()

  // If authenticated and mounted on client, show dashboard
  if (isMounted() && authenticated) {
    return (
      <div className="h-screen overflow-hidden bg-slate-100 flex">
        <Sidebar />
        <MainContent />
      </div>
    )
  }

  // Show landing page immediately (both SSR and initial CSR)
  // This prevents the loading spinner flash
  return <LandingPage />
}
