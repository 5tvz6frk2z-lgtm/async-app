// Split a markdown memory into sections by heading, so retrieval can pull ONLY
// the section that answers — never the whole file. A section is a heading plus
// the lines under it up to the next heading.
export function splitSections(md) {
  const lines = String(md || '').split('\n');
  const sections = [];
  let cur = { heading: '(intro)', level: 0, lines: [] };
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      if (cur.lines.some((l) => l.trim()) || cur.heading !== '(intro)') sections.push(cur);
      cur = { heading: m[2].trim(), level: m[1].length, lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  sections.push(cur);
  return sections
    .map((s) => ({ heading: s.heading, level: s.level, text: s.lines.join('\n').trim() }))
    .filter((s) => s.text || s.heading !== '(intro)');
}

/** Inline pointers: [[memory-id]] references inside a section body. */
export function inlinePointers(text) {
  return [...String(text || '').matchAll(/\[\[([a-z0-9][a-z0-9-]*)\]\]/g)].map((m) => m[1]);
}
