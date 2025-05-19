import { redirect } from "next/navigation"
import { createDirectClient } from "@/lib/supabase/direct-client"
import ConfirmationDetails from "@/components/confirmation-details"

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { cabin?: string; guestIndex?: string[] | string }
}) {
  const cabinNumber = searchParams.cabin
  const guestIndices = Array.isArray(searchParams.guestIndex)
    ? searchParams.guestIndex.map(Number)
    : searchParams.guestIndex
      ? [Number(searchParams.guestIndex)]
      : []

  if (!cabinNumber || guestIndices.length === 0) {
    redirect("/")
  }

  const supabase = createDirectClient()

  // Fetch guest details
  const { data: guests, error: guestError } = await supabase
    .from("guest_manifest")
    .select("guest_name, nationality")
    .eq("cabin_nr", cabinNumber)
    .eq("cruise_id", "CR2023-06")

  if (guestError || !guests || guests.length === 0) {
    console.error("Error fetching guests:", guestError)
    redirect("/")
  }

  // Filter guests based on selected indices
  const selectedGuests = guestIndices
    .map((index) => ({
      index,
      ...guests[index],
    }))
    .filter((guest) => guest)

  // Fetch meal selections for these guests
  const { data: selections, error: selectionsError } = await supabase
    .from("meal_choices")
    .select("*")
    .eq("cabin_nr", cabinNumber)
    .eq("cruise_id", "CR2023-06")
    .in("guest_index", guestIndices)
    .order("day")

  if (selectionsError) {
    console.error("Error fetching selections:", selectionsError)
    // Continue with empty selections as fallback
  }

  // Fetch menu items for reference
  const { data: menuItems, error: menuError } = await supabase.from("menu_items").select("*")

  if (menuError) {
    console.error("Error fetching menu items:", menuError)
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Confirmation</h1>
        <p className="text-muted-foreground mt-2">Cabin {cabinNumber}: Your dinner selections have been saved</p>
      </div>

      <ConfirmationDetails
        guests={selectedGuests}
        selections={selections || []}
        menuItems={menuItems || []}
        cabinNumber={cabinNumber}
      />
    </div>
  )
}
