import { Skeleton } from '@/components/ui/skeleton';

export function CalendarSkeleton() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-36" />
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-72 border-r p-4 lg:block">
          <Skeleton className="h-80 w-full rounded-lg" />
        </aside>
        <main className="flex-1 p-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
