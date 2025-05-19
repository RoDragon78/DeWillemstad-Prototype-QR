import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import GuestSelectionForm from "@/components/guest-selection-form"

export default async function SelectGuestsPage({
  searchParams,
}: {
  searchParams: { cabin?: string }
}) {
  const cabinNumber = searchParams.cabin

  if (!cabinNumber) {
    redirect("/")
  }

  const supabase = createClient()

  // Fetch guests for this cabin
  const { data: guests, error } = await supabase
    .from("guest_manifest")
    .select("guest_name, nationality, table_nr, booking_number")
    .eq("cabin_nr", cabinNumber)
    .eq("cruise_id", "CR2023-06") // Using the cruise ID from sample data

  if (error || !guests || guests.length === 0) {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Select Guests</h1>
        <p className="text-muted-foreground mt-2">
          Cabin {cabinNumber}: Please select the guests who would like to make dinner selections
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <GuestSelectionForm guests={guests} cabinNumber={cabinNumber} />
      </div>
    </div>
  )
}
