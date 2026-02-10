
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Use anon key for reading public-ish data or service role if needed

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching recent plan items...");

    // Get recent reports
    const { data: reports, error: rErr } = await supabase
        .from("reports")
        .select(`
        id, 
        user_id, 
        date, 
        profiles(name, email), 
        plan_items(content, type)
    `)
        .eq('date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(5);

    if (rErr) {
        console.error(rErr);
        return;
    }

    reports.forEach((r: any) => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        console.log(`\nReport for ${profile?.name || profile?.email || 'Unknown'} (${r.date}):`);
        const items = r.plan_items.filter((i: any) => i.type === 'plan_for_tomorrow');
        if (items.length === 0) console.log("  No plan items.");
        items.forEach((item: any, idx: number) => {
            console.log(`  Item ${idx + 1}: "${item.content}"`);
        });
    });
}

main();
