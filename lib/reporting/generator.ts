
import { WeeklyReportData } from "@/lib/reporting/aggregator";

export function generateWeeklyReportHtml(data: WeeklyReportData, teamName: string): string {
  // Helpers - comprehensive escaping to prevent XSS
  const escape = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const safeNum = (n: number) => String(n).replace(/[^0-9.]/g, ''); // Only allow numbers and decimal point

  const totalSentiment = data.sentimentBreakdown.green + data.sentimentBreakdown.yellow + data.sentimentBreakdown.red || 1;
  const greenPct = (data.sentimentBreakdown.green / totalSentiment) * 100;
  const yellowPct = (data.sentimentBreakdown.yellow / totalSentiment) * 100;
  const redPct = (data.sentimentBreakdown.red / totalSentiment) * 100;

  // Components as Strings
  const pulseBar = `
    <div class="h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex" style="display: flex; height: 16px; border-radius: 9999px; overflow: hidden; background-color: #f4f4f5; width: 100%;">
      ${greenPct > 0 ? `<div style="width: ${safeNum(greenPct)}%; background-color: #10b981;"></div>` : ''}
      ${yellowPct > 0 ? `<div style="width: ${safeNum(yellowPct)}%; background-color: #fbbf24;"></div>` : ''}
      ${redPct > 0 ? `<div style="width: ${safeNum(redPct)}%; background-color: #ef4444;"></div>` : ''}
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #71717a; margin-top: 8px;">
      <span>${safeNum(data.sentimentBreakdown.green)} Positive</span>
      <span>${safeNum(data.sentimentBreakdown.yellow)} Neutral</span>
      <span>${safeNum(data.sentimentBreakdown.red)} Struggling</span>
    </div>
  `;

  const highlightsList = data.highlights.length === 0
    ? `<p style="font-style: italic; color: #71717a;">No highlights recorded this week.</p>`
    : `<ul style="padding-left: 0; list-style: none;">
        ${data.highlights.map(item => `
          <li style="margin-bottom: 8px; font-size: 14px;">
            <span style="font-weight: 500; color: #18181b;">${escape(item.user)}:</span>
            <span style="color: #52525b;">${escape(item.content)}</span>
          </li>
        `).join('')}
      </ul>`;

  const blockersList = data.blockers.length === 0
    ? `<p style="font-style: italic; color: #71717a;">No blockers reported.</p>`
    : `<ul style="padding-left: 0; list-style: none;">
        ${data.blockers.map(item => `
          <li style="margin-bottom: 8px; padding: 12px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; font-size: 14px;">
            <span style="font-weight: 500; color: #7f1d1d;">${escape(item.user)}:</span>
            <span style="color: #b91c1c;">${escape(item.content)}</span>
          </li>
        `).join('')}
      </ul>`;

  const participationTags = data.participation.length === 0
    ? `<p style="font-size: 14px; color: #71717a;">No reports submitted.</p>`
    : `<div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${data.participation.map(p => `
          <div style="padding: 4px 12px; background-color: #f4f4f5; border-radius: 9999px; font-size: 12px; font-weight: 500; color: #3f3f46; display: inline-flex; align-items: center; gap: 4px;">
            ${escape(p.user)}
            <span style="background-color: #e4e4e7; padding: 0 6px; border-radius: 9999px; font-size: 10px;">${safeNum(p.count)}</span>
          </div>
        `).join('')}
      </div>`;

  // Full Template
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Report: ${escape(teamName)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 20px; margin: 0; }
          .container { max-width: 800px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { background-color: #fafafa; padding: 32px; border-bottom: 1px solid #e4e4e7; }
          .content { padding: 32px; }
          h1 { margin: 0 0 8px 0; font-size: 24px; color: #18181b; }
          h2 { font-size: 18px; font-weight: 600; color: #18181b; margin-bottom: 16px; margin-top: 0; }
          p.meta { margin: 0; color: #71717a; }
          .section { margin-bottom: 32px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
          @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weekly Roll-Up: ${escape(teamName)}</h1>
            <p class="meta">${data.startDate} — ${data.endDate}</p>
          </div>
          
          <div class="content">
            <!-- Pulse -->
            <div class="section">
              <h2>Team Pulse</h2>
              ${pulseBar}
            </div>

            <div class="grid">
              <!-- Highlights -->
              <div class="section">
                <h2>Key Highlights</h2>
                ${highlightsList}
              </div>

              <!-- Blockers -->
              <div class="section">
                <h2>Blockers & Risks</h2>
                ${blockersList}
              </div>
            </div>

            <!-- Participation -->
            <div class="section" style="margin-bottom: 0; padding-top: 32px; border-top: 1px solid #f4f4f5;">
              <h2>Participation</h2>
              ${participationTags}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
