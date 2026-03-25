import { describe, it, expect } from 'vitest';
import { dailyReportSchema } from '@/lib/schemas/daily-report';

describe('Daily Report Schema Validation', () => {

    const validReport = {
        yesterday_done: ['task-1'],
        yesterday_carried: [],
        today_completed: ['Finished feature X'],
        today_plan: 'Work on feature Y\nReview PRs',
        blockers: 'Waiting on API access',
        sentiment: 'green' as const,
    };

    it('accepts a valid report', () => {
        const result = dailyReportSchema.safeParse(validReport);
        expect(result.success).toBe(true);
    });

    it('accepts report without blockers (optional field)', () => {
        const report = { ...validReport, blockers: undefined };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(true);
    });

    it('accepts report with empty blockers', () => {
        const report = { ...validReport, blockers: '' };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(true);
    });

    it('rejects report with empty today_plan', () => {
        const report = { ...validReport, today_plan: '' };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(false);
    });

    it('rejects report with only whitespace in today_plan', () => {
        const report = { ...validReport, today_plan: '   \n   \n   ' };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(false);
    });

    it('accepts report with single plan item', () => {
        const report = { ...validReport, today_plan: 'Just one task' };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(true);
    });

    it('accepts all valid sentiment values', () => {
        for (const sentiment of ['green', 'yellow', 'red'] as const) {
            const report = { ...validReport, sentiment };
            const result = dailyReportSchema.safeParse(report);
            expect(result.success).toBe(true);
        }
    });

    it('rejects invalid sentiment value', () => {
        const report = { ...validReport, sentiment: 'blue' };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(false);
    });

    it('rejects missing sentiment', () => {
        const { sentiment, ...report } = validReport;
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(false);
    });

    it('accepts empty yesterday_done array', () => {
        const report = { ...validReport, yesterday_done: [] };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(true);
    });

    it('accepts empty today_completed array', () => {
        const report = { ...validReport, today_completed: [] };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(true);
    });

    it('accepts multiple plan items separated by newlines', () => {
        const report = { ...validReport, today_plan: 'Task 1\nTask 2\nTask 3\nTask 4\nTask 5' };
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(true);
    });

    it('rejects missing today_plan field', () => {
        const { today_plan, ...report } = validReport;
        const result = dailyReportSchema.safeParse(report);
        expect(result.success).toBe(false);
    });
});
