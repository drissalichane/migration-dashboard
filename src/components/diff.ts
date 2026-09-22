import { useState } from 'react';

// The diff logic behind DiffView: a real line diff with long unchanged runs collapsed,
// and a parser for the unified diff /api/files/diff returns. Kept apart from the
// components so Vite's fast refresh keeps working on DiffView.tsx.

export type DiffRow =
  | { kind: 'ctx'; oldNo: number; newNo: number; text: string }
  | { kind: 'del'; oldNo: number; text: string }
  | { kind: 'add'; newNo: number; text: string }
  | { kind: 'gap'; hidden: number; rows?: DiffRow[]; label?: string };

export type DiffMode = 'split' | 'unified';

const splitLines = (s: string) => {
  if (!s) return [];   // no text is no lines, not one empty line (a newly created file)
  const lines = String(s).replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
};

// Longest common subsequence over lines. Snippets are small; a whole-file edit of a
// few thousand lines is still fine. Past that the middle is shown as one replace.
export function diffLines(oldText: string, newText: string, context = 3): DiffRow[] {
  const a = splitLines(oldText), b = splitLines(newText);
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const am = a.slice(pre, a.length - suf), bm = b.slice(pre, b.length - suf);

  const rows: DiffRow[] = [];
  for (let i = 0; i < pre; i++) rows.push({ kind: 'ctx', oldNo: i + 1, newNo: i + 1, text: a[i] });
  if (am.length * bm.length <= 4_000_000) {
    const n = am.length, m = bm.length;
    const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        lcs[i][j] = am[i] === bm[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && am[i] === bm[j]) { rows.push({ kind: 'ctx', oldNo: pre + i + 1, newNo: pre + j + 1, text: am[i] }); i++; j++; }
      else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) { rows.push({ kind: 'add', newNo: pre + j + 1, text: bm[j] }); j++; }
      else { rows.push({ kind: 'del', oldNo: pre + i + 1, text: am[i] }); i++; }
    }
  } else {
    am.forEach((t, k) => rows.push({ kind: 'del', oldNo: pre + k + 1, text: t }));
    bm.forEach((t, k) => rows.push({ kind: 'add', newNo: pre + k + 1, text: t }));
  }
  for (let k = 0; k < suf; k++) {
    rows.push({ kind: 'ctx', oldNo: a.length - suf + k + 1, newNo: b.length - suf + k + 1, text: a[a.length - suf + k] });
  }
  return collapse(rows, context);
}

// Keep `context` unchanged lines around each change; fold the rest into an
// expandable gap.
function collapse(rows: DiffRow[], context: number): DiffRow[] {
  const out: DiffRow[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].kind !== 'ctx') { out.push(rows[i++]); continue; }
    let j = i;
    while (j < rows.length && rows[j].kind === 'ctx') j++;
    const run = rows.slice(i, j);
    const keepHead = i === 0 ? 0 : context;
    const keepTail = j === rows.length ? 0 : context;
    if (run.length > keepHead + keepTail + 1) {
      out.push(...run.slice(0, keepHead));
      const hidden = run.slice(keepHead, run.length - keepTail);
      out.push({ kind: 'gap', hidden: hidden.length, rows: hidden });
      out.push(...run.slice(run.length - keepTail));
    } else {
      out.push(...run);
    }
    i = j;
  }
  // A diff with no change at all: show it as one fold rather than nothing.
  return out;
}

export interface ParsedFile { path: string; added: number; removed: number; rows: DiffRow[]; binary?: boolean }

// `git diff` output, as /api/files/diff returns it, into per-file rows. git already
// keeps three lines of context per hunk; the lines between hunks become gaps.
export function parseUnifiedDiff(diff: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  let cur: ParsedFile | null = null;
  let oldNo = 0, newNo = 0, lastOld = 0;
  for (const line of String(diff ?? '').replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('diff --git ')) {
      const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      cur = { path: m ? m[2] : line.slice(11), added: 0, removed: 0, rows: [] };
      files.push(cur); lastOld = 0;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('Binary files')) { cur.binary = true; continue; }
    const h = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (h) {
      oldNo = Number(h[1]); newNo = Number(h[2]);
      const hidden = oldNo - 1 - lastOld;
      if (hidden > 0) cur.rows.push({ kind: 'gap', hidden, label: h[3].trim() || undefined });
      continue;
    }
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ') || line.startsWith('new file') ||
        line.startsWith('deleted file') || line.startsWith('similarity') || line.startsWith('rename ') || line.startsWith('old mode') ||
        line.startsWith('new mode') || line.startsWith('\\ No newline')) continue;
    if (line.startsWith('+')) { cur.rows.push({ kind: 'add', newNo: newNo++, text: line.slice(1) }); cur.added++; }
    else if (line.startsWith('-')) { cur.rows.push({ kind: 'del', oldNo: oldNo++, text: line.slice(1) }); cur.removed++; lastOld = oldNo - 1; }
    else if (line.startsWith(' ')) { cur.rows.push({ kind: 'ctx', oldNo: oldNo++, newNo: newNo++, text: line.slice(1) }); lastOld = oldNo - 1; }
  }
  return files;
}

export const countChanges = (rows: DiffRow[]) => rows.reduce(
  (c, r) => r.kind === 'add' ? { ...c, added: c.added + 1 } : r.kind === 'del' ? { ...c, removed: c.removed + 1 } : c,
  { added: 0, removed: 0 });

// Split by default where there is room for two columns; the choice is remembered.
export function useDiffMode(): [DiffMode, (m: DiffMode) => void] {
  const [mode, setModeState] = useState<DiffMode>(() => {
    try {
      const saved = localStorage.getItem('diff_view_mode');
      if (saved === 'split' || saved === 'unified') return saved;
    } catch { /* storage unavailable */ }
    return typeof window !== 'undefined' && window.innerWidth >= 1100 ? 'split' : 'unified';
  });
  const setMode = (m: DiffMode) => {
    setModeState(m);
    try { localStorage.setItem('diff_view_mode', m); } catch { /* storage unavailable */ }
  };
  return [mode, setMode];
}
