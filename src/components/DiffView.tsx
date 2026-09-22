import React, { useState } from 'react';
import type { DiffRow, DiffMode } from './diff';

// Renders the rows from ./diff side by side or unified. The PR review board used to
// print an edit's whole old snippet in red and then its whole new snippet in green - no
// diff at all - and the job page printed the entire new file once per edit row.

export const DiffModeToggle: React.FC<{ mode: DiffMode; onChange: (m: DiffMode) => void }> = ({ mode, onChange }) => (
  <div style={{ display: 'inline-flex', border: '1px solid var(--panel-border)', borderRadius: '6px', overflow: 'hidden', fontSize: '0.8rem' }}>
    {(['split', 'unified'] as DiffMode[]).map(m => (
      <button
        key={m}
        onClick={() => onChange(m)}
        style={{
          padding: '4px 12px', border: 'none', cursor: 'pointer', fontWeight: 600,
          background: mode === m ? 'var(--accent-brown)' : 'white',
          color: mode === m ? 'white' : 'var(--text-secondary)'
        }}
      >
        {m === 'split' ? 'Side by side' : 'Unified'}
      </button>
    ))}
  </div>
);

const C = {
  delBg: '#ffebe9', delText: '#82071e', addBg: '#e6ffec', addText: '#116329',
  gutter: '#999', gutterBg: '#fafafa', empty: '#f6f8fa', gapBg: '#f1f8ff', gapText: '#0969da'
};
const cell: React.CSSProperties = { padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', verticalAlign: 'top' };
const num: React.CSSProperties = { width: '44px', padding: '0 8px', textAlign: 'right', color: C.gutter, background: C.gutterBg, userSelect: 'none', verticalAlign: 'top' };

export const DiffView: React.FC<{ rows: DiffRow[]; mode: DiffMode }> = ({ rows, mode }) => {
  const [open, setOpen] = useState<Set<number>>(new Set());
  if (!rows.length) return <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No line changes.</div>;

  // Expanded gaps put their hidden rows back in place.
  const visible: { row: DiffRow; gapIndex?: number }[] = [];
  rows.forEach((r, i) => {
    if (r.kind === 'gap' && open.has(i) && r.rows) r.rows.forEach(h => visible.push({ row: h }));
    else visible.push({ row: r, gapIndex: r.kind === 'gap' ? i : undefined });
  });

  const gapRow = (r: Extract<DiffRow, { kind: 'gap' }>, gapIndex: number, colSpan: number, key: string) => (
    <tr key={key} style={{ background: C.gapBg }}>
      <td colSpan={colSpan} style={{ padding: '2px 12px', color: C.gapText, fontSize: '0.78rem' }}>
        {r.rows ? (
          <button
            onClick={() => setOpen(prev => new Set(prev).add(gapIndex))}
            style={{ background: 'none', border: 'none', color: C.gapText, cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            ⋯ {r.hidden} unchanged line{r.hidden === 1 ? '' : 's'} (show)
          </button>
        ) : (
          <span>⋯ {r.hidden} unchanged line{r.hidden === 1 ? '' : 's'}{r.label ? ` · ${r.label}` : ''}</span>
        )}
      </td>
    </tr>
  );

  const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.45' };

  if (mode === 'unified') {
    return (
      <table style={table}>
        <colgroup><col style={{ width: '44px' }} /><col style={{ width: '44px' }} /><col style={{ width: '18px' }} /><col /></colgroup>
        <tbody>
          {visible.map(({ row: r, gapIndex }, k) => {
            if (r.kind === 'gap') return gapRow(r, gapIndex!, 4, `g${k}`);
            const bg = r.kind === 'del' ? C.delBg : r.kind === 'add' ? C.addBg : undefined;
            const fg = r.kind === 'del' ? C.delText : r.kind === 'add' ? C.addText : 'var(--text-primary)';
            return (
              <tr key={k} style={{ background: bg }}>
                <td style={num}>{r.kind !== 'add' ? r.oldNo : ''}</td>
                <td style={num}>{r.kind !== 'del' ? r.newNo : ''}</td>
                <td style={{ ...cell, color: fg, padding: '0 4px' }}>{r.kind === 'del' ? '-' : r.kind === 'add' ? '+' : ' '}</td>
                <td style={{ ...cell, color: fg }}>{r.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // Side by side: a change block's removed lines pair up with its added lines.
  const out: React.ReactNode[] = [];
  let k = 0;
  while (k < visible.length) {
    const { row: r, gapIndex } = visible[k];
    if (r.kind === 'gap') { out.push(gapRow(r, gapIndex!, 4, `g${k}`)); k++; continue; }
    if (r.kind === 'ctx') {
      out.push(
        <tr key={`c${k}`}>
          <td style={num}>{r.oldNo}</td><td style={{ ...cell, color: 'var(--text-primary)' }}>{r.text}</td>
          <td style={{ ...num, borderLeft: '1px solid var(--panel-border)' }}>{r.newNo}</td><td style={{ ...cell, color: 'var(--text-primary)' }}>{r.text}</td>
        </tr>
      );
      k++; continue;
    }
    const dels: Extract<DiffRow, { kind: 'del' }>[] = [], adds: Extract<DiffRow, { kind: 'add' }>[] = [];
    while (k < visible.length && (visible[k].row.kind === 'del' || visible[k].row.kind === 'add')) {
      const x = visible[k].row;
      if (x.kind === 'del') dels.push(x); else if (x.kind === 'add') adds.push(x);
      k++;
    }
    for (let p = 0; p < Math.max(dels.length, adds.length); p++) {
      const d = dels[p], a = adds[p];
      out.push(
        <tr key={`b${k}-${p}`}>
          <td style={{ ...num, background: d ? C.delBg : C.empty }}>{d ? d.oldNo : ''}</td>
          <td style={{ ...cell, background: d ? C.delBg : C.empty, color: C.delText }}>{d ? d.text : ''}</td>
          <td style={{ ...num, borderLeft: '1px solid var(--panel-border)', background: a ? C.addBg : C.empty }}>{a ? a.newNo : ''}</td>
          <td style={{ ...cell, background: a ? C.addBg : C.empty, color: C.addText }}>{a ? a.text : ''}</td>
        </tr>
      );
    }
  }
  return (
    <table style={table}>
      <colgroup><col style={{ width: '44px' }} /><col /><col style={{ width: '44px' }} /><col /></colgroup>
      <tbody>{out}</tbody>
    </table>
  );
};
