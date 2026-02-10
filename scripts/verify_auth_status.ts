import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuth() {
    const email = 'member@test.com';
    const password = 'password';

    console.log(`Checking credentials for ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login Failed:", error.message);
        if (error.message.includes("Email not confirmed")) {
            console.log("ACTION REQUIRED: User needs to verify email.");
        }
    } else {
        console.log("Login Success!");
        console.log("User ID:", data.user?.id);
        console.log("Email:", data.user?.email);
    }
}

checkAuth();
