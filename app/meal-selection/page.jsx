"use client"

import { useState, useEffect } from "react"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const meals = [
  { id: "meal1", name: "Chicken Stir-Fry" },
  { id: "meal2", name: "Vegetarian Pasta" },
  { id: "meal3", name: "Beef Tacos" },
  { id: "meal4", name: "Salmon with Roasted Vegetables" },
  { id: "meal5", name: "Pizza" },
  { id: "meal6", name: "Salad" },
]

const MealSelectionPage = () => {
  const [selections, setSelections] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load selections from local storage on component mount
    const storedSelections = localStorage.getItem("mealSelections")
    if (storedSelections) {
      setSelections(JSON.parse(storedSelections))
    }
  }, [])

  useEffect(() => {
    // Save selections to local storage whenever selections change
    localStorage.setItem("mealSelections", JSON.stringify(selections))
  }, [selections])

  const handleSelectionChange = (mealId) => {
    setSelections((prevSelections) => ({
      ...prevSelections,
      [mealId]: !prevSelections[mealId],
    }))
  }

  const handleSaveAndGeneratePdf = async () => {
    setLoading(true)
    try {
      const doc = new jsPDF()
      doc.text("Meal Selections", 10, 10)

      const selectedMeals = Object.keys(selections)
        .filter((mealId) => selections[mealId])
        .map((mealId) => meals.find((meal) => meal.id === mealId).name)

      const data = selectedMeals.map((meal) => [meal])

      // @ts-ignore
      doc.autoTable({
        head: [["Meal"]],
        body: data,
      })

      doc.save("meal_selections.pdf")
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Meal Selection</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meals.map((meal) => (
          <div key={meal.id} className="flex items-center">
            <Checkbox
              id={meal.id}
              checked={selections[meal.id] || false}
              onCheckedChange={() => handleSelectionChange(meal.id)}
            />
            <Label htmlFor={meal.id} className="ml-2">
              {meal.name}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 mt-8">
        <Button
          onClick={handleSaveAndGeneratePdf}
          disabled={loading || Object.keys(selections).length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
        >
          {loading ? "Processing..." : "Complete Selection & Save PDF"}
        </Button>
      </div>
    </div>
  )
}

export default MealSelectionPage
