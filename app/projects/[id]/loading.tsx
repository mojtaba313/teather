import { Card, CardContent } from "@/src/components/ui/Card"

export default function ProjectLoading() {
  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8">
      {/* Back link skeleton */}
      <div className="h-4 w-24 animate-pulse rounded bg-[var(--badge-bg)]" />

      {/* Header skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--badge-bg)]" />
        <div className="h-4 w-48 animate-pulse rounded bg-[var(--badge-bg)]" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-xl bg-[var(--badge-bg)]" />
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 md:p-5 flex items-center gap-3 md:gap-4">
              <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 animate-pulse rounded-xl bg-[var(--badge-bg)]" />
              <div className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-[var(--badge-bg)]" />
                <div className="h-6 w-8 animate-pulse rounded bg-[var(--badge-bg)]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
