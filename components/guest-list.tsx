"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Edit, Trash2, Utensils } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "./confirm-dialog"

interface Guest {
  id: string
  guest_name: string
  cabin_nr: string
  booking_number: string
  table_nr: string
  nationality: string
  meal_status: string
}

interface MealSelection {
  [guestId: string]: {
    [day: string]: boolean
  }
}

interface GuestListProps {
  initialGuests: Guest[]
  initialMealSelections: MealSelection
  fetchGuests: () => Promise<void>
  fetchMealSelections: () => Promise<void>
}

export function GuestList({ initialGuests, initialMealSelections, fetchGuests, fetchMealSelections }: GuestListProps) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 500)
  const [sortColumn, setSortColumn] = useState<keyof Guest | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    action: () => Promise<void>
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  })
  const [loadingStates, setLoadingStates] = useState({
    addGuest: false,
    deleteMeals: false,
    refresh: false,
    export: false,
    bulkAssign: false,
  })
  const [mealSelections, setMealSelections] = useState<MealSelection>(initialMealSelections)

  useEffect(() => {
    setGuests(initialGuests)
  }, [initialGuests])

  useEffect(() => {
    setMealSelections(initialMealSelections)
  }, [initialMealSelections])

  useEffect(() => {
    const fetchFilteredGuests = async () => {
      if (!debouncedSearch) {
        setGuests(initialGuests)
        return
      }

      const { data: filteredGuests, error } = await supabase
        .from("guests")
        .like("guest_name", `%${debouncedSearch}%`)
        .order("guest_name", { ascending: true })

      if (error) {
        console.error("Error fetching filtered guests:", error)
        toast({
          title: "Error",
          description: "Failed to fetch filtered guests. Please try again.",
          variant: "destructive",
        })
      } else {
        setGuests(filteredGuests as Guest[])
      }
    }

    fetchFilteredGuests()
  }, [debouncedSearch, initialGuests])

  const handleSort = (column: keyof Guest) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedGuests = [...guests].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Guest",
      description: `Are you sure you want to delete ${guestName}? This action cannot be undone.`,
      action: async () => {
        try {
          // Optimistically remove the guest from the local state
          setGuests((prevGuests) => prevGuests.filter((guest) => guest.id !== guestId))

          // Delete the guest from the database
          const { error } = await supabase.from("guests").delete().eq("id", guestId)

          if (error) {
            console.error("Error deleting guest:", error)
            // If there's an error, revert the local state
            toast({
              title: "Error",
              description: "Failed to delete guest. Please try again.",
              variant: "destructive",
            })
            // Re-fetch guests to revert the local state
            await fetchGuests()
            throw error
          }

          toast({
            title: "Success",
            description: `${guestName} has been deleted.`,
            variant: "default",
          })
        } catch (error) {
          console.error("Error deleting guest:", error)
          // Handle error (e.g., show an error message)
        }
      },
    })
  }

  const handleDeleteMealChoices = async (guestId: string, guestName: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Meal Choices",
      description: `Are you sure you want to delete ALL meal choices for ${guestName}? This will remove their selections for the entire week and cannot be undone.`,
      action: async () => {
        try {
          setLoadingStates((prev) => ({ ...prev, deleteMeals: true }))

          // Delete all meal selections for this guest using guest_id
          const { error } = await supabase.from("meal_selections").delete().eq("guest_id", guestId)

          if (error) {
            console.error("Error deleting meal choices:", error)
            throw error
          }

          // Refresh meal selections data
          await fetchMealSelections()

          toast({
            title: "Success",
            description: `All meal choices for ${guestName} have been deleted.`,
            variant: "default",
          })
        } catch (error) {
          console.error("Error deleting meal choices:", error)
          toast({
            title: "Error",
            description: "Failed to delete meal choices. Please try again.",
            variant: "destructive",
          })
        } finally {
          setLoadingStates((prev) => ({ ...prev, deleteMeals: false }))
        }
      },
    })
  }

  const mealStatusCounts = (guestId: string) => {
    let count = 0
    if (mealSelections && mealSelections[guestId]) {
      Object.values(mealSelections[guestId]).forEach((value) => {
        if (value) {
          count++
        }
      })
    }

    let color = "bg-gray-100 text-gray-500"

    if (count === 0) {
      color = "bg-gray-100 text-gray-500"
    } else if (count < 3) {
      color = "bg-yellow-100 text-yellow-500"
    } else if (count < 6) {
      color = "bg-green-100 text-green-500"
    } else if (count === 6) {
      color = "bg-blue-100 text-blue-500"
    }

    return {
      count: count,
      status: count === 6 ? "Full" : count > 0 ? "Partial" : "None",
      color: color,
    }
  }

  return (
    <>
      <ConfirmDialog confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} />
      <div className="flex items-center justify-between">
        <Input
          type="search"
          placeholder="Search guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <Table>
          <TableCaption>A list of all guests.</TableCaption>
          <TableHeader>
            <TableRow>
              {[
                { id: "guest_name", label: "Guest Name", width: "w-48" },
                { id: "cabin_nr", label: "Cabin", width: "w-16" },
                { id: "booking_number", label: "Booking", width: "w-28" },
                { id: "table_nr", label: "Table", width: "w-16" },
                { id: "nationality", label: "Nation", width: "w-20" },
                { id: "meal_status", label: "Meal Status", width: "w-32" },
                { id: "meals", label: "Meals", width: "w-20" },
                { id: "actions", label: "Actions", width: "w-32" },
              ].map((column) => (
                <TableHead key={column.id} className={`text-left ${column.width}`}>
                  <div className="flex items-center">
                    <Button variant="ghost" onClick={() => handleSort(column.id as keyof Guest)}>
                      {column.label}
                      {sortColumn === column.id && (
                        <>
                          {sortDirection === "asc" ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGuests.map((guest) => {
              const mealStatus = mealStatusCounts(guest.id)
              return (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">{guest.guest_name}</TableCell>
                  <TableCell>{guest.cabin_nr}</TableCell>
                  <TableCell>{guest.booking_number}</TableCell>
                  <TableCell>{guest.table_nr}</TableCell>
                  <TableCell>{guest.nationality}</TableCell>
                  <td className="px-2 py-3 whitespace-nowrap text-sm">
                    <Badge className={`${mealStatus.color} text-xs px-1 py-0`}>
                      {mealStatus.status} ({mealStatus.count}/6)
                    </Badge>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1">
                      {mealSelections[guest.id] && Object.keys(mealSelections[guest.id]).length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteMealChoices(guest.id, guest.guest_name)}
                          disabled={loadingStates.deleteMeals}
                          title="Delete all meal choices for this guest"
                        >
                          <Utensils className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500 px-2">No meals</span>
                      )}
                    </div>
                  </td>
                  <TableCell className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteGuest(guest.id, guest.guest_name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {sortedGuests.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                  No guests found matching the current filters.
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
