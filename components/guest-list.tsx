"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowDown, ArrowUp } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type SortDirection = "asc" | "desc"
type SortField = "guest_name" | "cabin_nr" | "booking_number" | "table_nr" | "nationality"

export function GuestList() {
  const [guests, setGuests] = useState<any[]>([])
  const [sortField, setSortField] = useState<SortField>("guest_name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Fetch all guests
  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .order(sortField, { ascending: sortDirection === "asc" })

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }
      setGuests(data || [])
    } catch (error) {
      console.error("Error fetching guests:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, sortField, sortDirection])

  // Set up real-time subscription
  useEffect(() => {
    fetchGuests()

    const subscription = supabase
      .channel("guest_list_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_manifest" }, () => fetchGuests())
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchGuests])

  // Handle sort change
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
      <h2 className="text-lg font-semibold mb-3">Guest List</h2>

      {loading ? (
        <LoadingSpinner size={24} text="Loading guest list..." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { id: "guest_name", label: "Guest Name" },
                  { id: "cabin_nr", label: "Cabin" },
                  { id: "booking_number", label: "Booking" },
                  { id: "table_nr", label: "Table" },
                  { id: "nationality", label: "Nationality" },
                ].map((column) => (
                  <th
                    key={column.id}
                    onClick={() => handleSort(column.id as SortField)}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      {column.label}
                      {sortField === column.id && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{guest.guest_name || "Unknown"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{guest.cabin_nr || "Unknown"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{guest.booking_number || "Unknown"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {guest.table_nr ? (
                      <span className="font-medium">{guest.table_nr}</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{guest.nationality || "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
