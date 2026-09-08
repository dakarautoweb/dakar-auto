function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface ${className}`} />
}

export default function AdminRequestDetailLoading() {
  return (
    <div className="space-y-6">
      <Pulse className="h-5 w-32" />
      <Pulse className="h-16 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Pulse className="h-40" />
          <Pulse className="h-40" />
          <Pulse className="h-40" />
        </div>
        <div className="space-y-6">
          <Pulse className="h-48" />
          <Pulse className="h-48" />
        </div>
      </div>
    </div>
  )
}
