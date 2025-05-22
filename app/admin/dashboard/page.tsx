"use client"

import { CommandGroup } from "@/components/ui/command"
import { CommandEmpty } from "@/components/ui/command"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Search, RefreshCw, Check, User } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { FloorPlan } from "@/components/floor-plan"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandList, CommandInput, CommandItem } from "@/components/ui/command"
import { clientStorage } from "@/utils/client-storage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Table capacity configuration based on the floor plan - removed tables 5 and 15
const TABLE_CAPACITIES = {
  1: 4,
  2: 6,
  3: 6,
  4: 4,
  6: 6,
  7: 4,
  8: 4,
  9: 4,
  10: 4,
  11: 4,
  12: 4,
  13: 4,
  14: 6,
  16: 4,
  17: 6,
  18: 6,
  19: 6,
  20: 4,
}

// Types
interface Guest {
  id: string
  cruise_id: string
  cabin_number: string
  booking_number: string
  nationality: string
  table_nr?: number
  name: string
}

// Add a new interface for cabin suggestions
interface CabinSuggestion {
  cabin_number: string
  guests: Guest[]
}

interface TableAssignment {
  table_number: number
  cabins: string[]
  nationality: string
  booking_number: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  // State
  const [loading, setLoading] = useState(true)
  const [assigningTables, setAssigningTables] = useState(false)
  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; message: string } | null>(
    null,
  )
  const [activeTab, setActiveTab] = useState("floor-plan")

  // Form state for adding a cabin manually
  const [newTableNumber, setNewTableNumber] = useState("")
  const [newCabinNumber, setNewCabinNumber] = useState("")
  const [newNationality, setNewNationality] = useState("")

  // Add state for cabin suggestions
  const [cabinSuggestions, setCabinSuggestions] = useState<CabinSuggestion[]>([])
  const [cabinSearchOpen, setCabinSearchOpen] = useState(false)
  const [selectedCabinGuests, setSelectedCabinGuests] = useState<Guest[]>([])

  // Check authentication and fetch data
  useEffect(() => {
    const isAuthenticated = clientStorage.getLocalItem("isAdminAuthenticated") === "true"
    if (!isAuthenticated) {
      router.push("/admin/login")
    } else {
      fetchGuests()
    }
  }, [router])

  // Add function to search for cabins
  const searchCabins = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 1) {
        setCabinSuggestions([])
        return
      }

      try {
        const { data, error } = await supabase
          .from("guest_manifest")
          .select("*")
          .ilike("cabin_number", `%${searchTerm}%`)
          .order("cabin_number", { ascending: true })

        if (error) throw error

        // Group by cabin number
        const cabinGroups: Record<string, Guest[]> = {}
        data?.forEach((guest) => {
          if (!cabinGroups[guest.cabin_number]) {
            cabinGroups[guest.cabin_number] = []
          }
          cabinGroups[guest.cabin_number].push(guest)
        })

        // Convert to suggestions
        const suggestions: CabinSuggestion[] = Object.entries(cabinGroups).map(([cabin, guests]) => ({
          cabin_number: cabin,
          guests,
        }))

        setCabinSuggestions(suggestions)
      } catch (error) {
        console.error("Error searching cabins:", error)
      }
    },
    [supabase],
  )

  // Add function to handle cabin selection
  const handleCabinSelect = (cabin: CabinSuggestion) => {
    setNewCabinNumber(cabin.cabin_number)
    setSelectedCabinGuests(cabin.guests)

    // If all guests in the cabin have the same nationality, pre-fill it
    const nationalities = new Set(cabin.guests.map((g) => g.nationality))
    if (nationalities.size === 1) {
      setNewNationality(cabin.guests[0].nationality)
    }

    setCabinSearchOpen(false)
  }

  // Fetch all guests
  const fetchGuests = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase.from("guest_manifest").select("*")

      if (error) throw error

      setGuests(data || [])
      processTableAssignments(data || [])

      // Set up real-time subscription for guest_manifest table
      const subscription = supabase
        .channel("guest_manifest_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "guest_manifest",
          },
          (payload) => {
            console.log("Change received!", payload)
            fetchGuests() // Refresh data when changes occur
          },
        )
        .subscribe()

      setLoading(false)

      // Return cleanup function
      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error("Error fetching guests:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to fetch guest data. Please try again.",
      })
      setLoading(false)
    }
  }

  // Process guests into table assignments
  const processTableAssignments = (guestData: Guest[]) => {
    const assignments: TableAssignment[] = []

    // Group guests by table number
    const tableGroups: Record<number, Guest[]> = {}

    guestData.forEach((guest) => {
      if (guest.table_nr) {
        if (!tableGroups[guest.table_nr]) {
          tableGroups[guest.table_nr] = []
        }
        tableGroups[guest.table_nr].push(guest)
      }
    })

    // Convert to table assignments
    Object.entries(tableGroups).forEach(([tableNumber, tableGuests]) => {
      // Group by nationality within the table
      const nationalityGroups: Record<string, Guest[]> = {}

      tableGuests.forEach((guest) => {
        const nationality = guest.nationality || "Unknown"
        if (!nationalityGroups[nationality]) {
          nationalityGroups[nationality] = []
        }
        nationalityGroups[nationality].push(guest)
      })

      // Create an assignment for each nationality group
      Object.entries(nationalityGroups).forEach(([nationality, nationalityGuests]) => {
        // Further group by booking number
        const bookingGroups: Record<string, Guest[]> = {}

        nationalityGuests.forEach((guest) => {
          const bookingNumber = guest.booking_number || "Unknown"
          if (!bookingGroups[bookingNumber]) {
            bookingGroups[bookingNumber] = []
          }
          bookingGroups[bookingNumber].push(guest)
        })

        // Create an assignment for each booking group
        Object.entries(bookingGroups).forEach(([bookingNumber, bookingGuests]) => {
          assignments.push({
            table_number: Number.parseInt(tableNumber),
            cabins: bookingGuests.map((g) => g.cabin_number),
            nationality,
            booking_number: bookingNumber,
          })
        })
      })
    })

    // Sort by table number
    assignments.sort((a, b) => a.table_number - b.table_number)
    setTableAssignments(assignments)
  }

  // Assign tables automatically - start from table 20 instead of table 1
  const assignTablesAutomatically = async () => {
    try {
      setAssigningTables(true)
      setStatusMessage({
        type: "info",
        message: "Assigning tables automatically...",
      })

      // First, clear existing table assignments by updating each guest individually
      const { data: allGuests, error: fetchError } = await supabase.from("guest_manifest").select("id")

      if (fetchError) throw fetchError

      // Update each guest individually to clear table assignments
      for (const guest of allGuests || []) {
        const { error: clearError } = await supabase
          .from("guest_manifest")
          .update({ table_nr: null })
          .eq("id", guest.id)

        if (clearError) throw clearError
      }

      // Fetch all guests again to ensure we have the latest data
      const { data: guests, error: fetchGuestsError } = await supabase
        .from("guest_manifest")
        .select("*")
        .order("booking_number", { ascending: true })

      if (fetchGuestsError) throw fetchGuestsError
      if (!guests || guests.length === 0) {
        setStatusMessage({
          type: "info",
          message: "No guests found.",
        })
        setAssigningTables(false)
        return
      }

      console.log("Starting automatic table assignment with", guests.length, "guests")

      // Group guests by booking number and nationality
      const groupedGuests: Record<string, Guest[]> = {}

      guests.forEach((guest) => {
        const key = `${guest.booking_number}_${guest.nationality}`
        if (!groupedGuests[key]) {
          groupedGuests[key] = []
        }
        groupedGuests[key].push(guest)
      })

      console.log("Grouped guests into", Object.keys(groupedGuests).length, "groups")

      // Sort groups by size (largest first) for better table utilization
      const sortedGroups = Object.values(groupedGuests).sort((a, b) => b.length - a.length)

      // Start assigning tables - use reverse order of table numbers (start from highest)
      const tableNumbers = Object.keys(TABLE_CAPACITIES)
        .map(Number)
        .sort((a, b) => b - a) // Sort in descending order

      const tableAssignments: Record<number, Guest[]> = {}
      const updates: Partial<Guest>[] = []

      // Initialize table assignments
      tableNumbers.forEach((tableNumber) => {
        tableAssignments[tableNumber] = []
      })

      console.log("Initialized table assignments for", tableNumbers.length, "tables")

      // Assign groups to tables
      for (const group of sortedGroups) {
        const groupSize = group.length
        console.log("Processing group with", groupSize, "guests")

        // Find a table that can accommodate this group
        let assignedTable: number | null = null

        for (const tableNumber of tableNumbers) {
          const capacity = TABLE_CAPACITIES[tableNumber]
          const currentOccupancy = tableAssignments[tableNumber].length

          if (currentOccupancy + groupSize <= capacity) {
            assignedTable = tableNumber
            console.log("Found table", tableNumber, "with capacity", capacity, "current occupancy", currentOccupancy)
            break
          }
        }

        // If no table can accommodate the entire group, find the table with the most available space
        if (assignedTable === null) {
          let maxAvailableSpace = 0
          let bestTable = tableNumbers[0]

          for (const tableNumber of tableNumbers) {
            const capacity = TABLE_CAPACITIES[tableNumber]
            const currentOccupancy = tableAssignments[tableNumber].length
            const availableSpace = capacity - currentOccupancy

            if (availableSpace > maxAvailableSpace) {
              maxAvailableSpace = availableSpace
              bestTable = tableNumber
            }
          }

          assignedTable = bestTable
          console.log("No table can fit entire group, using table", bestTable, "with", maxAvailableSpace, "spaces")
        }

        // Assign as many guests as possible to this table
        const capacity = TABLE_CAPACITIES[assignedTable]
        const currentOccupancy = tableAssignments[assignedTable].length
        const availableSpace = capacity - currentOccupancy
        const guestsToAssign = group.slice(0, availableSpace)

        console.log("Assigning", guestsToAssign.length, "guests to table", assignedTable)

        // Add guests to this table
        tableAssignments[assignedTable] = [...tableAssignments[assignedTable], ...guestsToAssign]

        // Prepare updates
        guestsToAssign.forEach((guest) => {
          updates.push({
            id: guest.id,
            table_nr: assignedTable,
          })
        })

        // If there are remaining guests, try to assign them to other tables
        const remainingGuests = group.slice(availableSpace)

        if (remainingGuests.length > 0) {
          console.log("Have", remainingGuests.length, "remaining guests to assign")

          // Find the next best table
          for (const tableNumber of tableNumbers) {
            if (tableNumber === assignedTable) continue

            const capacity = TABLE_CAPACITIES[tableNumber]
            const currentOccupancy = tableAssignments[tableNumber].length
            const availableSpace = capacity - currentOccupancy

            if (availableSpace > 0) {
              const guestsToAssign = remainingGuests.slice(0, availableSpace)
              console.log("Assigning", guestsToAssign.length, "remaining guests to table", tableNumber)

              // Add guests to this table
              tableAssignments[tableNumber] = [...tableAssignments[tableNumber], ...guestsToAssign]

              // Prepare updates
              guestsToAssign.forEach((guest) => {
                updates.push({
                  id: guest.id,
                  table_nr: tableNumber,
                })
              })

              // Remove assigned guests from remaining
              remainingGuests.splice(0, availableSpace)

              if (remainingGuests.length === 0) break
            }
          }
        }
      }

      console.log("Prepared", updates.length, "updates")

      // Batch update all guests
      if (updates.length > 0) {
        // Update each guest individually to avoid batch issues
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from("guest_manifest")
            .update({ table_nr: update.table_nr })
            .eq("id", update.id)

          if (updateError) {
            console.error("Error updating guest:", updateError)
            throw updateError
          }
        }
      }

      // Refresh the data
      await fetchGuests()

      setStatusMessage({
        type: "success",
        message: `Successfully assigned ${updates.length} guests to tables.`,
      })
    } catch (error) {
      console.error("Error assigning tables:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to assign tables. Please try again.",
      })
    } finally {
      setAssigningTables(false)
    }
  }

  // Clear all table assignments
  const clearTableAssignments = async () => {
    try {
      setLoading(true)
      setStatusMessage({
        type: "info",
        message: "Clearing table assignments...",
      })

      // Get all guests first
      const { data: allGuests, error: fetchError } = await supabase.from("guest_manifest").select("id")

      if (fetchError) throw fetchError

      // Update each guest individually to clear table assignments
      for (const guest of allGuests || []) {
        const { error: clearError } = await supabase
          .from("guest_manifest")
          .update({ table_nr: null })
          .eq("id", guest.id)

        if (clearError) throw clearError
      }

      await fetchGuests()

      setStatusMessage({
        type: "success",
        message: "All table assignments have been cleared.",
      })
    } catch (error) {
      console.error("Error clearing table assignments:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to clear table assignments. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add a cabin to a table manually
  const addCabinToTable = async () => {
    try {
      if (!newTableNumber || !newCabinNumber) {
        setStatusMessage({
          type: "error",
          message: "Table number and cabin number are required.",
        })
        return
      }

      const tableNumber = Number.parseInt(newTableNumber)

      // Validate table number
      if (!TABLE_CAPACITIES[tableNumber]) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not exist.`,
        })
        return
      }

      // Find the guest with this cabin number
      const { data: cabinGuests, error: fetchError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_number", newCabinNumber)

      if (fetchError) throw fetchError

      if (!cabinGuests || cabinGuests.length === 0) {
        setStatusMessage({
          type: "error",
          message: `Cabin ${newCabinNumber} not found.`,
        })
        return
      }

      // Check if the table has enough capacity
      const currentTableGuests = guests.filter((g) => g.table_nr === tableNumber)
      const cabinGuestsCount = cabinGuests.length

      if (currentTableGuests.length + cabinGuestsCount > TABLE_CAPACITIES[tableNumber]) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not have enough capacity for cabin ${newCabinNumber}.`,
        })
        return
      }

      // Update the guests
      for (const guest of cabinGuests) {
        const { error: updateError } = await supabase
          .from("guest_manifest")
          .update({
            table_nr: tableNumber,
            nationality: newNationality || guest.nationality,
          })
          .eq("id", guest.id)

        if (updateError) throw updateError
      }

      // Optimistic UI update
      const updatedGuests = [...guests]
      cabinGuests.forEach((guest) => {
        const index = updatedGuests.findIndex((g) => g.id === guest.id)
        if (index !== -1) {
          updatedGuests[index] = {
            ...updatedGuests[index],
            table_nr: tableNumber,
            nationality: newNationality || guest.nationality,
          }
        }
      })

      setGuests(updatedGuests)
      processTableAssignments(updatedGuests)

      // Clear the form
      setNewTableNumber("")
      setNewCabinNumber("")
      setNewNationality("")
      setSelectedCabinGuests([])

      setStatusMessage({
        type: "success",
        message: `Cabin ${newCabinNumber} has been assigned to table ${tableNumber}.`,
      })
    } catch (error) {
      console.error("Error adding cabin to table:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to add cabin to table. Please try again.",
      })
      // Refresh data to revert optimistic update if there was an error
      fetchGuests()
    }
  }

  // Remove a cabin from a table
  const removeCabinFromTable = async (tableNumber: number, cabinNumber: string) => {
    try {
      setStatusMessage({
        type: "info",
        message: `Removing cabin ${cabinNumber} from table ${tableNumber}...`,
      })

      const { data: cabinGuests, error: fetchError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_number", cabinNumber)
        .eq("table_nr", tableNumber)

      if (fetchError) throw fetchError

      if (!cabinGuests || cabinGuests.length === 0) {
        setStatusMessage({
          type: "error",
          message: `Cabin ${cabinNumber} not found at table ${tableNumber}.`,
        })
        return
      }

      // Update each guest individually
      for (const guest of cabinGuests) {
        const { error: updateError } = await supabase
          .from("guest_manifest")
          .update({ table_nr: null })
          .eq("id", guest.id)

        if (updateError) throw updateError
      }

      // Refresh the data
      await fetchGuests()

      setStatusMessage({
        type: "success",
        message: `Cabin ${cabinNumber} has been removed from table ${tableNumber}.`,
      })
    } catch (error) {
      console.error("Error removing cabin from table:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to remove cabin from table. Please try again.",
      })
    }
  }

  // Handle sign out
  function handleSignOut() {
    clientStorage.removeLocalItem("isAdminAuthenticated")
    router.push("/admin/login")
  }

  // Filter table assignments based on search term
  const filteredAssignments = tableAssignments.filter((assignment) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      assignment.table_number.toString().includes(searchLower) ||
      assignment.cabins.some((cabin) => cabin.toLowerCase().includes(searchLower)) ||
      assignment.nationality.toLowerCase().includes(searchLower) ||
      assignment.booking_number.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600">Table Assignment System</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {statusMessage && (
          <Alert
            className={`mb-6 ${
              statusMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : statusMessage.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <AlertDescription>{statusMessage.message}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Control Panel</h2>

          <div className="grid grid-cols-1 gap-3 mb-4">
            <div className="flex gap-2">
              <Button
                onClick={assignTablesAutomatically}
                disabled={assigningTables}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {assigningTables ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Tables Automatically"
                )}
              </Button>

              <Button onClick={clearTableAssignments} variant="outline" disabled={loading} className="flex-1">
                Clear All Assignments
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Total Guests</p>
              <p className="text-2xl font-bold">{guests.length}</p>
            </div>

            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <p className="text-sm text-green-600 font-medium">Assigned Guests</p>
              <p className="text-2xl font-bold">{guests.filter((g) => g.table_nr).length}</p>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-sm text-amber-600 font-medium">Tables Used</p>
              <p className="text-2xl font-bold">{new Set(guests.map((g) => g.table_nr).filter(Boolean)).size}</p>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-600 font-medium">Booking Groups</p>
              <p className="text-2xl font-bold">{new Set(guests.map((g) => g.booking_number)).size}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="floor-plan" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-md mx-auto mb-4 grid grid-cols-2">
            <TabsTrigger value="floor-plan" className="text-sm">
              Floor Plan
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-sm">
              Table Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="floor-plan" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <h2 className="text-lg font-semibold mb-3">Floor Plan</h2>
                  <div className="border rounded-lg overflow-hidden">
                    <FloorPlan tableCapacities={TABLE_CAPACITIES} tableAssignments={tableAssignments} guests={guests} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <h2 className="text-lg font-semibold mb-3">Add Cabin to Table</h2>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="cabin-number">Cabin Number</Label>
                      <div className="relative mt-1">
                        <Popover open={cabinSearchOpen} onOpenChange={setCabinSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={cabinSearchOpen}
                              className="w-full justify-between"
                            >
                              {newCabinNumber || "Select cabin..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search cabins..."
                                onValueChange={(value) => searchCabins(value)}
                              />
                              <CommandList>
                                <CommandEmpty>No cabins found.</CommandEmpty>
                                <CommandGroup>
                                  {cabinSuggestions.map((cabin) => (
                                    <CommandItem
                                      key={cabin.cabin_number}
                                      value={cabin.cabin_number}
                                      onSelect={() => handleCabinSelect(cabin)}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          newCabinNumber === cabin.cabin_number ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {cabin.cabin_number} - {cabin.guests.map((g) => g.name).join(", ")}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {selectedCabinGuests.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <h4 className="text-sm font-medium mb-2">Guest Names:</h4>
                        <ul className="space-y-1">
                          {selectedCabinGuests.map((guest) => (
                            <li key={guest.id} className="text-sm flex items-center">
                              <User className="h-3 w-3 mr-1 text-gray-400" />
                              {guest.name || "Unknown"}
                              {guest.nationality && <span className="text-gray-500 ml-1">({guest.nationality})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="table-number">Table Number</Label>
                      <Input
                        id="table-number"
                        placeholder="e.g. 20"
                        value={newTableNumber}
                        onChange={(e) => setNewTableNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="nationality">Nationality (Optional)</Label>
                      <Input
                        id="nationality"
                        placeholder="e.g. German"
                        value={newNationality}
                        onChange={(e) => setNewNationality(e.target.value)}
                      />
                    </div>

                    <Button onClick={addCabinToTable} className="w-full">
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Table Assignments</h2>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by table, cabin, nationality..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Table
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cabin Numbers
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest Names
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nationality
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssignments.length > 0 ? (
                      filteredAssignments.map((assignment, index) => {
                        // Find all guests for this assignment
                        const assignmentGuests = guests.filter(
                          (g) =>
                            g.table_nr === assignment.table_number &&
                            assignment.cabins.includes(g.cabin_number) &&
                            g.nationality === assignment.nationality,
                        )

                        return (
                          <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {assignment.table_number}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-wrap gap-1">
                                {assignment.cabins.map((cabin) => (
                                  <Badge
                                    key={cabin}
                                    className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  >
                                    {cabin}
                                    <button
                                      onClick={() => removeCabinFromTable(assignment.table_number, cabin)}
                                      className="ml-1 text-blue-500 hover:text-blue-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {assignmentGuests.map((g) => g.name).join(", ")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {assignment.nationality}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => {
                                  setNewTableNumber(assignment.table_number.toString())
                                  setNewNationality(assignment.nationality)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Cabin
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-center text-sm text-gray-500">
                          {searchTerm ? "No matching assignments found." : "No table assignments yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
