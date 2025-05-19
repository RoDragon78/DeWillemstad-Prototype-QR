import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { cabinNumber, guestIds } = await request.json()

    if (!cabinNumber || !guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch guest details
    const { data: guests, error: guestError } = await supabase
      .from("guest_manifest")
      .select("id, first_name, last_name")
      .in("id", guestIds)

    if (guestError || !guests || guests.length === 0) {
      return NextResponse.json({ error: "Failed to fetch guest details" }, { status: 500 })
    }

    // Fetch meal selections
    const { data: selections, error: selectionsError } = await supabase
      .from("meal_selections")
      .select(`
        id,
        day,
        category,
        guest_id,
        meal_options (
          id,
          name,
          description
        )
      `)
      .in("guest_id", guestIds)
      .order("day")

    if (selectionsError) {
      return NextResponse.json({ error: "Failed to fetch meal selections" }, { status: 500 })
    }

    // Return the data needed for PDF generation
    return NextResponse.json({
      cabinNumber,
      guests,
      selections: selections || [],
    })
  } catch (error) {
    console.error("Error in PDF generation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
