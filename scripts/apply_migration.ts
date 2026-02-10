import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function runMigration() {
    // Default Supabase local DB credentials
    const dbConfig = {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 54322,
    };

    console.log(`Connecting to DB at ${dbConfig.host}:${dbConfig.port}...`);
    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log('Connected successfully.');

        const sqlPath = path.join(process.cwd(), 'migration_fix_avatar.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration SQL...');
        await client.query(sql);
        console.log('Migration applied successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
