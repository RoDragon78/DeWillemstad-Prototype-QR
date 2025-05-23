"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { User, Search, RefreshCw } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface UnassignedGuestsProps {
  currentTableNumber: string | null
  onAssignGuest: (guestId: string, guestName: string, cabinNumber: string) => void
  refreshTrigger?: number // Add a prop to trigger refresh from parent
}

export function UnassignedGuests({ currentTableNumber, onAssignGuest, refreshTrigger = 0 }: UnassignedGuestsProps) {
  const [unassignedGuests, setUnassignedGuests] = useState<any[]>([])
  const [filteredGuests, setFilteredGuests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [assigningGuest, setAssigningGuest] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Fetch unassigned guests with improved filtering
  const fetchUnassignedGuests = async () => {
    try {
      setIsLoading(true)

      // Explicitly fetch guests where table_nr is null
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .is("table_nr", null)
        .order("cabin_nr", { ascending: true })
        .order("guest_name", { ascending: true })

      if (error) {
        console.error("Error fetching unassigned guests:", error)
        return
      }

      console.log("Fetched unassigned guests:", data?.length, data)
      setUnassignedGuests(data || [])
      setFilteredGuests(data || [])
    } catch (error) {
      console.error("Error in fetchUnassignedGuests:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Manual refresh function
  const handleManualRefresh = () => {
    setIsRefreshing(true)
    fetchUnassignedGuests()
  }

  // Initial fetch and setup subscription
  useEffect(() => {
    fetchUnassignedGuests()

    // Set up real-time subscription with improved filtering
    const subscription = supabase
      .channel("unassigned_guests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_manifest",
        },
        (payload) => {
          console.log("Guest manifest change received in UnassignedGuests:", payload)
          // Refresh the unassigned guests list
          fetchUnassignedGuests()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Refresh when parent triggers it
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log("Refresh triggered from parent:", refreshTrigger)
      fetchUnassignedGuests()
    }
  }, [refreshTrigger])

  // Filter guests when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredGuests(unassignedGuests)
      return
    }

    const lowerSearchTerm = searchTerm.toLowerCase()
    const filtered = unassignedGuests.filter(
      (guest) =>
        guest.guest_name?.toLowerCase().includes(lowerSearchTerm) ||
        guest.cabin_nr?.toLowerCase().includes(lowerSearchTerm) ||
        guest.nationality?.toLowerCase().includes(lowerSearchTerm),
    )
    setFilteredGuests(filtered)
  }, [searchTerm, unassignedGuests])

  // Handle guest assignment with improved error handling
  const handleAssignGuest = async (
    guestId: string,
    guestName: string,
    cabinNumber: string,
    event?: React.MouseEvent,
  ) => {
    // Prevent event propagation
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!currentTableNumber) {
      console.error("No table number selected")
      return
    }

    setAssigningGuest(guestId)
    try {
      console.log(`Assigning guest ${guestName} (${guestId}) to table ${currentTableNumber}`)
      await onAssignGuest(guestId, guestName, cabinNumber)

      // Immediately remove the guest from local state for better UX
      setUnassignedGuests((prev) => prev.filter((guest) => guest.id !== guestId))
      setFilteredGuests((prev) => prev.filter((guest) => guest.id !== guestId))

      // Fetch fresh data after a short delay to ensure consistency
      setTimeout(() => {
        fetchUnassignedGuests()
      }, 500)
    } catch (error) {
      console.error("Error assigning guest:", error)
      // Refresh the list in case of error
      fetchUnassignedGuests()
    } finally {
      setAssigningGuest(null)
    }
  }

  // Group guests by cabin
  const groupedGuests = filteredGuests.reduce(
    (acc, guest) => {
      const cabinNr = guest.cabin_nr || "Unknown"
      if (!acc[cabinNr]) {
        acc[cabinNr] = []
      }
      acc[cabinNr].push(guest)
      return acc
    },
    {} as Record<string, any[]>,
  )

  if (isLoading && !isRefreshing) {
    return (
      <div className="mt-4 border rounded-lg p-3 bg-gray-50">
        <LoadingSpinner size={20} text="Loading unassigned guests..." />
      </div>
    )
  }

  return (
    <div className="mt-4 border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h3 className="text-sm font-medium">Unassigned Guests</h3>
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-6 w-6 p-0"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700">
          {unassignedGuests.length} guests
        </Badge>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 text-sm h-8"
        />
      </div>

      <div className="max-h-48 overflow-y-auto pr-1">
        {Object.keys(groupedGuests).length > 0 ? (
          Object.entries(groupedGuests).map(([cabinNr, cabinGuests]) => (
            <div key={cabinNr} className="mb-2">
              <div className="text-xs font-medium text-gray-500 mb-1">Cabin {cabinNr}</div>
              <div className="space-y-1">
                {cabinGuests.map((guest) => (
                  <div key={guest.id} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1 text-gray-400" />
                      <span className="font-medium">{guest.guest_name || "Unknown"}</span>
                      {guest.nationality && <span className="ml-1 text-xs text-gray-500">({guest.nationality})</span>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs hover:bg-blue-50 hover:text-blue-700"
                      disabled={!currentTableNumber || assigningGuest === guest.id}
                      onClick={(e) => handleAssignGuest(guest.id, guest.guest_name, guest.cabin_nr, e)}
                    >
                      {assigningGuest === guest.id ? "..." : "Assign"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            {searchTerm ? "No matching unassigned guests found." : "All guests are assigned to tables."}
          </div>
        )}
      </div>

      {!currentTableNumber && unassignedGuests.length > 0 && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Enter a table number above to assign guests
        </div>
      )}
    </div>
  )
}
