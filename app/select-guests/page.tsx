import { redirect } from "next/navigation"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
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

  // Create Supabase client directly
  const supabase = createSupabaseClient(
    "https://attdjiaiquhmcmipxgrt.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGRqaWFpcXVobWNtaXB4Z3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTg3ODMsImV4cCI6MjA2Mjk3NDc4M30.suoAVmwx0nnO33MCYqresbYryhGdYR_oRUhe0P0i2oE",
  )

  try {
    // Fetch guests for this cabin
    const { data: guests, error } = await supabase
      .from("guest_manifest")
      .select("guest_name, nationality, table_nr, booking_number")
      .eq("cabin_nr", cabinNumber)
      .eq("cruise_id", "CR2023-06") // Using the cruise ID from sample data

    if (error || !guests || guests.length === 0) {
      console.error("Error fetching guests:", error)
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
  } catch (error) {
    console.error("Error in select-guests page:", error)
    redirect("/")
  }
}
