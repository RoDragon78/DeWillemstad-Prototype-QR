"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Printer, Calendar, Users, ChefHat } from "lucide-react"

// Updated table positions with larger sizes to accommodate more information
const TABLE_POSITIONS = {
  // Row 1 - Top row (increased sizes)
  1: { x: 40, y: 30, width: 120, height: 100, shape: "rect" },
  9: { x: 190, y: 30, width: 100, height: 100, shape: "circle" },
  10: { x: 320, y: 30, width: 100, height: 100, shape: "circle" },
  20: { x: 450, y: 30, width: 120, height: 100, shape: "rect" },

  // Row 2 (increased sizes)
  2: { x: 40, y: 150, width: 140, height: 80, shape: "rect" },
  8: { x: 190, y: 150, width: 100, height: 100, shape: "circle" },
  11: { x: 320, y: 150, width: 100, height: 100, shape: "circle" },
  19: { x: 450, y: 150, width: 140, height: 80, shape: "rect" },

  // Row 3 (increased sizes)
  3: { x: 40, y: 270, width: 140, height: 80, shape: "rect" },
  7: { x: 190, y: 270, width: 120, height: 100, shape: "rect" },
  12: { x: 320, y: 270, width: 120, height: 100, shape: "rect" },
  18: { x: 450, y: 270, width: 140, height: 80, shape: "rect" },

  // Row 4 (increased sizes)
  4: { x: 40, y: 390, width: 120, height: 100, shape: "rect" },
  6: { x: 190, y: 390, width: 140, height: 80, shape: "rect" },
  13: { x: 340, y: 390, width: 100, height: 100, shape: "circle" }, // Changed from x: 320 to x: 340
  17: { x: 450, y: 390, width: 140, height: 80, shape: "rect" },

  // Row 5 - Bottom row (increased sizes and repositioned)
  14: { x: 170, y: 510, width: 140, height: 80, shape: "rect" },
  15: { x: 320, y: 510, width: 140, height: 80, shape: "rect" },
  16: { x: 470, y: 510, width: 120, height: 100, shape: "rect" },
}

// Day mapping
const DAY_MAPPING = {
  sunday: 2,
  monday: 3,
  tuesday: 4,
  wednesday: 5,
  thursday: 6,
  friday: 7,
}

const DAY_NAMES = {
  2: "Sunday",
  3: "Monday",
  4: "Tuesday",
  5: "Wednesday",
  6: "Thursday",
  7: "Friday",
}

export function DailyFloorPlan({ tableCapacities, guests, onTableUpdate }) {
  const [selectedDay, setSelectedDay] = useState("sunday")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTable, setFilterTable] = useState("")
  const [filterCabin, setFilterCabin] = useState("")
  const [sortBy, setSortBy] = useState("table")
  const [mealData, setMealData] = useState([])
  const [kitchenSummary, setKitchenSummary] = useState({})
  const [tableData, setTableData] = useState({})
  const supabase = createClientComponentClient()

  // Simplified data fetching that uses meal_category directly
  const fetchMealData = useCallback(async () => {
    try {
      const dayNumber = DAY_MAPPING[selectedDay]
      console.log(`Fetching meal data for day ${dayNumber}`)

      // Fetch meal selections for this day with meal_category
      const { data: selections, error: selectionsError } = await supabase
        .from("meal_selections")
        .select("guest_id, meal_id, meal_name, meal_category, day")
        .eq("day", dayNumber)

      if (selectionsError) {
        console.error("Error fetching meal selections:", selectionsError)
        return
      }

      console.log(`Found ${selections?.length || 0} meal selections for day ${dayNumber}`)

      // Process meal selections by guest
      const guestMealSelections = {}
      if (selections) {
        selections.forEach((selection) => {
          // Normalize category to lowercase for consistency
          const category = selection.meal_category?.toLowerCase() || "noSelection"
          guestMealSelections[selection.guest_id] = {
            meal_id: selection.meal_id,
            meal_name: selection.meal_name,
            category: category,
          }
        })
      }

      // Process table data
      const tables = {}
      const summary = {
        totalGuests: guests.length,
        meat: 0,
        fish: 0,
        vegetarian: 0,
        other: 0,
        noSelection: 0,
      }

      // Group guests by table
      guests.forEach((guest) => {
        if (!guest.table_nr) return

        if (!tables[guest.table_nr]) {
          tables[guest.table_nr] = {
            cabins: {},
            mealCounts: { meat: 0, fish: 0, vegetarian: 0, other: 0, noSelection: 0 },
            totalGuests: 0,
          }
        }

        // Add cabin to table
        const cabinNr = guest.cabin_nr
        if (!tables[guest.table_nr].cabins[cabinNr]) {
          tables[guest.table_nr].cabins[cabinNr] = {
            guests: [],
            mealCounts: { meat: 0, fish: 0, vegetarian: 0, other: 0, noSelection: 0 },
          }
        }

        // Get meal selection for this guest
        const mealSelection = guestMealSelections[guest.id]

        // Default to noSelection if no meal selection found
        const category = mealSelection ? mealSelection.category : "noSelection"

        // Update counts
        tables[guest.table_nr].cabins[cabinNr].guests.push({
          id: guest.id,
          name: guest.guest_name,
          mealSelection,
        })

        // Update table meal counts
        tables[guest.table_nr].mealCounts[category]++
        tables[guest.table_nr].totalGuests++

        // Update overall summary
        summary[category]++
      })

      console.log("Kitchen Summary:", summary)
      console.log("Table Data:", tables)

      setTableData(tables)
      setKitchenSummary(summary)

      // Create enhanced meal data for guest list
      const enhancedMealData = guests.map((guest) => {
        const mealSelection = guestMealSelections[guest.id]
        return {
          ...guest,
          meal_day: selectedDay,
          meal_selection: mealSelection || null,
          meal_category: mealSelection ? mealSelection.category : null,
        }
      })

      setMealData(enhancedMealData)
    } catch (error) {
      console.error("Error fetching meal data:", error)
    }
  }, [selectedDay, guests, supabase])

  // Set up real-time subscriptions
  useEffect(() => {
    fetchMealData()

    // Subscribe to meal_selections changes
    const mealSubscription = supabase
      .channel("meal_selections_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meal_selections",
        },
        (payload) => {
          console.log("Meal selection change received:", payload)
          fetchMealData()
        },
      )
      .subscribe()

    // Subscribe to guest_manifest changes
    const guestSubscription = supabase
      .channel("guest_manifest_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_manifest",
        },
        (payload) => {
          console.log("Guest manifest change received:", payload)
          fetchMealData()
        },
      )
      .subscribe()

    return () => {
      mealSubscription.unsubscribe()
      guestSubscription.unsubscribe()
    }
  }, [fetchMealData])

  // Get table color based on meal completion status
  const getTableMealColor = (tableNumber) => {
    const tableInfo = tableData[tableNumber]
    if (!tableInfo || tableInfo.totalGuests === 0) return "rgb(239, 246, 255)" // Empty

    const { meat, fish, vegetarian, other, noSelection } = tableInfo.mealCounts
    const completedSelections = meat + fish + vegetarian + other
    const completionRate = completedSelections / tableInfo.totalGuests

    if (completionRate === 1) return "rgb(34, 197, 94)" // Green - all complete
    if (completionRate >= 0.5) return "rgb(251, 191, 36)" // Yellow - partial
    if (completionRate > 0) return "rgb(249, 115, 22)" // Orange - some selections
    return "rgb(239, 68, 68)" // Red - no selections
  }

  // Enhanced table rendering with cabin numbers and meal counts
  const renderMealTables = () => {
    const tables = []
    const tableNumbers = Object.keys(TABLE_POSITIONS)

    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const position = TABLE_POSITIONS[tableNumber]
      const tableNum = Number.parseInt(tableNumber, 10)
      const tableInfo = tableData[tableNum] || {
        cabins: {},
        mealCounts: { meat: 0, fish: 0, vegetarian: 0, other: 0, noSelection: 0 },
        totalGuests: 0,
      }
      const cabins = Object.keys(tableInfo.cabins)

      // Render table shape
      if (position.shape === "rect") {
        tables.push(
          <rect
            key={tableNumber}
            x={position.x}
            y={position.y}
            width={position.width}
            height={position.height}
            rx={10}
            ry={10}
            fill={getTableMealColor(tableNum)}
            stroke="rgb(75, 85, 99)"
            strokeWidth={2}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />,
        )
      } else {
        tables.push(
          <circle
            key={tableNumber}
            cx={position.x + position.width / 2}
            cy={position.y + position.height / 2}
            r={position.width / 2}
            fill={getTableMealColor(tableNum)}
            stroke="rgb(75, 85, 99)"
            strokeWidth={2}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />,
        )
      }

      // Add table number (simplified - just the number)
      tables.push(
        <text
          key={`table-${tableNumber}`}
          x={position.x + position.width / 2}
          y={position.y + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontWeight="bold"
          fontSize="16"
          className="select-none"
        >
          {tableNumber}
        </text>,
      )

      if (tableInfo.totalGuests > 0) {
        let yOffset = 35

        // Show cabin numbers (limit to first 4 cabins to avoid overcrowding)
        const cabinNumbers = cabins.slice(0, 4).join("/")
        if (cabinNumbers) {
          tables.push(
            <text
              key={`cabins-${tableNumber}`}
              x={position.x + position.width / 2}
              y={position.y + yOffset}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="11"
              className="select-none"
            >
              {cabinNumbers}
            </text>,
          )
          yOffset += 14
        }

        // If more than 4 cabins, show count
        if (cabins.length > 4) {
          tables.push(
            <text
              key={`more-${tableNumber}`}
              x={position.x + position.width / 2}
              y={position.y + yOffset}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="10"
              className="select-none"
            >
              +{cabins.length - 4} more
            </text>,
          )
          yOffset += 14
        }

        // Show meal summary with larger font and higher position
        const { meat, fish, vegetarian } = tableInfo.mealCounts
        const mealSummaryParts = []
        if (meat > 0) mealSummaryParts.push(`${meat}M`)
        if (fish > 0) mealSummaryParts.push(`${fish}F`)
        if (vegetarian > 0) mealSummaryParts.push(`${vegetarian}V`)

        const mealSummaryText = mealSummaryParts.length > 0 ? mealSummaryParts.join(" ") : "No meals"

        tables.push(
          <text
            key={`meal-summary-${tableNumber}`}
            x={position.x + position.width / 2}
            y={position.y + position.height - 25} // Moved higher (was -8)
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="14" // Increased from 10
            fontWeight="bold" // Changed from medium to bold
            className="select-none"
          >
            {mealSummaryText}
          </text>,
        )
      } else {
        // Empty table
        tables.push(
          <text
            key={`empty-${tableNumber}`}
            x={position.x + position.width / 2}
            y={position.y + position.height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="11"
            className="select-none"
          >
            Empty
          </text>,
        )
      }
    }

    return tables
  }

  // Filter and sort guest data
  const getFilteredAndSortedGuests = () => {
    const filtered = mealData.filter((guest) => {
      const matchesSearch =
        !searchQuery ||
        guest.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.cabin_nr?.toString().includes(searchQuery)

      const matchesTable = !filterTable || guest.table_nr?.toString() === filterTable
      const matchesCabin = !filterCabin || guest.cabin_nr?.toString().includes(filterCabin)

      return matchesSearch && matchesTable && matchesCabin
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "table":
          return (a.table_nr || 0) - (b.table_nr || 0)
        case "cabin":
          return (a.cabin_nr || "").localeCompare(b.cabin_nr || "")
        case "meal":
          // Sort by meal completion status
          const aComplete = a.meal_selection ? 1 : 0
          const bComplete = b.meal_selection ? 1 : 0
          return bComplete - aComplete
        default:
          return 0
      }
    })

    return filtered
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Day Selection Tabs */}
      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sunday">Sunday</TabsTrigger>
          <TabsTrigger value="monday">Monday</TabsTrigger>
          <TabsTrigger value="tuesday">Tuesday</TabsTrigger>
          <TabsTrigger value="wednesday">Wednesday</TabsTrigger>
          <TabsTrigger value="thursday">Thursday</TabsTrigger>
          <TabsTrigger value="friday">Friday</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedDay} className="space-y-6">
          {/* Enhanced Kitchen Prep Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Kitchen Prep Summary - {DAY_NAMES[DAY_MAPPING[selectedDay]]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Guests</p>
                  <p className="text-2xl font-bold">{kitchenSummary.totalGuests || 0}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Meat Dishes</p>
                  <p className="text-2xl font-bold">{kitchenSummary.meat || 0}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Fish Dishes</p>
                  <p className="text-2xl font-bold">{kitchenSummary.fish || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Vegetarian</p>
                  <p className="text-2xl font-bold">{kitchenSummary.vegetarian || 0}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">No Selection</p>
                  <p className="text-2xl font-bold">{kitchenSummary.noSelection || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Floor Plan */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Floor Plan - {DAY_NAMES[DAY_MAPPING[selectedDay]]} Meal Selections
              </CardTitle>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden mb-4">
                <svg width="100%" height="620" viewBox="0 0 650 620" className="bg-white">
                  <rect x="0" y="0" width="650" height="620" fill="white" />
                  {renderMealTables()}

                  {/* Simplified Legend */}
                  <g transform="translate(20, 520)">
                    <text x="0" y="0" fontWeight="medium" fontSize="12" fill="rgb(75, 85, 99)">
                      Meal Selection Status:
                    </text>
                    <circle cx="8" cy="18" r="5" fill="rgb(34, 197, 94)" />
                    <text x="18" y="22" fontSize="11" fill="rgb(75, 85, 99)">
                      All meals selected
                    </text>

                    <circle cx="8" cy="35" r="5" fill="rgb(251, 191, 36)" />
                    <text x="18" y="39" fontSize="11" fill="rgb(75, 85, 99)">
                      Most meals selected
                    </text>

                    <circle cx="8" cy="52" r="5" fill="rgb(249, 115, 22)" />
                    <text x="18" y="56" fontSize="11" fill="rgb(75, 85, 99)">
                      Some meals selected
                    </text>

                    <circle cx="8" cy="69" r="5" fill="rgb(239, 68, 68)" />
                    <text x="18" y="73" fontSize="11" fill="rgb(75, 85, 99)">
                      No meals selected
                    </text>
                  </g>
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Guest List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest List with Meal Categories - {DAY_NAMES[DAY_MAPPING[selectedDay]]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search guests or cabins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Input
                    placeholder="Filter by table..."
                    value={filterTable}
                    onChange={(e) => setFilterTable(e.target.value)}
                    className="w-32"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Filter by cabin..."
                    value={filterCabin}
                    onChange={(e) => setFilterCabin(e.target.value)}
                    className="w-32"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="table">Sort by Table</option>
                  <option value="cabin">Sort by Cabin</option>
                  <option value="meal">Sort by Meal Status</option>
                </select>
              </div>

              {/* Enhanced Guest List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Table</th>
                      <th className="px-3 py-2 text-left">Cabin</th>
                      <th className="px-3 py-2 text-left">Guest Name</th>
                      <th className="px-3 py-2 text-left">Meal Category</th>
                      <th className="px-3 py-2 text-left">Meal Selection</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {getFilteredAndSortedGuests().map((guest) => {
                      const hasSelection = guest.meal_selection !== null
                      const mealCategory = guest.meal_category || "noSelection"

                      return (
                        <tr key={guest.id} className={hasSelection ? "bg-green-50" : "bg-red-50"}>
                          <td className="px-3 py-2">{guest.table_nr || "Unassigned"}</td>
                          <td className="px-3 py-2">{guest.cabin_nr}</td>
                          <td className="px-3 py-2">{guest.guest_name}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={mealCategory === "noSelection" ? "destructive" : "default"}
                              className={
                                mealCategory === "meat"
                                  ? "bg-red-100 text-red-800"
                                  : mealCategory === "fish"
                                    ? "bg-blue-100 text-blue-800"
                                    : mealCategory === "vegetarian"
                                      ? "bg-green-100 text-green-800"
                                      : ""
                              }
                            >
                              {mealCategory === "meat"
                                ? "Meat"
                                : mealCategory === "fish"
                                  ? "Fish"
                                  : mealCategory === "vegetarian"
                                    ? "Vegetarian"
                                    : mealCategory === "other"
                                      ? "Other"
                                      : "No Selection"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {guest.meal_selection ? guest.meal_selection.meal_name : "Not selected"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={hasSelection ? "default" : "destructive"}>
                              {hasSelection ? "Complete" : "Incomplete"}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
