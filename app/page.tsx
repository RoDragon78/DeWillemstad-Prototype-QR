import SimpleCabinForm from "@/components/simple-cabin-form"
import ConnectionTest from "@/components/connection-test"

export default function Home() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cruise Dining Selection</h1>
        <p className="text-muted-foreground mt-2">
          Please enter your cabin number to begin selecting your dinner options
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <SimpleCabinForm />
      </div>

      <div className="mt-12">
        <ConnectionTest />
      </div>
    </div>
  )
}
