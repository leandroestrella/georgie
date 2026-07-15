import { Button } from '@/components/ui/button'

/**
 * Root application shell.
 *
 * Phase 0 renders a minimal, styled placeholder so the toolchain (Vite,
 * Tailwind v4, shadcn/ui) is verifiably wired up. Real routing and the catalog
 * UI arrive in later phases (see the execution plan / PLAN.md).
 */
function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-8 text-center">
      <img src="/georgie.gif" alt="georgie" className="w-40 max-w-[60vw]" />
      <div className="space-y-1">
        <h1 className="text-4xl font-semibold lowercase tracking-tight">
          georgie
        </h1>
        <p className="text-muted-foreground lowercase">
          a cozy little home for your home library.
        </p>
      </div>
      <Button disabled>coming soon</Button>
    </div>
  )
}

export default App
