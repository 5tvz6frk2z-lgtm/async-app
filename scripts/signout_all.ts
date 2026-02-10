// Run with: npx tsx scripts/signout_all.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
    console.log("To sign out all users on your local machine:")
    console.log("1. Open browser DevTools (F12)")
    console.log("2. Go to Application → Local Storage → localhost:3001")
    console.log("3. Delete all entries")
    console.log("")
    console.log("Or simply open a new incognito/private window to start fresh!")
}

main()
