"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Trash2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useSupabaseClient } from "@supabase/auth-helpers-react"

export default function DashboardPage() {
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [cabinNumber, setCabinNumber] = useState("")
  const [tableOptions, setTableOptions] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [assigningCabin, setAssigningCabin] = useState(false)
  const [removingGuest, setRemovingGuest] = useState(false)
  const [currentTableGuests, setCurrentTableGuests] = useState([])
  const [cabinGuests, setCabinGuests] = useState([])

  const fetchCabinDetails = async (cabinNumber) => {
    if (!cabinNumber) {
      setCabinGuests([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", cabinNumber)
        .order("guest_name", { ascending: true })

      if (error) throw error
      setCabinGuests(data || [])
    } catch (error) {
      console.error("Error fetching cabin details:", error)
      setCabinGuests([])
    }
  }

  useEffect(() => {
    fetchCabinDetails(cabinNumber)
  }, [cabinNumber])

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from("tables").select("table_nr").order("table_nr", { ascending: true })

        if (error) throw error

        const tableNumbers = data.map((item) => item.table_nr)
        setTableOptions(tableNumbers)
      } catch (error) {
        console.error("Error fetching tables:", error)
        toast.error("Failed to load tables.")
      } finally {
        setLoading(false)
      }
    }

    fetchTables()
  }, [supabase])

  useEffect(() => {
    const fetchCurrentTableGuests = async () => {
      if (!selectedTable) {
        setCurrentTableGuests([])
        return
      }

      try {
        const { data, error } = await supabase
          .from("guest_manifest")
          .select("*")
          .eq("table_nr", selectedTable)
          .order("guest_name", { ascending: true })

        if (error) throw error
        setCurrentTableGuests(data || [])
      } catch (error) {
        console.error("Error fetching current table guests:", error)
        toast.error("Failed to load current table guests.")
        setCurrentTableGuests([])
      }
    }

    fetchCurrentTableGuests()
  }, [selectedTable, supabase])

  const handleAssignCabin = async (cabinNumber) => {
    if (!selectedTable) {
      toast.error("Please select a table.")
      return
    }

    setAssigningCabin(true)

    try {
      const { error } = await supabase
        .from("guest_manifest")
        .update({ table_nr: selectedTable })
        .eq("cabin_nr", cabinNumber)

      if (error) throw error

      toast.success(`Successfully assigned cabin ${cabinNumber} to table ${selectedTable}!`)
      fetchCabinDetails(cabinNumber)
    } catch (error) {
      console.error("Error assigning cabin to table:", error)
      toast.error("Failed to assign cabin to table.")
    } finally {
      setAssigningCabin(false)
    }
  }

  const removeGuestFromTable = async (guestId) => {
    setRemovingGuest(true)

    try {
      const { error } = await supabase.from("guest_manifest").update({ table_nr: null }).eq("id", guestId)

      if (error) throw error

      toast.success("Guest removed from table!")
    } catch (error) {
      console.error("Error removing guest from table:", error)
      toast.error("Failed to remove guest from table.")
    } finally {
      setRemovingGuest(false)
      fetchCabinDetails(cabinNumber)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cabin Assignment</CardTitle>
            <CardDescription>Assign cabins to tables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cabin">Cabin Number</Label>
              <Input
                id="cabin"
                placeholder="Enter cabin number"
                value={cabinNumber}
                onChange={(e) => setCabinNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Table Number</Label>
              <Select onValueChange={setSelectedTable}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map((tableNr) => (
                    <SelectItem key={tableNr} value={String(tableNr)}>
                      Table {tableNr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cabinGuests.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Cabin {cabinNumber}</div>
                <div className="space-y-1 mt-2">
                  {cabinGuests.map((guest) => (
                    <div key={guest.id} className="flex items-center text-sm">
                      <Users className="h-3 w-3 mr-2 text-blue-600" />
                      <span className="font-medium">{guest.guest_name}</span>
                      {guest.nationality && <span className="text-xs text-gray-500 ml-2">({guest.nationality})</span>}
                    </div>
                  ))}
                  {cabinGuests[0]?.table_nr && (
                    <div className="text-xs text-blue-600 mt-1">Assigned to Table {cabinGuests[0].table_nr}</div>
                  )}
                </div>
                <Button
                  onClick={() => handleAssignCabin(cabinNumber)}
                  className="mt-2 w-full"
                  disabled={!selectedTable || assigningCabin}
                >
                  {assigningCabin ? "Assigning..." : "Assign"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Table Guests</CardTitle>
            <CardDescription>View and manage guests at the selected table.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Selected Table</Label>
              <Select onValueChange={setSelectedTable}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map((tableNr) => (
                    <SelectItem key={tableNr} value={String(tableNr)}>
                      Table {tableNr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            {currentTableGuests.length === 0 ? (
              <div className="text-gray-500">No guests at this table.</div>
            ) : (
              <ScrollArea className="h-[300px] w-full rounded-md border">
                <div className="p-3 space-y-3">
                  {currentTableGuests.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">{guest.guest_name}</div>
                          <div className="flex items-center text-sm text-gray-500">
                            <span>({guest.cabin_nr})</span>
                            {guest.nationality && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                {guest.nationality}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeGuestFromTable(guest.id)}
                        disabled={removingGuest}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
