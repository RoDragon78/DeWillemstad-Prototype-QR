// Day names
const DAY_NAMES = ["", "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

export async function generateAndDownloadPdf(options) {
  const { cabinNumber, guests, mealSelections, menuItems, language } = options

  try {
    // Dynamically import jsPDF to avoid SSR issues
    const { jsPDF } = await import("jspdf")

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Set font sizes
    const titleFontSize = 16
    const subtitleFontSize = 12
    const normalFontSize = 10
    const smallFontSize = 8

    // Add title
    doc.setFontSize(titleFontSize)
    doc.setFont("helvetica", "bold")
    doc.text("DeWillemstad Meal Selections", 105, 20, { align: "center" })

    // Add subtitle
    doc.setFontSize(subtitleFontSize)
    doc.setFont("helvetica", "normal")
    doc.text("River Cruise Dining", 105, 28, { align: "center" })

    // Add cabin info
    doc.setFillColor(240, 247, 255)
    doc.rect(20, 35, 170, 15, "F")
    doc.setFontSize(subtitleFontSize)
    doc.setFont("helvetica", "bold")
    doc.text(`Cabin: ${cabinNumber}`, 105, 42, { align: "center" })
    doc.setFontSize(normalFontSize)
    doc.setFont("helvetica", "normal")

    // Get guest names
    const guestNames = []
    for (let i = 0; i < guests.length; i++) {
      guestNames.push(guests[i].guest_name)
    }
    doc.text(`Guests: ${guestNames.join(", ")}`, 105, 48, { align: "center" })

    // Function to get meal name by ID (legacy support)
    const getMealName = (mealId) => {
      let meal = null
      for (let i = 0; i < menuItems.length; i++) {
        if (menuItems[i].id === mealId) {
          meal = menuItems[i]
          break
        }
      }

      if (!meal) return "No selection"

      // Get meal name based on language
      if (language === "en") return meal.name_en
      if (language === "nl") return meal.name_nl || meal.name_en
      if (language === "de") return meal.name_de || meal.name_en
      return meal.name_en
    }

    // Function to get meal category color
    const getCategoryColor = (category) => {
      if (!category) return [240, 240, 240] // Light gray for no category

      const lowerCategory = category.toLowerCase()
      if (lowerCategory === "meat") return [255, 235, 238] // Light red
      if (lowerCategory === "fish") return [227, 242, 253] // Light blue
      if (lowerCategory === "vegetarian") return [232, 245, 232] // Light green
      return [240, 240, 240] // Default light gray
    }

    // Add meal selections for each day
    let yPosition = 60

    for (let day = 2; day <= 7; day++) {
      // Check if any guest has selections for this day
      let hasSelections = false
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i]

        // Check both old format (mealSelections with IDs) and new format (guest.meals)
        const hasOldFormat = mealSelections && mealSelections[guest.id] && mealSelections[guest.id][day] > 0
        const hasNewFormat = guest.meals && guest.meals[day] && guest.meals[day].meal_name

        if (hasOldFormat || hasNewFormat) {
          hasSelections = true
          break
        }
      }

      if (hasSelections) {
        // Add page break if needed
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        // Add day header
        doc.setFillColor(245, 245, 245)
        doc.rect(20, yPosition, 170, 10, "F")
        doc.setFontSize(subtitleFontSize)
        doc.setFont("helvetica", "bold")
        doc.text(`Day ${day} - ${DAY_NAMES[day]}`, 25, yPosition + 6.5)
        yPosition += 15

        // Add table header
        doc.setFontSize(normalFontSize)
        doc.setFont("helvetica", "bold")
        doc.text("Guest", 25, yPosition)
        doc.text("Meal Selection", 80, yPosition)
        doc.text("Category", 150, yPosition)
        yPosition += 5

        // Add horizontal line
        doc.setDrawColor(200, 200, 200)
        doc.line(25, yPosition, 185, yPosition)
        yPosition += 8

        // Add guest selections
        doc.setFont("helvetica", "normal")
        for (let i = 0; i < guests.length; i++) {
          const guest = guests[i]
          let mealName = "No selection"
          let mealCategory = ""

          // Check for new format first (guest.meals)
          if (guest.meals && guest.meals[day]) {
            mealName = guest.meals[day].meal_name || "No selection"
            mealCategory = guest.meals[day].meal_category || ""
          }
          // Fallback to old format (mealSelections with IDs)
          else if (mealSelections && mealSelections[guest.id] && mealSelections[guest.id][day]) {
            const mealId = mealSelections[guest.id][day]
            mealName = getMealName(mealId)
            // Try to get category from menuItems
            const menuItem = menuItems.find((item) => item.id === mealId)
            mealCategory = menuItem ? menuItem.meal_type || "" : ""
          }

          // Add background color based on meal category
          if (mealName !== "No selection" && mealCategory) {
            const categoryColor = getCategoryColor(mealCategory)
            doc.setFillColor(categoryColor[0], categoryColor[1], categoryColor[2])
            doc.rect(24, yPosition - 4, 162, 8, "F")
          }

          // Add guest name
          doc.setTextColor(0, 0, 0)
          doc.text(guest.guest_name, 25, yPosition)

          // Handle long meal names with wrapping
          const mealNameLines = doc.splitTextToSize(mealName, 65)
          doc.text(mealNameLines, 80, yPosition)

          // Add meal category
          if (mealCategory) {
            doc.setFontSize(smallFontSize)
            doc.setFont("helvetica", "bold")

            // Set category text color
            if (mealCategory.toLowerCase() === "meat") {
              doc.setTextColor(185, 28, 28) // Red
            } else if (mealCategory.toLowerCase() === "fish") {
              doc.setTextColor(37, 99, 235) // Blue
            } else if (mealCategory.toLowerCase() === "vegetarian") {
              doc.setTextColor(34, 197, 94) // Green
            } else {
              doc.setTextColor(107, 114, 128) // Gray
            }

            doc.text(mealCategory, 150, yPosition)

            // Reset font and color
            doc.setFontSize(normalFontSize)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(0, 0, 0)
          }

          // Adjust position based on number of lines
          yPosition += Math.max(10, mealNameLines.length * 5 + 2)
        }

        // Add space after each day
        yPosition += 10
      }
    }

    // Add legend if there are meal categories
    let hasCategories = false
    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i]
      if (guest.meals) {
        for (let day = 2; day <= 7; day++) {
          if (guest.meals[day] && guest.meals[day].meal_category) {
            hasCategories = true
            break
          }
        }
        if (hasCategories) break
      }
    }

    if (hasCategories) {
      // Add page break if needed
      if (yPosition > 260) {
        doc.addPage()
        yPosition = 20
      }

      // Add legend
      doc.setFillColor(245, 245, 245)
      doc.rect(20, yPosition, 170, 25, "F")

      doc.setFontSize(subtitleFontSize)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text("Meal Category Legend:", 25, yPosition + 8)

      doc.setFontSize(normalFontSize)
      doc.setFont("helvetica", "normal")

      // Meat legend
      doc.setFillColor(255, 235, 238)
      doc.rect(25, yPosition + 12, 8, 4, "F")
      doc.setTextColor(185, 28, 28)
      doc.text("Meat", 35, yPosition + 15)

      // Fish legend
      doc.setFillColor(227, 242, 253)
      doc.rect(65, yPosition + 12, 8, 4, "F")
      doc.setTextColor(37, 99, 235)
      doc.text("Fish", 75, yPosition + 15)

      // Vegetarian legend
      doc.setFillColor(232, 245, 232)
      doc.rect(105, yPosition + 12, 8, 4, "F")
      doc.setTextColor(34, 197, 94)
      doc.text("Vegetarian", 115, yPosition + 15)

      yPosition += 30
    }

    // Add footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(smallFontSize)
      doc.setTextColor(100, 100, 100)
      doc.text("If you need to make changes to your selections, please contact the Hotel Manager.", 105, 285, {
        align: "center",
      })
      doc.text(`Page ${i} of ${pageCount}`, 105, 292, { align: "center" })
    }

    // Save the PDF
    doc.save(`DeWillemstad_Cabin${cabinNumber}_Meals.pdf`)

    return true
  } catch (error) {
    console.error("Error generating PDF:", error)
    return false
  }
}
