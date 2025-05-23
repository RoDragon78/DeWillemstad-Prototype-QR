"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Printer, Calendar, Users, ChefHat } from "lucide-react"

// Table positions (same as FloorPlan)
const TABLE_POSITIONS = {
  1: { x: 50, y: 50, width: 100, height: 100, shape: "rect" },
  2: { x: 50, y: 170, width: 140, height: 70, shape: "rect" },
  3: { x: 50, y: 260, width: 140, height: 70, shape: "rect" },
  4: { x: 50, y: 350, width: 100, height: 100, shape: "rect" },
  6: { x: 250, y: 400, width: 140, height: 70, shape: "rect" },
  7: { x: 250, y: 220, width: 100, height: 100, shape: "rect" },
  8: { x: 250, y: 120, width: 90, height: 90, shape: "circle" },
  9: { x: 250, y: 20, width: 90, height: 90, shape: "circle" },
  10: { x: 450, y: 20, width: 90, height: 90, shape: "circle" },
  11: { x: 450, y: 120, width: 90, height: 90, shape: "circle" },
  12: { x: 450, y: 220, width: 100, height: 100, shape: "rect" },
  13: { x: 450, y: 400, width: 90, height: 90, shape: "circle" },
  14: { x: 320, y: 500, width: 160, height: 70, shape: "rect" },
  16: { x: 650, y: 450, width: 100, height: 100, shape: "rect" },
  17: { x: 650, y: 350, width: 140, height: 70, shape: "rect" },
  18: { x: 650, y: 260, width: 140, height: 70, shape: "rect" },
  19: { x: 650, y: 170, width: 140, height: 70, shape: "rect" },
  20: { x: 650, y: 50, width: 100, height: 100, shape: "rect" },
}

// Day mapping - updated to use day names instead of numbers
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
  const [mealSelections, setMealSelections] = useState({})
  const [menuItems, setMenuItems] = useState([])
  const supabase = createClientComponentClient()

  // Fetch meal selections and menu items for the selected day
  useEffect(() => {
    fetchMealData()
  }, [selectedDay, guests])

  const fetchMealData = async () => {
    try {
      const dayNumber = DAY_MAPPING[selectedDay]

      // Fetch meal selections for this day
      const { data: selections, error: selectionsError } = await supabase
        .from("meal_selections")
        .select("*")
        .eq("day", dayNumber)

      if (selectionsError) {
        console.error("Error fetching meal selections:", selectionsError)
      }

      // Fetch menu items for this day
      const { data: menuData, error: menuError } = await supabase.from("menu_items").select("*").eq("day", dayNumber)

      if (menuError) {
        console.error("Error fetching menu items:", menuError)
      }

      setMenuItems(menuData || [])

      // Process meal selections by guest
      const guestMealSelections = {}
      if (selections) {
        selections.forEach((selection) => {
          guestMealSelections[selection.guest_id] = {
            meal_id: selection.meal_id,
            meal_name: selection.meal_name,
            meal_category: selection.meal_category,
          }
        })
      }

      setMealSelections(guestMealSelections)

      // Create enhanced meal data with guest info and meal selections
      const enhancedMealData = guests.map((guest) => {
        const mealSelection = guestMealSelections[guest.id]
        return {
          ...guest,
          meal_day: selectedDay,
          meal_selection: mealSelection || null,
          meal_category: mealSelection ? getMealCategory(mealSelection.meal_id, menuData || []) : null,
        }
      })

      setMealData(enhancedMealData)
      calculateKitchenSummary(enhancedMealData, menuData || [])
    } catch (error) {
      console.error("Error fetching meal data:", error)
    }
  }

  // Determine meal category (meat/fish/vegetarian) based on meal_type
  const getMealCategory = (mealId, menuItems) => {
    const meal = menuItems.find((item) => item.id === mealId)
    if (!meal) return "No Selection"

    // Map meal_type to categories
    const mealType = meal.meal_type?.toLowerCase() || ""

    if (
      mealType.includes("meat") ||
      mealType.includes("beef") ||
      mealType.includes("pork") ||
      mealType.includes("chicken") ||
      mealType.includes("lamb")
    ) {
      return "Meat"
    } else if (mealType.includes("fish") || mealType.includes("salmon") || mealType.includes("seafood")) {
      return "Fish"
    } else if (mealType.includes("vegetarian") || mealType.includes("vegan") || mealType.includes("veggie")) {
      return "Vegetarian"
    } else {
      // Default categorization based on meal name if meal_type is not clear
      const mealName = meal.name_en?.toLowerCase() || ""
      if (
        mealName.includes("beef") ||
        mealName.includes("chicken") ||
        mealName.includes("pork") ||
        mealName.includes("lamb") ||
        mealName.includes("meat")
      ) {
        return "Meat"
      } else if (mealName.includes("fish") || mealName.includes("salmon") || mealName.includes("seafood")) {
        return "Fish"
      } else if (mealName.includes("vegetarian") || mealName.includes("vegan") || mealName.includes("veggie")) {
        return "Vegetarian"
      }
    }

    return "Other"
  }

  const calculateKitchenSummary = (data, menuItems) => {
    const summary = {
      totalGuests: data.length,
      meat: 0,
      fish: 0,
      vegetarian: 0,
      other: 0,
      noSelection: 0,
      mealBreakdown: {},
    }

    data.forEach((guest) => {
      if (guest.meal_selection) {
        const category = getMealCategory(guest.meal_selection.meal_id, menuItems)

        switch (category) {
          case "Meat":
            summary.meat++
            break
          case "Fish":
            summary.fish++
            break
          case "Vegetarian":
            summary.vegetarian++
            break
          case "Other":
            summary.other++
            break
          default:
            summary.noSelection++
        }

        // Count specific meals
        const mealName = guest.meal_selection.meal_name
        if (mealName) {
          summary.mealBreakdown[mealName] = (summary.mealBreakdown[mealName] || 0) + 1
        }
      } else {
        summary.noSelection++
      }
    })

    setKitchenSummary(summary)
  }

  // Get table color based on meal completion status
  const getTableMealColor = (tableNumber) => {
    const tableGuests = mealData.filter((guest) => guest.table_nr === tableNumber)
    if (tableGuests.length === 0) return "rgb(239, 246, 255)" // Empty

    const completedSelections = tableGuests.filter((guest) => guest.meal_selection).length
    const completionRate = completedSelections / tableGuests.length

    if (completionRate === 1) return "rgb(34, 197, 94)" // Green - all complete
    if (completionRate >= 0.5) return "rgb(251, 191, 36)" // Yellow - partial
    if (completionRate > 0) return "rgb(249, 115, 22)" // Orange - some selections
    return "rgb(239, 68, 68)" // Red - no selections
  }

  // Get table guests with their cabin numbers and meal choices
  const getTableGuestsInfo = (tableNumber) => {
    const tableGuests = mealData.filter((guest) => guest.table_nr === tableNumber)

    // Group by cabin
    const cabinGroups = {}
    tableGuests.forEach((guest) => {
      const cabin = guest.cabin_nr || "Unknown"
      if (!cabinGroups[cabin]) {
        cabinGroups[cabin] = []
      }
      cabinGroups[cabin].push(guest)
    })

    return cabinGroups
  }

  // Render tables with meal status and cabin/meal info
  const renderMealTables = () => {
    const tables = []
    const tableNumbers = Object.keys(TABLE_POSITIONS)

    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const position = TABLE_POSITIONS[tableNumber]
      const tableNum = Number.parseInt(tableNumber, 10)
      const cabinGroups = getTableGuestsInfo(tableNum)
      const totalGuests = Object.values(cabinGroups).flat().length

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

      // Add table number
      tables.push(
        <text
          key={`table-${tableNumber}`}
          x={position.x + position.width / 2}
          y={position.y + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontWeight="bold"
          fontSize="14"
          className="select-none"
        >
          Table {tableNumber}
        </text>,
      )

      // Add cabin numbers and meal info
      if (totalGuests > 0) {
        const cabinNumbers = Object.keys(cabinGroups)
        let yOffset = 25

        // Show cabin numbers
        cabinNumbers.slice(0, 3).forEach((cabin, index) => {
          const cabinGuests = cabinGroups[cabin]
          const mealCategories = cabinGuests.map((guest) => {
            if (guest.meal_selection) {
              return getMealCategory(guest.meal_selection.meal_id, menuItems)
            }
            return "None"
          })

          // Get unique meal categories for this cabin
          const uniqueCategories = [...new Set(mealCategories)].filter((cat) => cat !== "None")
          const categoryText = uniqueCategories.length > 0 ? uniqueCategories.join("/") : "No meal"

          tables.push(
            <text
              key={`cabin-${tableNumber}-${cabin}`}
              x={position.x + position.width / 2}
              y={position.y + yOffset}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="10"
              className="select-none"
            >
              Cabin {cabin}
            </text>,
          )

          tables.push(
            <text
              key={`meal-${tableNumber}-${cabin}`}
              x={position.x + position.width / 2}
              y={position.y + yOffset + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="8"
              className="select-none"
            >
              {categoryText}
            </text>,
          )

          yOffset += 25
        })

        // If more than 3 cabins, show "..."
        if (cabinNumbers.length > 3) {
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
              +{cabinNumbers.length - 3} more
            </text>,
          )
        }
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
            fontSize="10"
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
      {/* Day Selection Tabs - Updated with day names */}
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
          {/* Kitchen Prep Summary - Updated with meat/fish/vegetarian */}
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

              {/* Detailed meal breakdown */}
              {Object.keys(kitchenSummary.mealBreakdown || {}).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Detailed Meal Breakdown</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {Object.entries(kitchenSummary.mealBreakdown || {}).map(([meal, count]) => (
                      <div key={meal} className="flex justify-between bg-gray-50 p-2 rounded">
                        <span className="truncate">{meal}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Floor Plan with Meal Status and Cabin Info */}
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
                <svg width="100%" height="600" viewBox="0 0 800 600" className="bg-white">
                  <rect x="0" y="0" width="800" height="600" fill="white" />
                  {renderMealTables()}

                  {/* Updated Legend */}
                  <g transform="translate(50, 480)">
                    <text x="0" y="0" fontWeight="medium" fontSize="12">
                      Meal Selection Status:
                    </text>
                    <circle cx="10" cy="20" r="6" fill="rgb(34, 197, 94)" />
                    <text x="25" y="24" fontSize="12">
                      All meals selected
                    </text>

                    <circle cx="10" cy="40" r="6" fill="rgb(251, 191, 36)" />
                    <text x="25" y="44" fontSize="12">
                      Most meals selected
                    </text>

                    <circle cx="10" cy="60" r="6" fill="rgb(249, 115, 22)" />
                    <text x="25" y="64" fontSize="12">
                      Some meals selected
                    </text>

                    <circle cx="10" cy="80" r="6" fill="rgb(239, 68, 68)" />
                    <text x="25" y="84" fontSize="12">
                      No meals selected
                    </text>

                    <circle cx="200" cy="20" r="6" fill="rgb(239, 246, 255)" />
                    <text x="215" y="24" fontSize="12">
                      No guests assigned
                    </text>
                  </g>
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filter Section */}
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

              {/* Guest List Table - Updated with meal categories */}
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
                      const mealCategory = guest.meal_selection
                        ? getMealCategory(guest.meal_selection.meal_id, menuItems)
                        : "No Selection"

                      return (
                        <tr key={guest.id} className={hasSelection ? "bg-green-50" : "bg-red-50"}>
                          <td className="px-3 py-2">{guest.table_nr || "Unassigned"}</td>
                          <td className="px-3 py-2">{guest.cabin_nr}</td>
                          <td className="px-3 py-2">{guest.guest_name}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={mealCategory === "No Selection" ? "destructive" : "default"}
                              className={
                                mealCategory === "Meat"
                                  ? "bg-red-100 text-red-800"
                                  : mealCategory === "Fish"
                                    ? "bg-blue-100 text-blue-800"
                                    : mealCategory === "Vegetarian"
                                      ? "bg-green-100 text-green-800"
                                      : ""
                              }
                            >
                              {mealCategory}
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
