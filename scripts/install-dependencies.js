const { execSync } = require("child_process")

console.log("Installing dependencies...")

try {
  // Install dependencies using npm
  execSync("npm install --legacy-peer-deps", { stdio: "inherit" })
  console.log("Dependencies installed successfully!")
} catch (error) {
  console.error("Error installing dependencies:", error)
  process.exit(1)
}
