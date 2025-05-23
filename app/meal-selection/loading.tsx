import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <LoadingSpinner size={40} text="Loading meal selection..." />
    </div>
  )
}
