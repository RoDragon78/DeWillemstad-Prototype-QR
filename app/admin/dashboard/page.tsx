"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Calendar, Users, Utensils, Settings, Home, FileText } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    // Check if user is authenticated using localStorage
    const isAuthenticated = localStorage.getItem("isAdminAuthenticated") === "true"

    if (!isAuthenticated) {
      router.push("/admin/login")
    } else {
      setLoading(false)
    }
  }, [router])

  function handleSignOut() {
    // Clear authentication
    localStorage.removeItem("isAdminAuthenticated")
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md min-h-screen p-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold">De Willemstad</h2>
            <p className="text-sm text-gray-500">Admin Portal</p>
          </div>

          <nav className="space-y-1">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("overview")}
            >
              <Home className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button
              variant={activeTab === "meals" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("meals")}
            >
              <Utensils className="mr-2 h-4 w-4" />
              Meal Management
            </Button>
            <Button
              variant={activeTab === "guests" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("guests")}
            >
              <Users className="mr-2 h-4 w-4" />
              Guest List
            </Button>
            <Button
              variant={activeTab === "bookings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("bookings")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Bookings
            </Button>
            <Button
              variant={activeTab === "reports" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("reports")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
            <Button
              variant={activeTab === "settings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome, Admin</p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>

          {/* Tab content */}
          <div className="bg-white rounded-lg shadow p-6">
            {activeTab === "overview" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium">Total Bookings</h3>
                    <p className="text-2xl font-bold">124</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium">Meals Selected</h3>
                    <p className="text-2xl font-bold">342</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium">Special Requests</h3>
                    <p className="text-2xl font-bold">28</p>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-8 mb-4">Recent Activity</h3>
                <div className="border rounded-lg divide-y">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="p-3 flex items-center">
                      <div className="bg-gray-100 rounded-full p-2 mr-3">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Cabin {Math.floor(Math.random() * 100) + 100} submitted meal choices
                        </p>
                        <p className="text-sm text-gray-500">{Math.floor(Math.random() * 24)} hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "meals" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Meal Management</h2>
                <Tabs defaultValue="current">
                  <TabsList className="mb-4">
                    <TabsTrigger value="current">Current Menu</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming Menu</TabsTrigger>
                    <TabsTrigger value="special">Special Diets</TabsTrigger>
                  </TabsList>

                  <TabsContent value="current" className="space-y-4">
                    <div className="border rounded-lg">
                      <div className="bg-gray-50 p-3 font-medium grid grid-cols-4 gap-4">
                        <div>Meal Option</div>
                        <div>Description</div>
                        <div>Category</div>
                        <div>Count</div>
                      </div>
                      <div className="divide-y">
                        {[
                          { name: "Beef Wellington", desc: "with Roasted Vegetables", category: "Meat", count: 78 },
                          { name: "Grilled Salmon", desc: "with Lemon Butter Sauce", category: "Fish", count: 64 },
                          { name: "Vegetarian Pasta", desc: "Primavera", category: "Vegetarian", count: 42 },
                          { name: "Chicken Cordon Bleu", desc: "with Mashed Potatoes", category: "Poultry", count: 58 },
                        ].map((meal, i) => (
                          <div key={i} className="p-3 grid grid-cols-4 gap-4">
                            <div className="font-medium">{meal.name}</div>
                            <div>{meal.desc}</div>
                            <div>{meal.category}</div>
                            <div>{meal.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="upcoming">
                    <p>Upcoming menu content would go here.</p>
                  </TabsContent>

                  <TabsContent value="special">
                    <p>Special dietary requirements content would go here.</p>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {activeTab === "guests" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Guest List</h2>
                <div className="border rounded-lg">
                  <div className="bg-gray-50 p-3 font-medium grid grid-cols-4 gap-4">
                    <div>Cabin</div>
                    <div>Guest Name</div>
                    <div>Dietary Restrictions</div>
                    <div>Meal Selected</div>
                  </div>
                  <div className="divide-y">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="p-3 grid grid-cols-4 gap-4">
                        <div>{Math.floor(Math.random() * 100) + 100}</div>
                        <div>Guest {i + 1}</div>
                        <div>
                          {Math.random() > 0.7
                            ? "None"
                            : ["Vegetarian", "Gluten-free", "Nut Allergy"][Math.floor(Math.random() * 3)]}
                        </div>
                        <div>
                          {
                            ["Beef Wellington", "Grilled Salmon", "Vegetarian Pasta", "Chicken Cordon Bleu"][
                              Math.floor(Math.random() * 4)
                            ]
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "bookings" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Bookings</h2>
                <p>Booking management content would go here.</p>
              </div>
            )}

            {activeTab === "reports" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Reports</h2>
                <p>Reporting and analytics content would go here.</p>
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Settings</h2>
                <p>System settings content would go here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
