"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { clientStorage } from "@/utils/client-storage"

// Add the missing imports at the top of the file
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FloorPlan } from "@/components/floor-plan"
import { DailyFloorPlan } from "@/components/daily-floor-plan"
import { GuestList } from "@/components/guest-list"
import { UnassignedGuests } from "@/components/unassigned-guests"
import { AlertCircle, CheckCircle, X, LogOut, Users, Calendar, Home } from "lucide-react"

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

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const tableGuestsRef = useRef(null)
  const scrollPositionRef = useRef(0)
  const lastActionRef = useRef(null)

  // State
  const [loading, setLoading] = useState(true)
  const [assigningTables, setAssigningTables] = useState(false)
  const [tableAssignments, setTableAssignments] = useState([])
  const [guests, setGuests] = useState([])
  const [statusMessage, setStatusMessage] = useState(null)

  // Form state for adding a cabin manually
  const [newTableNumber, setNewTableNumber] = useState("")
  const [newCabinNumber, setNewCabinNumber] = useState("")

  // Add state for cabin suggestions
  const [cabinSuggestions, setCabinSuggestions] = useState([])
  const [cabinSearchOpen, setCabinSearchOpen] = useState(false)
  const [selectedCabinGuests, setSelectedCabinGuests] = useState([])

  // Add state for table guest preview
  const [tableGuestPreview, setTableGuestPreview] = useState([])
  const [showTablePreview, setShowTablePreview] = useState(false)
  const [removingGuest, setRemovingGuest] = useState(false)

  // Add state for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [cabinToReassign, setCabinToReassign] = useState(null)
  const [currentTableNumber, setCurrentTableNumber] = useState(null)

  // Add state for dialog scroll positions
  const [dialogScrollPositions, setDialogScrollPositions] = useState({})

  // Add a more robust storeScrollPosition function
  const storeScrollPosition = () => {
    if (typeof window !== "undefined") {
      scrollPositionRef.current = window.scrollY

      // Store dialog scroll positions
      if (tableGuestsRef.current) {
        setDialogScrollPositions((prev) => ({
          ...prev,
          tableGuests: tableGuestsRef.current.scrollTop,
        }))
      }
    }
  }

  // Add a more robust restoreScrollPosition function
  const restoreScrollPosition = () => {
    if (typeof window !== "undefined" && scrollPositionRef.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current)

        // Restore dialog scroll positions
        if (tableGuestsRef.current && dialogScrollPositions.tableGuests !== undefined) {
          setTimeout(() => {
            if (tableGuestsRef.current) {
              tableGuestsRef.current.scrollTop = dialogScrollPositions.tableGuests
            }
          }, 100)
        }
      })
    }
  }

  // Check authentication and fetch data
  useEffect(() => {
    const isAuthenticated = clientStorage.getLocalItem("isAdminAuthenticated") === "true"
    if (!isAuthenticated) {
      router.push("/admin/login")
    } else {
      fetchGuests()
    }
  }, [])

  // Set up real-time subscription for guest_manifest table
  useEffect(() => {
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
          console.log("Change received in Dashboard:", payload)
          storeScrollPosition()
          fetchGuests().then(() => {
            restoreScrollPosition()
          })
        },
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Add function to search for cabins - improved with better cleanup
  const searchCabins = async (term) => {
    // Clear suggestions if term is too short
    if (!term || term.length < 2) {
      setCabinSuggestions([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .ilike("cabin_nr", `%${term}%`)
        .order("cabin_nr", { ascending: true })

      if (error) {
        console.error("Error searching cabins:", error)
        throw error
      }

      // Group by cabin number
      const cabinGroups = {}
      if (data) {
        for (let i = 0; i < data.length; i++) {
          const guest = data[i]
          if (!cabinGroups[guest.cabin_nr]) {
            cabinGroups[guest.cabin_nr] = []
          }
          cabinGroups[guest.cabin_nr].push(guest)
        }
      }

      // Convert to suggestions
      const suggestions = []
      const cabins = Object.keys(cabinGroups)
      for (let i = 0; i < cabins.length; i++) {
        const cabin = cabins[i]
        suggestions.push({
          cabin_nr: cabin,
          guests: cabinGroups[cabin],
          // Check if all guests in this cabin are assigned to the same table
          table_nr:
            cabinGroups[cabin].length > 0 &&
            cabinGroups[cabin].every((g) => g.table_nr === cabinGroups[cabin][0].table_nr)
              ? cabinGroups[cabin][0].table_nr
              : null,
        })
      }

      setCabinSuggestions(suggestions)
    } catch (error) {
      console.error("Error searching cabins:", error)
      setCabinSuggestions([])
    }
  }

  // Modify the handleCabinSelect function - improved with proper cleanup
  const handleCabinSelect = async (cabin) => {
    storeScrollPosition()
    setNewCabinNumber(cabin.cabin_nr)
    setSelectedCabinGuests(cabin.guests)
    setCabinSearchOpen(false)
    setCabinSuggestions([]) // Clear suggestions after selection

    // If table number is already selected, automatically add the cabin to the table
    if (newTableNumber) {
      // Check if cabin is already assigned to a different table
      if (cabin.table_nr && cabin.table_nr !== Number.parseInt(newTableNumber)) {
        // Show confirmation dialog
        setCabinToReassign(cabin)
        setCurrentTableNumber(cabin.table_nr)
        setConfirmDialogOpen(true)
      } else if (!cabin.table_nr) {
        // Wait for state to update
        setTimeout(() => {
          addCabinToTable(cabin.cabin_nr, "")
        }, 100)
      }
    }
  }

  // Handle quick assign from search results - improved with proper cleanup
  const handleQuickAssign = (cabin) => {
    storeScrollPosition()
    if (!newTableNumber) {
      setStatusMessage({
        type: "error",
        message: "Please enter a table number first.",
      })
      return
    }

    // Close the dropdown and clear suggestions
    setCabinSearchOpen(false)
    setCabinSuggestions([])

    // Check if cabin is already assigned to a different table
    if (cabin.table_nr && cabin.table_nr !== Number.parseInt(newTableNumber)) {
      // Show confirmation dialog
      setCabinToReassign(cabin)
      setCurrentTableNumber(cabin.table_nr)
      setConfirmDialogOpen(true)
    } else {
      addCabinToTable(cabin.cabin_nr, "")
    }
  }

  // Preview guests at a table when table number is entered
  const previewTableGuests = async (tableNumber) => {
    if (!tableNumber || isNaN(Number.parseInt(tableNumber, 10))) {
      setTableGuestPreview([])
      setShowTablePreview(false)
      return
    }

    try {
      const tableNum = Number.parseInt(tableNumber, 10)
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("table_nr", tableNum)
        .order("cabin_nr", { ascending: true })

      if (error) {
        console.error("Error fetching table guests:", error)
        throw error
      }

      setTableGuestPreview(data || [])
      setShowTablePreview(data && data.length > 0)
    } catch (error) {
      console.error("Error fetching table guests:", error)
      setTableGuestPreview([])
      setShowTablePreview(false)
    }
  }

  // Update table preview when table number changes
  useEffect(() => {
    previewTableGuests(newTableNumber)
  }, [newTableNumber])

  // Fetch all guests
  const fetchGuests = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase.from("guest_manifest").select("*")

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }

      console.log("Fetched guests:", data)
      setGuests(data || [])
      processTableAssignments(data || [])

      // If we have a table number selected, refresh the preview
      if (newTableNumber) {
        previewTableGuests(newTableNumber)
      }

      setLoading(false)
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
  const processTableAssignments = (guestData) => {
    const assignments = []

    // Group guests by table number
    const tableGroups = {}

    for (let i = 0; i < guestData.length; i++) {
      const guest = guestData[i]
      if (guest.table_nr) {
        if (!tableGroups[guest.table_nr]) {
          tableGroups[guest.table_nr] = []
        }
        tableGroups[guest.table_nr].push(guest)
      }
    }

    // Convert to table assignments
    const tableNumbers = Object.keys(tableGroups)
    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const tableGuests = tableGroups[tableNumber]

      // Group by nationality within the table
      const nationalityGroups = {}

      for (let j = 0; j < tableGuests.length; j++) {
        const guest = tableGuests[j]
        const nationality = guest.nationality || "Unknown"
        if (!nationalityGroups[nationality]) {
          nationalityGroups[nationality] = []
        }
        nationalityGroups[nationality].push(guest)
      }

      // Create an assignment for each nationality group
      const nationalities = Object.keys(nationalityGroups)
      for (let j = 0; j < nationalities.length; j++) {
        const nationality = nationalities[j]
        const nationalityGuests = nationalityGroups[nationality]

        // Further group by booking number
        const bookingGroups = {}

        for (let k = 0; k < nationalityGuests.length; k++) {
          const guest = nationalityGuests[k]
          const bookingNumber = guest.booking_number || "Unknown"
          if (!bookingGroups[bookingNumber]) {
            bookingGroups[bookingNumber] = []
          }
          bookingGroups[bookingNumber].push(guest)
        }

        // Create an assignment for each booking group
        const bookingNumbers = Object.keys(bookingGroups)
        for (let k = 0; k < bookingNumbers.length; k++) {
          const bookingNumber = bookingNumbers[k]
          const bookingGuests = bookingGroups[bookingNumber]

          // Get unique cabin numbers
          const cabins = []
          for (let l = 0; l < bookingGuests.length; l++) {
            const cabinNr = bookingGuests[l].cabin_nr
            if (cabins.indexOf(cabinNr) === -1) {
              cabins.push(cabinNr)
            }
          }

          assignments.push({
            table_number: Number.parseInt(tableNumber, 10),
            cabins: cabins,
            nationality: nationality,
            booking_number: bookingNumber,
          })
        }
      }
    }

    // Sort by table number
    assignments.sort((a, b) => a.table_number - b.table_number)

    setTableAssignments(assignments)
  }

  // Add a cabin to a table manually
  const addCabinToTable = async (cabinNumberToAdd, nationalityToAdd) => {
    try {
      storeScrollPosition()
      const cabinToAdd = cabinNumberToAdd || newCabinNumber

      if (!newTableNumber || !cabinToAdd) {
        setStatusMessage({
          type: "error",
          message: "Table number and cabin number are required.",
        })
        return
      }

      const tableNumber = Number.parseInt(newTableNumber, 10)

      // Validate table number
      if (!TABLE_CAPACITIES[tableNumber]) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not exist.`,
        })
        return
      }

      // Find the guests with this cabin number
      const { data: cabinGuests, error: fetchError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", cabinToAdd)

      if (fetchError) {
        console.error("Error fetching cabin guests:", fetchError)
        throw fetchError
      }

      if (!cabinGuests || cabinGuests.length === 0) {
        setStatusMessage({
          type: "error",
          message: `Cabin ${cabinToAdd} not found.`,
        })
        return
      }

      // Check if the table has enough capacity
      let currentTableGuestCount = 0
      for (let i = 0; i < guests.length; i++) {
        if (guests[i].table_nr === tableNumber) {
          currentTableGuestCount++
        }
      }

      const cabinGuestsCount = cabinGuests.length

      if (currentTableGuestCount + cabinGuestsCount > TABLE_CAPACITIES[tableNumber]) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not have enough capacity for cabin ${cabinToAdd}.`,
        })
        return
      }

      // Update the guests
      for (let i = 0; i < cabinGuests.length; i++) {
        const guest = cabinGuests[i]
        const { error: updateError } = await supabase
          .from("guest_manifest")
          .update({
            table_nr: tableNumber,
          })
          .eq("id", guest.id)

        if (updateError) {
          console.error("Error updating guest:", updateError)
          throw updateError
        }
      }

      // Refresh data
      await fetchGuests()
      restoreScrollPosition()

      // Clear the form and close dropdown
      setNewCabinNumber("")
      setSelectedCabinGuests([])
      setCabinSearchOpen(false)
      setCabinSuggestions([])

      setStatusMessage({
        type: "success",
        message: `Cabin ${cabinToAdd} has been assigned to table ${tableNumber}.`,
      })
    } catch (error) {
      console.error("Error adding cabin to table:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to add cabin to table. Please try again.",
      })
      // Refresh data to ensure consistency
      fetchGuests()
    }
  }

  // Add the return statement at the end of the DashboardPage function, just before the final closing brace
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">DeWillemstad Admin Dashboard</h1>
          <Button
            variant="ghost"
            onClick={() => {
              clientStorage.removeLocalItem("isAdminAuthenticated")
              router.push("/admin/login")
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {statusMessage && (
          <Alert
            className={`mb-6 ${
              statusMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={statusMessage.type === "success" ? "text-green-700" : "text-red-700"}>
              {statusMessage.message}
            </AlertDescription>
            <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0" onClick={() => setStatusMessage(null)}>
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <Tabs defaultValue="tables">
          <TabsList className="mb-6">
            <TabsTrigger value="tables" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Table Assignments
            </TabsTrigger>
            <TabsTrigger value="floor-plan" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Floor Plan
            </TabsTrigger>
            <TabsTrigger value="daily-floor-plan" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Daily Floor Plan
            </TabsTrigger>
            <TabsTrigger value="guest-list" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Guest List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <CardTitle>Table Assignment System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Assign Cabin to Table</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="table-number" className="block text-sm font-medium mb-1">
                          Table Number
                        </label>
                        <Input
                          id="table-number"
                          type="number"
                          placeholder="Enter table number"
                          value={newTableNumber}
                          onChange={(e) => setNewTableNumber(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <label htmlFor="cabin-number" className="block text-sm font-medium mb-1">
                          Cabin Number
                        </label>
                        <div className="relative">
                          <Input
                            id="cabin-number"
                            placeholder="Enter cabin number"
                            value={newCabinNumber}
                            onChange={(e) => {
                              setNewCabinNumber(e.target.value)
                              searchCabins(e.target.value)
                              setCabinSearchOpen(true)
                            }}
                            onFocus={() => {
                              if (newCabinNumber) {
                                searchCabins(newCabinNumber)
                                setCabinSearchOpen(true)
                              }
                            }}
                          />
                          {newCabinNumber && (
                            <button
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              onClick={() => {
                                setNewCabinNumber("")
                                setCabinSearchOpen(false)
                                setCabinSuggestions([])
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Cabin search results dropdown */}
                        {cabinSearchOpen && cabinSuggestions.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-auto">
                            {cabinSuggestions.map((cabin) => (
                              <div
                                key={cabin.cabin_nr}
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                onClick={() => handleCabinSelect(cabin)}
                              >
                                <div>
                                  <div className="font-medium">Cabin {cabin.cabin_nr}</div>
                                  <div className="text-xs text-gray-500">
                                    {cabin.guests.length} guests
                                    {cabin.table_nr && (
                                      <span className="ml-1 text-blue-600">(Table {cabin.table_nr})</span>
                                    )}
                                  </div>
                                </div>
                                {newTableNumber && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleQuickAssign(cabin)
                                    }}
                                  >
                                    Assign
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedCabinGuests.length > 0 && (
                      <div className="mb-4 p-3 border rounded-md bg-gray-50">
                        <h4 className="text-sm font-medium mb-2">Selected Cabin Guests:</h4>
                        <ul className="text-sm">
                          {selectedCabinGuests.map((guest) => (
                            <li key={guest.id} className="mb-1">
                              {guest.guest_name}
                              {guest.nationality && <span className="text-gray-500 ml-1">({guest.nationality})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={() => addCabinToTable(newCabinNumber, "")}
                      disabled={!newTableNumber || !newCabinNumber}
                    >
                      Assign Cabin to Table
                    </Button>

                    {/* Table preview */}
                    {showTablePreview && (
                      <div className="mt-4 p-3 border rounded-md bg-blue-50">
                        <h4 className="text-sm font-medium mb-2">Current Guests at Table {newTableNumber}:</h4>
                        {tableGuestPreview.length > 0 ? (
                          <ul className="text-sm">
                            {tableGuestPreview.map((guest) => (
                              <li key={guest.id} className="mb-1">
                                {guest.guest_name} (Cabin {guest.cabin_nr})
                                {guest.nationality && <span className="text-gray-500 ml-1">({guest.nationality})</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm">No guests currently assigned to this table.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Unassigned Guests</h3>
                    <UnassignedGuests
                      currentTableNumber={newTableNumber}
                      onAssignGuest={(guestId, guestName, cabinNumber) => {
                        addCabinToTable(cabinNumber, "")
                      }}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Current Table Assignments</h3>
                  {tableAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tableAssignments.map((assignment, index) => (
                        <div key={`${assignment.table_number}-${index}`} className="border rounded-md p-3 bg-white">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Table {assignment.table_number}</h4>
                            <span className="text-sm text-gray-500">{assignment.nationality || "Unknown"}</span>
                          </div>
                          <div className="text-sm">
                            <div>
                              Cabins:{" "}
                              {assignment.cabins.map((cabin) => (
                                <span
                                  key={cabin}
                                  className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs mr-1 mb-1"
                                >
                                  {cabin}
                                </span>
                              ))}
                            </div>
                            {assignment.booking_number && assignment.booking_number !== "Unknown" && (
                              <div className="text-gray-500 mt-1">Booking: {assignment.booking_number}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No table assignments yet. Use the form above to assign cabins to tables.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="floor-plan">
            <Card>
              <CardHeader>
                <CardTitle>Floor Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <FloorPlan
                  tableCapacities={TABLE_CAPACITIES}
                  tableAssignments={tableAssignments}
                  guests={guests}
                  onTableUpdate={fetchGuests}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily-floor-plan">
            <DailyFloorPlan tableCapacities={TABLE_CAPACITIES} guests={guests} onTableUpdate={fetchGuests} />
          </TabsContent>

          <TabsContent value="guest-list">
            <GuestList />
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirmation Dialog for reassigning cabins */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Cabin</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Cabin {cabinToReassign?.cabin_nr} is already assigned to Table {currentTableNumber}. Do you want to
              reassign it to Table {newTableNumber}?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmDialogOpen(false)
                if (cabinToReassign) {
                  addCabinToTable(cabinToReassign.cabin_nr, "")
                }
              }}
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
