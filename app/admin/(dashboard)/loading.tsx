function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface ${className}`} />
}

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      <Pulse className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Pulse key={i} className="h-24" />
        ))}
      </div>
      <Pulse className="h-96" />
    </div>
  )
}
