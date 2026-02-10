-- Rename Test Team members to realistic names

-- Update member@test.com -> Alex Chen
UPDATE profiles
SET name = 'Alex Chen'
WHERE email = 'member@test.com';

-- Update member1@test.com -> Jordan Lee
UPDATE profiles
SET name = 'Jordan Lee'
WHERE email = 'member1@test.com';

-- Update member2@test.com -> Sam Taylor
UPDATE profiles
SET name = 'Sam Taylor'
WHERE email = 'member2@test.com';

-- Update member3@test.com -> Morgan Rivera
UPDATE profiles
SET name = 'Morgan Rivera'
WHERE email = 'member3@test.com';

-- Update member5@test.com -> Casey Kim
UPDATE profiles
SET name = 'Casey Kim'
WHERE email = 'member5@test.com';

-- Update manager@test.com -> Sarah Jenkins (Manager)
UPDATE profiles
SET name = 'Sarah Jenkins'
WHERE email = 'manager@test.com';

-- Verify updates
SELECT email, name FROM profiles WHERE email LIKE '%@test.com';
