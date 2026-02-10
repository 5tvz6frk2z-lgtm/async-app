import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    const email = `member_test_${Date.now()}@test.com`; // Unique email
    const password = 'password';

    console.log(`Attempting signup for ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'member'
            }
        }
    });

    if (error) {
        console.error("Signup Failed:", error);
        console.error("Status:", error.status);
        console.error("Name:", error.name);
        console.error("Message:", error.message);
    } else {
        console.log("Signup Success!");
        console.log("User ID:", data.user?.id);
    }
}

testSignup();
