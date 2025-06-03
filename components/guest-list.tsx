"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  ArrowDown,
  ArrowUp,
  Download,
  Search,
  X,
  Edit,
  Trash2,
  Home,
  Save,
  Plus,
  RefreshCw,
  Utensils,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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

      // Group meal selections by guest
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

      // Get unique table numbers
      const tables = Array.from(new Set(data?.map((g) => g.table_nr).filter(Boolean) || []))
      tables.sort((a, b) => a - b)
      setAvailableTables(tables)

      // Get unique nationalities
      const nationalities = Array.from(new Set(data?.map((g) => g.nationality).filter(Boolean) || []))
      nationalities.sort()
      setAvailableNationalities(nationalities)

      // Fetch meal selections
      await fetchMealSelections()
    } catch (error) {
      console.error("Error fetching guests:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, sortField, sortDirection, fetchMealSelections])

  const handleCabinChange = async (guestId, newCabinNumber) => {
    try {
      if (!newCabinNumber.trim()) {
        toast({
          title: "Error",
          description: "Cabin number cannot be empty.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("guest_manifest")
        .update({ cabin_nr: newCabinNumber.trim() })
        .eq("id", guestId)

      if (error) {
        console.error("Error updating cabin:", error)
        throw error
      }

      await fetchGuests()
      toast({
        title: "Success",
        description: "Cabin number updated successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating cabin:", error)
      toast({
        title: "Error",
        description: "Failed to update cabin number.",
        variant: "destructive",
      })
    }
  }

  // Apply filters and search
  useEffect(() => {
    if (!guests.length) return

    let result = [...guests]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (guest) =>
          (guest.guest_name && guest.guest_name.toLowerCase().includes(term)) ||
          (guest.cabin_nr && guest.cabin_nr.toLowerCase().includes(term)) ||
          (guest.booking_number && guest.booking_number.toLowerCase().includes(term)) ||
          (guest.nationality && guest.nationality.toLowerCase().includes(term)) ||
          (guest.table_nr && guest.table_nr.toString().includes(term)),
      )
    }

    // Apply type filter
    if (filterType === "assigned") {
      result = result.filter((guest) => guest.table_nr !== null)
    } else if (filterType === "unassigned") {
      result = result.filter((guest) => guest.table_nr === null)
    } else if (filterType === "table" && filterTable) {
      result = result.filter((guest) => guest.table_nr === Number.parseInt(filterTable))
    }

    // Apply nationality filter
    if (filterNationality && filterNationality !== "all") {
      result = result.filter((guest) => guest.nationality === filterNationality)
    }

    // Apply meal status filter
    if (filterMealStatus !== "all") {
      result = result.filter((guest) => {
        const guestMeals = mealSelections[guest.id]
        const hasMealSelections = guestMeals && Object.keys(guestMeals).length > 0

        if (filterMealStatus === "with-meals") {
          return hasMealSelections
        } else if (filterMealStatus === "without-meals") {
          return !hasMealSelections
        }
        return true
      })
    }

    // Calculate total pages
    setTotalPages(Math.max(1, Math.ceil(result.length / pageSize)))

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize
    const paginatedResult = result.slice(startIndex, startIndex + pageSize)

    setFilteredGuests(paginatedResult)

    // Reset to first page if filters reduce the page count
    if (currentPage > Math.ceil(result.length / pageSize)) {
      setCurrentPage(1)
    }
  }, [
    guests,
    searchTerm,
    filterType,
    filterTable,
    filterNationality,
    filterMealStatus,
    mealSelections,
    currentPage,
    pageSize,
  ])

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

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Scroll to top of table
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const handleBulkAssignment = async () => {
    if (!bulkTableNumber || selectedGuests.size === 0) {
      toast({
        title: "Error",
        description: "Please select guests and enter a table number",
        variant: "destructive",
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, bulkAssign: true }))
      const tableNumber = Number.parseInt(bulkTableNumber)
      const guestIds = Array.from(selectedGuests)

      for (const guestId of guestIds) {
        const { error } = await supabase.from("guest_manifest").update({ table_nr: tableNumber }).eq("id", guestId)

        if (error) {
          console.error("Error updating guest:", error)
          throw error
        }
      }

      // Clear selections and refresh
      setSelectedGuests(new Set())
      setBulkTableNumber("")
      await fetchGuests()

      toast({
        title: "Success",
        description: `Successfully assigned ${guestIds.length} guests to table ${tableNumber}`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error in bulk assignment:", error)
      toast({
        title: "Error",
        description: "Failed to assign guests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, bulkAssign: false }))
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    // Get all guests (not just the filtered/paginated ones)
    let dataToExport = [...guests]

    // Apply filters but not pagination
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      dataToExport = dataToExport.filter(
        (guest) =>
          (guest.guest_name && guest.guest_name.toLowerCase().includes(term)) ||
          (guest.cabin_nr && guest.cabin_nr.toLowerCase().includes(term)) ||
          (guest.booking_number && guest.booking_number.toLowerCase().includes(term)) ||
          (guest.nationality && guest.nationality.toLowerCase().includes(term)) ||
          (guest.table_nr && guest.table_nr.toString().includes(term)),
      )
    }

    if (filterType === "assigned") {
      dataToExport = dataToExport.filter((guest) => guest.table_nr !== null)
    } else if (filterType === "unassigned") {
      dataToExport = dataToExport.filter((guest) => guest.table_nr === null)
    } else if (filterType === "table" && filterTable) {
      dataToExport = dataToExport.filter((guest) => guest.table_nr === Number.parseInt(filterTable))
    }

    if (filterNationality && filterNationality !== "all") {
      dataToExport = dataToExport.filter((guest) => guest.nationality === filterNationality)
    }

    // Create CSV content with meal data
    const headers = ["Guest Name", "Cabin", "Booking Number", "Table", "Nationality", "Meal Selections", "Meal Status"]
    const csvContent = [
      headers.join(","),
      ...dataToExport.map((guest) => {
        const guestMeals = mealSelections[guest.id]
        const mealCount = guestMeals ? Object.keys(guestMeals).length : 0
        const mealStatus = mealCount > 0 ? `${mealCount} days selected` : "No meals selected"

        return [
          `"${guest.guest_name || ""}"`,
          `"${guest.cabin_nr || ""}"`,
          `"${guest.booking_number || ""}"`,
          guest.table_nr || "",
          `"${guest.nationality || ""}"`,
          mealCount,
          `"${mealStatus}"`,
        ].join(",")
      }),
    ].join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `guest_list_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getMealSelectionStatus = (guestId) => {
    const guestMeals = mealSelections[guestId]
    if (!guestMeals) return { count: 0, status: "No meals selected", color: "bg-red-100 text-red-800" }

    const mealCount = Object.keys(guestMeals).length
    if (mealCount >= 5) return { count: mealCount, status: "Complete", color: "bg-green-100 text-green-800" }
    if (mealCount >= 3) return { count: mealCount, status: "Partial", color: "bg-yellow-100 text-yellow-800" }
    return { count: mealCount, status: "Started", color: "bg-blue-100 text-blue-800" }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setFilterType("all")
    setFilterTable("")
    setFilterNationality("")
    setFilterMealStatus("all")
    setCurrentPage(1)
  }

  const startEditGuest = (guest) => {
    setEditingGuestId(guest.id)
    setEditedGuestData({
      guest_name: guest.guest_name,
      cabin_nr: guest.cabin_nr,
      booking_number: guest.booking_number,
      table_nr: guest.table_nr,
      nationality: guest.nationality,
    })
  }

  const cancelEdit = () => {
    setEditingGuestId(null)
    setEditedGuestData({})
  }

  const handleInputChange = (e, field) => {
    setEditedGuestData({
      ...editedGuestData,
      [field]: e.target.value,
    })
  }

  const saveGuestChanges = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from("guest_manifest")
        .update(editedGuestData)
        .eq("id", editingGuestId)
        .select()

      if (error) {
        console.error("Error updating guest:", error)
        throw error
      }

      setGuests((prevGuests) =>
        prevGuests.map((guest) => (guest.id === editingGuestId ? { ...guest, ...editedGuestData } : guest)),
      )

      setEditingGuestId(null)
      setEditedGuestData({})
      await fetchGuests()

      toast({
        title: "Success",
        description: "Guest updated successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating guest:", error)
      toast({
        title: "Error",
        description: "Failed to update guest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGuest = async (guestId) => {
    setConfirmDialog({
      open: true,
      title: "Delete Guest",
      description: "Are you sure you want to delete this guest? This action cannot be undone.",
      action: async () => {
        try {
          const { error } = await supabase.from("guest_manifest").delete().eq("id", guestId)

          if (error) {
            console.error("Error deleting guest:", error)
            throw error
          }

          setGuests((prevGuests) => prevGuests.filter((guest) => guest.id !== guestId))
          await fetchGuests()

          toast({
            title: "Success",
            description: "Guest deleted successfully.",
            variant: "default",
          })
        } catch (error) {
          console.error("Error deleting guest:", error)
          toast({
            title: "Error",
            description: "Failed to delete guest. Please try again.",
            variant: "destructive",
          })
        }
      },
    })
  }

  // FEATURE 1: Add Guest Button Functionality
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setFormState({
      ...formState,
      [field]: e.target.value,
    })

    // Clear error when user types
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: "",
      })
    }
  }

  const validateGuestForm = () => {
    const errors: Record<string, string> = {}

    if (!formState.newGuestName.trim()) {
      errors.newGuestName = "Guest name is required"
    }

    if (!formState.newCabinNumber.trim()) {
      errors.newCabinNumber = "Cabin number is required"
    }

    return errors
  }

  const handleAddGuest = async () => {
    const errors = validateGuestForm()

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, addGuest: true }))

      // Insert new guest into Supabase
      const { data, error } = await supabase
        .from("guest_manifest")
        .insert([
          {
            guest_name: formState.newGuestName,
            cabin_nr: formState.newCabinNumber,
            nationality: formState.newNationality,
            booking_number: formState.newBookingNumber,
            cruise_id: formState.newCruiseId,
          },
        ])
        .select()

      if (error) throw error

      // Clear form
      setFormState({
        newGuestName: "",
        newCabinNumber: "",
        newNationality: "",
        newBookingNumber: "",
        newCruiseId: "",
      })

      // Refresh guest list
      await fetchGuests()

      toast({
        title: "Success",
        description: "Guest added successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error("Error adding guest:", error)
      toast({
        title: "Error",
        description: "Failed to add guest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, addGuest: false }))
    }
  }

  // FEATURE 2: Delete Meal Choices
  const handleDeleteMealChoices = async (guestId: string, guestName: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, deleteMeals: true }))

      // Delete all meal choices for this guest
      const { error } = await supabase.from("meal_selections").delete().eq("guest_id", guestId)

      if (error) throw error

      // Refresh meal selections data
      await fetchMealSelections()

      toast({
        title: "Success",
        description: `Meal choices for ${guestName} have been deleted.`,
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
  }

  const confirmDeleteMealChoices = (guestId: string, guestName: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Meal Choices",
      description: `Are you sure you want to delete all meal choices for ${guestName}? This action cannot be undone.`,
      action: () => {
        handleDeleteMealChoices(guestId, guestName)
      },
    })
  }

  // FEATURE 3: Implement Refresh
  const handleRefresh = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, refresh: true }))

      // Refresh all data
      await Promise.all([fetchGuests(), fetchMealSelections()])

      toast({
        title: "Success",
        description: "Data refreshed successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, refresh: false }))
    }
  }

  // FEATURE 4: Export Cabin Report
  const exportCabinReport = () => {
    try {
      setLoadingStates((prev) => ({ ...prev, export: true }))

      // Group guests by cabin
      const cabinGroups: Record<string, any[]> = {}
      guests.forEach((guest) => {
        const cabinNr = guest.cabin_nr || "Unknown"
        if (!cabinGroups[cabinNr]) {
          cabinGroups[cabinNr] = []
        }
        cabinGroups[cabinNr].push(guest)
      })

      // Prepare CSV content
      const headers = ["Cabin", "Guest Name", "Table", "Nationality", "Booking Number", "Meal Status", "Days Selected"]
      const rows: string[][] = []

      // Add data rows
      Object.entries(cabinGroups).forEach(([cabin, cabinGuests]) => {
        cabinGuests.forEach((guest) => {
          const guestMeals = mealSelections[guest.id] || {}
          const daysSelected = Object.keys(guestMeals).length
          const mealStatus = daysSelected > 0 ? (daysSelected >= 6 ? "Complete" : "Partial") : "None"

          rows.push([
            cabin,
            guest.guest_name || "",
            guest.table_nr?.toString() || "Unassigned",
            guest.nationality || "",
            guest.booking_number || "",
            mealStatus,
            daysSelected.toString(),
          ])
        })
      })

      // Convert to CSV
      const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const timestamp = new Date().toISOString().split("T")[0]
      link.setAttribute("href", url)
      link.setAttribute("download", `cabin_report_${timestamp}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: "Cabin report exported successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error exporting cabin report:", error)
      toast({
        title: "Error",
        description: "Failed to export cabin report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, export: false }))
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
      {/* Quick Add Guest Form - FEATURE 1 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Add Guest
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Input
              placeholder="Guest Name"
              value={formState.newGuestName}
              onChange={(e) => handleFormChange(e, "newGuestName")}
              className={formErrors.newGuestName ? "border-red-500" : ""}
            />
            {formErrors.newGuestName && <p className="text-xs text-red-500 mt-1">{formErrors.newGuestName}</p>}
          </div>
          <div>
            <Input
              placeholder="Cabin Number"
              value={formState.newCabinNumber}
              onChange={(e) => handleFormChange(e, "newCabinNumber")}
              className={formErrors.newCabinNumber ? "border-red-500" : ""}
            />
            {formErrors.newCabinNumber && <p className="text-xs text-red-500 mt-1">{formErrors.newCabinNumber}</p>}
          </div>
          <Input
            placeholder="Nationality"
            value={formState.newNationality}
            onChange={(e) => handleFormChange(e, "newNationality")}
          />
          <Input
            placeholder="Booking Number"
            value={formState.newBookingNumber}
            onChange={(e) => handleFormChange(e, "newBookingNumber")}
          />
          <Input
            placeholder="Cruise ID"
            value={formState.newCruiseId}
            onChange={(e) => handleFormChange(e, "newCruiseId")}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleAddGuest} disabled={loadingStates.addGuest} className="flex items-center gap-2">
            {loadingStates.addGuest ? (
              <>
                <LoadingSpinner size={16} />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Guest
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Guest List</h2>
        <div className="flex items-center gap-2">
          {/* FEATURE 3: Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loadingStates.refresh}
            className="flex items-center gap-1"
          >
            {loadingStates.refresh ? (
              <>
                <LoadingSpinner size={14} />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>

          {/* FEATURE 4: Export Cabin Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCabinReport}
            disabled={loadingStates.export}
            className="flex items-center gap-1"
          >
            {loadingStates.export ? (
              <>
                <LoadingSpinner size={14} />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Cabin Report
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={exportToCSV} className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            Export Guest List
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search guests..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page on search
            }}
            className="pl-8"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="w-40">
            <Select
              value={filterType}
              onValueChange={(value) => {
                setFilterType(value as FilterType)
                setCurrentPage(1) // Reset to first page on filter change
                if (value !== "table") setFilterTable("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guests</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="table">By Table</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "table" && (
            <div className="w-32">
              <Select
                value={filterTable}
                onValueChange={(value) => {
                  setFilterTable(value)
                  setCurrentPage(1) // Reset to first page on filter change
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Table" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table.toString()}>
                      Table {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-40">
            <Select
              value={filterNationality}
              onValueChange={(value) => {
                setFilterNationality(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nationality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nationalities</SelectItem>
                {availableNationalities.map((nationality) => (
                  <SelectItem key={nationality} value={nationality}>
                    {nationality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <Select
              value={filterMealStatus}
              onValueChange={(value) => {
                setFilterMealStatus(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Meal Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Meal Status</SelectItem>
                <SelectItem value="with-meals">With Meals</SelectItem>
                <SelectItem value="without-meals">Without Meals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || filterType !== "all" || filterTable || filterNationality || filterMealStatus !== "all") && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="flex items-center gap-1">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {selectedGuests.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">{selectedGuests.size} guest(s) selected</span>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Table number"
                value={bulkTableNumber}
                onChange={(e) => setBulkTableNumber(e.target.value)}
                className="w-32 h-8"
              />
              <Button size="sm" onClick={handleBulkAssignment} disabled={loadingStates.bulkAssign}>
                {loadingStates.bulkAssign ? (
                  <>
                    <LoadingSpinner size={14} className="mr-1" />
                    Assigning...
                  </>
                ) : (
                  "Assign to Table"
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedGuests(new Set())}>
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner size={24} text="Loading guest list..." />
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg">
            <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedGuests.size === filteredGuests.length && filteredGuests.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGuests(new Set(filteredGuests.map((g) => g.id)))
                        } else {
                          setSelectedGuests(new Set())
                        }
                      }}
                    />
                  </th>
                  {[
                    { id: "guest_name", label: "Guest Name" },
                    { id: "cabin_nr", label: "Cabin" },
                    { id: "booking_number", label: "Booking" },
                    { id: "table_nr", label: "Table" },
                    { id: "nationality", label: "Nationality" },
                    { id: "meal_status", label: "Meal Status" },
                    { id: "actions", label: "Actions" },
                  ].map((column) => (
                    <th
                      key={column.id}
                      onClick={() =>
                        column.id !== "meal_status" && column.id !== "actions" && handleSort(column.id as SortField)
                      }
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.id !== "meal_status" && column.id !== "actions" ? "cursor-pointer hover:bg-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center">
                        {column.label}
                        {sortField === column.id && column.id !== "meal_status" && column.id !== "actions" && (
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
                {filteredGuests.length > 0 ? (
                  filteredGuests.map((guest) => {
                    const isEditing = editingGuestId === guest.id
                    const mealStatus = getMealSelectionStatus(guest.id)
                    return (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Checkbox
                            checked={selectedGuests.has(guest.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedGuests)
                              if (checked) {
                                newSelected.add(guest.id)
                              } else {
                                newSelected.delete(guest.id)
                              }
                              setSelectedGuests(newSelected)
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.guest_name || ""}
                              onChange={(e) => handleInputChange(e, "guest_name")}
                            />
                          ) : (
                            guest.guest_name || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.cabin_nr || ""}
                              onChange={(e) => handleInputChange(e, "cabin_nr")}
                            />
                          ) : (
                            guest.cabin_nr || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.booking_number || ""}
                              onChange={(e) => handleInputChange(e, "booking_number")}
                            />
                          ) : (
                            guest.booking_number || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.table_nr || ""}
                              onChange={(e) => handleInputChange(e, "table_nr")}
                            />
                          ) : guest.table_nr ? (
                            <span className="font-medium">{guest.table_nr}</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <Input
                              value={editedGuestData.nationality || ""}
                              onChange={(e) => handleInputChange(e, "nationality")}
                            />
                          ) : (
                            guest.nationality || "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Badge className={mealStatus.color}>
                            {mealStatus.status} ({mealStatus.count}/6)
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="col-span-1 flex gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-green-600"
                                  onClick={saveGuestChanges}
                                  disabled={saving}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEdit}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEditGuest(guest)}
                                  title="Edit guest details"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                  onClick={() => {
                                    const newCabin = prompt(`Change cabin for ${guest.guest_name}:`, guest.cabin_nr)
                                    if (newCabin && newCabin !== guest.cabin_nr) {
                                      handleCabinChange(guest.id, newCabin)
                                    }
                                  }}
                                  title="Change cabin number"
                                >
                                  <Home className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteGuest(guest.id)}
                                  title="Delete guest"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                {mealSelections[guest.id] && Object.keys(mealSelections[guest.id]).length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => confirmDeleteMealChoices(guest.id, guest.guest_name)}
                                    disabled={loadingStates.deleteMeals}
                                    title="Delete all meal choices for this guest"
                                  >
                                    <Utensils className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      No guests found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {filteredGuests.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, guests.length)} of {guests.length} guests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = currentPage
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="mx-1">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number.parseInt(value))
                  setCurrentPage(1) // Reset to first page when changing page size
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* FEATURE 5: Confirmation Dialog */}
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
