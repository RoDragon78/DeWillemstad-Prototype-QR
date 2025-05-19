import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import MealSelectionForm from "@/components/meal-selection-form"

export default async function MealSelectionPage({
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

  const supabase = createClient()

  // Fetch guest details
  const { data: guests, error: guestError } = await supabase
    .from("guest_manifest")
    .select("guest_name, nationality")
    .eq("cabin_nr", cabinNumber)
    .eq("cruise_id", "CR2023-06")

  if (guestError || !guests || guests.length === 0) {
    redirect("/")
  }

  // Filter guests based on selected indices
  const selectedGuests = guestIndices
    .map((index) => ({
      index,
      ...guests[index],
    }))
    .filter((guest) => guest)

  if (selectedGuests.length === 0) {
    redirect("/")
  }

  // Fetch meal options for days 2-7
  const { data: menuItems, error: menuError } = await supabase.from("menu_items").select("*").order("day")

  if (menuError) {
    console.error("Error fetching menu items:", menuError)
    // Continue with empty menu items as fallback
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dinner Selection</h1>
        <p className="text-muted-foreground mt-2">Cabin {cabinNumber}: Please select dinner options for each guest</p>
      </div>

      <MealSelectionForm guests={selectedGuests} menuItems={menuItems || []} cabinNumber={cabinNumber} />
    </div>
  )
}
