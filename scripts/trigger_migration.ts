
import fs from 'fs';
import path from 'path';

async function trigger() {
    const sqlPath = path.join(process.cwd(), 'migration_ensure_teams_view.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Sending Migration...");

    // Create a special script to fetch localhost:3001
    // We assume dev server is running
    const response = await fetch('http://localhost:3001/api/admin/run-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql })
    });

    const text = await response.text();
    console.log("Response:", response.status, text);
}

trigger();
