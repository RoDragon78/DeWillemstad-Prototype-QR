import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <LoadingSpinner size={40} className="text-blue-500 mb-4" />
      <p className="text-lg">Preparing your PDF...</p>
    </div>
  )
}
