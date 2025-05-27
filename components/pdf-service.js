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

    // Function to get meal name by ID
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

    // Add meal selections for each day
    let yPosition = 60

    for (let day = 2; day <= 7; day++) {
      // Check if any guest has selections for this day
      let hasSelections = false
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i]
        if (mealSelections[guest.id] && mealSelections[guest.id][day] > 0) {
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
        doc.rect(20, yPosition, 170, 8, "F")
        doc.setFontSize(subtitleFontSize)
        doc.setFont("helvetica", "bold")
        doc.text(`Day ${day} - ${DAY_NAMES[day]}`, 25, yPosition + 5.5)
        yPosition += 12

        // Add table header
        doc.setFontSize(normalFontSize)
        doc.setFont("helvetica", "bold")
        doc.text("Guest", 25, yPosition)
        doc.text("Meal Selection", 80, yPosition)
        yPosition += 5

        // Add horizontal line
        doc.setDrawColor(200, 200, 200)
        doc.line(25, yPosition, 185, yPosition)
        yPosition += 5

        // Add guest selections
        doc.setFont("helvetica", "normal")
        for (let i = 0; i < guests.length; i++) {
          const guest = guests[i]
          const mealId = mealSelections[guest.id] ? mealSelections[guest.id][day] : null
          const mealName = getMealName(mealId)

          doc.text(guest.guest_name, 25, yPosition)

          // Handle long meal names with wrapping
          const mealNameLines = doc.splitTextToSize(mealName, 105)
          doc.text(mealNameLines, 80, yPosition)

          // Adjust position based on number of lines
          yPosition += Math.max(6, mealNameLines.length * 5)
        }

        // Add space after each day
        yPosition += 8
      }
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
