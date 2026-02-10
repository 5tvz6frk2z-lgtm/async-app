
import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Client for RLS check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const clientDb = createClient(supabaseUrl, supabaseKey)

async function checkState() {
    console.log("Checking State for 'new_verify_daily@test.com' via Direct PG + Client RLS...");

    // 1. Direct DB Connection
    const dbConfig = {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 54322,
    };

    const client = new Client(dbConfig);
    await client.connect();

    try {
        // 2. Find User ID
        // Auth users are in auth.users table in Supabase PG
        const userRes = await client.query(`select id, email from auth.users where email = 'new_verify_daily@test.com'`);
        if (userRes.rows.length === 0) {
            console.error("User NOT found in DB!");
            return;
        }
        const user = userRes.rows[0];
        console.log(`User Found (DB): ${user.id}`);

        // 3. Check Invitations
        const inviteRes = await client.query(`select * from public.invitations where email = $1`, [user.email]);
        console.log("Invites (DB):", inviteRes.rows);

        // 4. Check Memberships
        const memberRes = await client.query(`select * from public.team_members where user_id = $1`, [user.id]);
        console.log("Memberships (DB):", memberRes.rows);

        // 5. Check Client/RLS View
        console.log("\n--- Checking Client/RLS View ---");
        const { error: loginError } = await clientDb.auth.signInWithPassword({
            email: 'new_verify_daily@test.com',
            password: 'password'
        });

        if (loginError) {
            console.error("Login Failed:", loginError.message);
        } else {
            const { data: rlsMembers } = await clientDb
                .from("team_members")
                .select("*, team:teams(*)")
                .eq("user_id", user.id);

            console.log("Memberships (RLS):", rlsMembers);

            if (memberRes.rows.length > 0 && (!rlsMembers || rlsMembers.length === 0)) {
                console.error("CRITICAL: RLS HIDING MEMBERSHIP");
            } else if (memberRes.rows.length === 0) {
                console.error("CRITICAL: NO MEMBERSHIP IN DB (Insert Failed)");
            } else {
                // Check if Team data is missing
                const first = rlsMembers![0];
                if (!first.team) {
                    console.error("CRITICAL: TEAM DATA HIDDEN (Teams RLS)");
                } else {
                    console.log("State Look OK?");
                }
            }
        }

    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await client.end();
    }
}

checkState();
