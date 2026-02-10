import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Anon usually allows signup
// Need Service Role to delete if exists or force creation? Anon is fine for signup.
const supabase = createClient(supabaseUrl, supabaseKey);

async function createMemberNoTeam() {
    const email = `member_noteam_${Date.now()}@test.com`;
    const password = 'password';

    console.log(`Creating orphan member: ${email}`);

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
        console.error("Error:", error.message);
    } else {
        console.log("Success! User created.");
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("Role:", data.user?.user_metadata?.role);
    }
}

createMemberNoTeam();
