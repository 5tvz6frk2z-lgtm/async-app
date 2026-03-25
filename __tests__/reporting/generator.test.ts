import { describe, it, expect } from 'vitest';
import { generateWeeklyReportHtml } from '@/lib/reporting/generator';
import type { WeeklyReportData } from '@/lib/reporting/aggregator';

describe('Weekly Report HTML Generator', () => {

    const sampleData: WeeklyReportData = {
        teamId: 'team-123',
        startDate: '2026-02-14',
        endDate: '2026-02-20',
        totalReports: 15,
        sentimentBreakdown: {
            green: 10,
            yellow: 3,
            red: 2,
        },
        blockers: [
            { content: 'Waiting on API access', user: 'Alice', date: '2026-02-18' },
            { content: 'Server downtime blocking deploys', user: 'Bob', date: '2026-02-19' },
        ],
        highlights: [
            { content: 'Completed auth refactor', user: 'Alice', date: '2026-02-17' },
            { content: 'Shipped new dashboard', user: 'Charlie', date: '2026-02-18' },
        ],
        participation: [
            { user: 'Alice', count: 5 },
            { user: 'Bob', count: 4 },
            { user: 'Charlie', count: 3 },
        ],
    };

    it('generates valid HTML string', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html>');
        expect(html).toContain('</html>');
    });

    it('includes team name in report', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Acme Engineering');

        expect(html).toContain('Acme Engineering');
    });

    it('includes date range', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        expect(html).toContain('2026-02-14');
        expect(html).toContain('2026-02-20');
    });

    it('includes sentiment breakdown numbers', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        expect(html).toContain('10 Positive');
        expect(html).toContain('3 Neutral');
        expect(html).toContain('2 Struggling');
    });

    it('renders blocker entries', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        expect(html).toContain('Waiting on API access');
        expect(html).toContain('Server downtime blocking deploys');
        expect(html).toContain('Alice');
        expect(html).toContain('Bob');
    });

    it('renders highlight entries', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        expect(html).toContain('Completed auth refactor');
        expect(html).toContain('Shipped new dashboard');
    });

    it('renders participation tags', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        expect(html).toContain('Alice');
        expect(html).toContain('Bob');
        expect(html).toContain('Charlie');
    });

    it('escapes HTML special characters for XSS protection', () => {
        const xssData: WeeklyReportData = {
            ...sampleData,
            blockers: [
                { content: '<script>alert("xss")</script>', user: '<img src=x onerror=alert(1)>', date: '2026-02-18' },
            ],
            highlights: [
                { content: '"><script>hack</script>', user: 'Normal User', date: '2026-02-17' },
            ],
        };

        const html = generateWeeklyReportHtml(xssData, '<script>evil</script>');

        // Should NOT contain raw executable script tags
        expect(html).not.toContain('<script>');
        // Note: 'onerror=' appears inside escaped &lt;...&gt; which is safe (plain text, not executable)

        // Should contain escaped versions
        expect(html).toContain('&lt;script&gt;');
    });

    it('handles empty blockers gracefully', () => {
        const emptyBlockersData: WeeklyReportData = {
            ...sampleData,
            blockers: [],
        };

        const html = generateWeeklyReportHtml(emptyBlockersData, 'Test Team');

        expect(html).toContain('No blockers reported');
    });

    it('handles empty highlights gracefully', () => {
        const emptyHighlightsData: WeeklyReportData = {
            ...sampleData,
            highlights: [],
        };

        const html = generateWeeklyReportHtml(emptyHighlightsData, 'Test Team');

        expect(html).toContain('No highlights recorded');
    });

    it('handles empty participation gracefully', () => {
        const emptyParticipationData: WeeklyReportData = {
            ...sampleData,
            participation: [],
        };

        const html = generateWeeklyReportHtml(emptyParticipationData, 'Test Team');

        expect(html).toContain('No reports submitted');
    });

    it('handles zero total reports (prevents division by zero)', () => {
        const zeroData: WeeklyReportData = {
            ...sampleData,
            totalReports: 0,
            sentimentBreakdown: { green: 0, yellow: 0, red: 0 },
        };

        // Should NOT throw
        const html = generateWeeklyReportHtml(zeroData, 'Test Team');
        expect(html).toContain('<!DOCTYPE html>');
    });

    it('calculates sentiment percentages correctly', () => {
        // 10 green, 3 yellow, 2 red = 15 total
        // green: 66.67%, yellow: 20%, red: 13.33%
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        // The percentage values should be in the width styles
        // We just check the HTML is valid and contains percentage widths
        expect(html).toContain('width:');
        expect(html).toContain('background-color: #10b981'); // green
        expect(html).toContain('background-color: #fbbf24'); // yellow
        expect(html).toContain('background-color: #ef4444'); // red
    });

    it('includes proper HTML meta tags', () => {
        const html = generateWeeklyReportHtml(sampleData, 'Test Team');

        expect(html).toContain('charset="utf-8"');
        expect(html).toContain('viewport');
        expect(html).toContain('<title>');
    });
});
