
DO $$
DECLARE
    v_team_id uuid;
    v_user_id uuid;
    v_report_id uuid;
    v_email text;
    v_emails text[] := ARRAY['member1@test.com', 'member2@test.com', 'member3@test.com', 'member5@test.com'];
BEGIN
    -- 1. Get Team ID from member@test.com
    SELECT tm.team_id INTO v_team_id
    FROM profiles p
    JOIN team_members tm ON tm.user_id = p.id
    WHERE p.email = 'member@test.com'
    LIMIT 1;

    IF v_team_id IS NULL THEN
        RAISE NOTICE 'Could not find team for member@test.com';
        RETURN;
    END IF;

    RAISE NOTICE 'Found Team ID: %', v_team_id;

    -- 2. Loop through emails
    FOREACH v_email IN ARRAY v_emails
    LOOP
        -- Get User ID
        SELECT id INTO v_user_id FROM profiles WHERE email = v_email;

        IF v_user_id IS NOT NULL THEN
            RAISE NOTICE 'Processing % (ID: %)', v_email, v_user_id;

            -- Check if report exists
            SELECT id INTO v_report_id 
            FROM reports 
            WHERE user_id = v_user_id AND team_id = v_team_id AND date = CURRENT_DATE;

            IF v_report_id IS NULL THEN
                -- Insert Report
                INSERT INTO reports (team_id, user_id, date, sentiment, blockers, status, created_at, updated_at)
                VALUES (
                    v_team_id, 
                    v_user_id, 
                    CURRENT_DATE, 
                    (ARRAY['green', 'yellow', 'red'])[floor(random() * 3 + 1)], -- Random sentiment
                    CASE WHEN random() > 0.8 THEN 'Waiting on dependencies' ELSE NULL END, -- Occasional blocker
                    'submitted',
                    NOW(),
                    NOW()
                )
                RETURNING id INTO v_report_id;

                RAISE NOTICE 'Created report %', v_report_id;

                -- Insert Plan Items
                -- 1. Completed
                INSERT INTO plan_items (report_id, type, status, content, created_at, updated_at)
                VALUES (v_report_id, 'actual_done_today', 'done', 'Completed daily task for ' || v_email, NOW(), NOW());

                -- 2. Working On (Planned Today)
                INSERT INTO plan_items (report_id, type, status, content, created_at, updated_at)
                VALUES (v_report_id, 'planned_today', 'todo', 'Focusing on core features for ' || v_email, NOW(), NOW());

                -- 3. Tomorrow
                INSERT INTO plan_items (report_id, type, status, content, created_at, updated_at)
                VALUES (v_report_id, 'planned_tomorrow', 'todo', 'Planning research phase', NOW(), NOW());
            ELSE
                RAISE NOTICE 'Report already exists for %', v_email;
            END IF;
        ELSE
            RAISE NOTICE 'User % not found', v_email;
        END IF;
    END LOOP;
END $$;
