import fs from 'fs';
import path from 'path';

async function trigger() {
    const sqlPath = path.join(process.cwd(), 'migration_fix_team_members_insert.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Applying team_members INSERT policy fix...");

    const response = await fetch('http://localhost:3001/api/admin/run-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql })
    });

    const text = await response.text();
    console.log("Response:", response.status, text);
}

trigger();
