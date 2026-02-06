import { prisma } from "../lib/prisma"

async function clearGoogleAccount(userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    console.log("User not found:", userEmail)
    return
  }

  console.log("Found user:", user.id)

  // Delete the Google account
  const deleted = await prisma.account.deleteMany({
    where: {
      userId: user.id,
      provider: "google",
    },
  })

  console.log("Deleted Google account:", deleted.count)
  console.log("Please sign out and sign back in to re-authenticate with Google Calendar permissions.")
}

// Replace with your email
const userEmail = process.argv[2] || "your-email@gmail.com"
clearGoogleAccount(userEmail)
  .catch(console.error)
  .finally(() => prisma.$disconnect())