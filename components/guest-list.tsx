"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Edit, Trash2, Utensils } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type SortDirection = "asc" | "desc"
type SortField = "guest_name" | "cabin_nr" | "booking_number" | "table_nr" | "nationality"
type FilterType = "all" | "assigned" | "unassigned" | "table"

export function GuestList() {
  const { toast } = useToast()
  const [guests, setGuests] = useState<any[]>([])
  const [filteredGuests, setFilteredGuests] = useState<any[]>([])
  const [sortField, setSortField] = useState<SortField>("guest_name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [filterTable, setFilterTable] = useState<string>("")
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [availableTables, setAvailableTables] = useState<number[]>([])
  const tableRef = useRef<HTMLTableElement>(null)
  const supabase = createClientComponentClient()

  const [filterMealStatus, setFilterMealStatus] = useState("all")
  const [filterNationality, setFilterNationality] = useState("")
  const [selectedGuests, setSelectedGuests] = useState(new Set())
  const [bulkTableNumber, setBulkTableNumber] = useState("")
  const [availableNationalities, setAvailableNationalities] = useState([])
  const [mealSelections, setMealSelections] = useState({})

  const [editingGuestId, setEditingGuestId] = useState(null)
  const [editedGuestData, setEditedGuestData] = useState({})
  const [saving, setSaving] = useState(false)

  // New state for the 5 features
  const [formState, setFormState] = useState({
    newGuestName: "",
    newCabinNumber: "",
    newNationality: "",
    newBookingNumber: "",
    newCruiseId: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loadingStates, setLoadingStates] = useState({
    addGuest: false,
    deleteMeals: false,
    refresh: false,
    export: false,
    bulkAssign: false,
  })
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    action: () => {},
  })

  const fetchMealSelections = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("meal_selections").select("guest_id, day, meal_name, meal_category")

      if (error) {
        console.error("Error fetching meal selections:", error)
        return
      }

      const guestMealData = {}
      if (data) {
        data.forEach((selection) => {
          if (!guestMealData[selection.guest_id]) {
            guestMealData[selection.guest_id] = {}
          }
          guestMealData[selection.guest_id][selection.day] = {
            meal_name: selection.meal_name,
            meal_category: selection.meal_category,
          }
        })
      }

      setMealSelections(guestMealData)
    } catch (error) {
      console.error("Error fetching meal selections:", error)
    }
  }, [supabase])

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

      const tables = Array.from(new Set(data?.map((g) => g.table_nr).filter(Boolean) || []))
      tables.sort((a, b) => a - b)
      setAvailableTables(tables)

      const nationalities = Array.from(new Set(data?.map((g) => g.nationality).filter(Boolean) || []))
      nationalities.sort()
      setAvailableNationalities(nationalities)

      await fetchMealSelections()
    } catch (error) {
      console.error("Error fetching guests:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, sortField, sortDirection, fetchMealSelections])

  const handleDeleteMealChoices = async (guestId: string, guestName: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Meal Choices",
      description: `Are you sure you want to delete ALL meal choices for ${guestName}? This will remove their selections for the entire week and cannot be undone.`,
      action: async () => {
        try {
          setLoadingStates((prev) => ({ ...prev, deleteMeals: true }))

          const { error } = await supabase.from("meal_selections").delete().eq("guest_id", guestId)

          if (error) {
            console.error("Error deleting meal choices:", error)
            throw error
          }

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

  const getMealSelectionStatus = (guestId) => {
    const guestMeals = mealSelections[guestId]
    if (!guestMeals) return { count: 0, status: "No meals selected", color: "bg-red-100 text-red-800" }

    const mealCount = Object.keys(guestMeals).length
    if (mealCount >= 5) return { count: mealCount, status: "Complete", color: "bg-green-100 text-green-800" }
    if (mealCount >= 3) return { count: mealCount, status: "Partial", color: "bg-yellow-100 text-yellow-800" }
    return { count: mealCount, status: "Started", color: "bg-blue-100 text-blue-800" }
  }

  useEffect(() => {
    fetchGuests()
  }, [fetchGuests])

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Guest List</h2>
      </div>

      {loading ? (
        <LoadingSpinner size={24} text="Loading guest list..." />
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg">
            <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    <th
                      key={column.id}
                      className={`px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width}`}
                    >
                      <div className="flex items-center">{column.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests.length > 0 ? (
                  guests.map((guest) => {
                    const mealStatus = getMealSelectionStatus(guest.id)
                    return (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 whitespace-nowrap text-sm">
                          <div className="truncate max-w-48" title={guest.guest_name}>
                            {guest.guest_name || "Unknown"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm">{guest.cabin_nr || "Unknown"}</td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm">
                          <div className="truncate max-w-28" title={guest.booking_number}>
                            {guest.booking_number || "Unknown"}
                          </div>
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm">
                          {guest.table_nr ? (
                            <span className="font-medium">{guest.table_nr}</span>
                          ) : (
                            <span className="px-1 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap text-sm">
                          <div className="truncate max-w-20" title={guest.nationality}>
                            {guest.nationality || "Unknown"}
                          </div>
                        </td>
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
                        <td className="px-2 py-3 whitespace-nowrap text-sm">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Edit guest details">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              title="Delete guest"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      No guests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.action()
                setConfirmDialog({ ...confirmDialog, open: false })
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
