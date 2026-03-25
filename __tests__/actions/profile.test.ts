import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Test the profile validation schemas used by server actions.
 * We replicate the schemas here to test them without needing
 * the Supabase server context.
 */

const updateProfileSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name must be less than 100 characters"),
});

const updateAvatarSchema = z.object({
    url: z.string().url("Must be a valid URL").or(z.literal("")),
});

describe('Profile Name Validation', () => {

    it('accepts valid name', () => {
        const result = updateProfileSchema.safeParse({ name: 'John Doe' });
        expect(result.success).toBe(true);
    });

    it('accepts single character name', () => {
        const result = updateProfileSchema.safeParse({ name: 'J' });
        expect(result.success).toBe(true);
    });

    it('accepts name at max length (100 chars)', () => {
        const result = updateProfileSchema.safeParse({ name: 'A'.repeat(100) });
        expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
        const result = updateProfileSchema.safeParse({ name: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Name cannot be empty');
        }
    });

    it('rejects name longer than 100 chars', () => {
        const result = updateProfileSchema.safeParse({ name: 'A'.repeat(101) });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('100 characters');
        }
    });

    it('accepts name with special characters', () => {
        const result = updateProfileSchema.safeParse({ name: 'José García-López' });
        expect(result.success).toBe(true);
    });

    it('accepts name with unicode', () => {
        const result = updateProfileSchema.safeParse({ name: '田中太郎' });
        expect(result.success).toBe(true);
    });

    it('accepts name with emojis', () => {
        const result = updateProfileSchema.safeParse({ name: 'John 🚀' });
        expect(result.success).toBe(true);
    });
});

describe('Avatar URL Validation', () => {

    it('accepts valid https URL', () => {
        const result = updateAvatarSchema.safeParse({ url: 'https://example.com/avatar.jpg' });
        expect(result.success).toBe(true);
    });

    it('accepts valid http URL', () => {
        const result = updateAvatarSchema.safeParse({ url: 'http://example.com/avatar.png' });
        expect(result.success).toBe(true);
    });

    it('accepts empty string (clear avatar)', () => {
        const result = updateAvatarSchema.safeParse({ url: '' });
        expect(result.success).toBe(true);
    });

    it('accepts Supabase storage URL', () => {
        const url = 'https://raigjhnvznondeoimozd.supabase.co/storage/v1/object/public/avatars/test.jpg';
        const result = updateAvatarSchema.safeParse({ url });
        expect(result.success).toBe(true);
    });

    it('rejects invalid URL format', () => {
        const result = updateAvatarSchema.safeParse({ url: 'not-a-url' });
        expect(result.success).toBe(false);
    });

    it('rejects URL without protocol', () => {
        const result = updateAvatarSchema.safeParse({ url: 'example.com/avatar.jpg' });
        expect(result.success).toBe(false);
    });

    it('rejects random text', () => {
        const result = updateAvatarSchema.safeParse({ url: 'just some text here' });
        expect(result.success).toBe(false);
    });
});
