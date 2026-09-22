import React, { useState, useEffect, useMemo } from 'react';
import { FileCode, CheckSquare, ChevronDown, ChevronRight, Edit3, Save } from 'lucide-react';
import { DiffView, DiffModeToggle } from './DiffView';
import { useDiffMode, diffLines, countChanges } from './diff';

interface Props {
  show: boolean;
  onApprove: (jobId: number, edits: any[]) => void;
  status: 'pending' | 'approved';
  jobId: number | null;
  onReject?: (jobId: number, edits: any[]) => void;
  jobStatus?: string;
}

interface FileChange {
  id: number;
  filePath: string;
  action: string;
  targetContent: string;
  replacementContent: string;
  accepted: boolean;

  // UI specific
  selected: boolean;
  rawNewCode: string;
}

const MigrationPlanBoard: React.FC<Props> = ({ show, onApprove, onReject, status, jobStatus, jobId }) => {
  const [files, setFiles] = useState<FileChange[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);
  const [editingFile, setEditingFile] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchJobData = () => {
    if (!show || !jobId) return;
    setLoading(true);
    setLoadError(false);
    fetch('http://localhost:5153/api/migrationjob', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(r => r.json())
    .then(data => {
      const job = data.find((j: any) => j.id === jobId);
      if (job) {
          const formattedFiles = job.fileChanges.map((fc: any) => ({
            ...fc,
            // A saved draft ("Reject & Save") records unticked edits; showing them all
            // ticked again would silently re-apply them on "Create PR".
            selected: fc.accepted,
            rawNewCode: fc.replacementContent
          }));
          setFiles(formattedFiles);
          setExpandedFiles(formattedFiles.map((f: any) => f.filePath));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setLoadError(true);
      });
  };

  useEffect(() => {
    fetchJobData();
  }, [show, jobId]);

  const [diffMode, setDiffMode] = useDiffMode();
  // Against the reviewer's text (rawNewCode), so a hand edit shows as a change.
  const rowsById = useMemo(() => new Map(files.map(f => [f.id, diffLines(f.targetContent, f.rawNewCode)])), [files]);

  if (!show) return null;

  const toggleSelect = (id: number) => {
    setFiles(files.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const toggleExpand = (filePath: string) => {
    setExpandedFiles(prev => prev.includes(filePath) ? prev.filter(f => f !== filePath) : [...prev, filePath]);
  };

  const startEdit = (file: FileChange) => {
    setEditingFile(file.id);
    setEditBuffer(file.rawNewCode);
  };

  const saveEdit = (id: number) => {
    setFiles(files.map(f => f.id === id ? { ...f, rawNewCode: editBuffer } : f));
    setEditingFile(null);
  };

  const handleRejectClick = () => {
    if (!jobId || !onReject) return;
    const edits = files.map(f => ({
      fileChangeId: f.id,
      accepted: f.selected,
      manualReplacement: f.rawNewCode !== f.replacementContent ? f.rawNewCode : ''
    }));
    onReject(jobId, edits);
  };

  const handleApproveClick = () => {
    if (!jobId) return;
    const edits = files.map(f => ({
      fileChangeId: f.id,
      accepted: f.selected,
      manualReplacement: f.rawNewCode !== f.replacementContent ? f.rawNewCode : ''
    }));
    onApprove(jobId, edits);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
      {status === 'pending' && jobStatus === 'Rejected' && (
        <div className="glass-panel" style={{ padding: '24px', background: '#e0f2fe', borderLeft: '4px solid #0ea5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#0ea5e9', marginBottom: '4px', margin: 0 }}>Draft Saved</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>The migration has been rejected but the edits are saved as a draft. You can continue editing or create a PR when ready.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary" onClick={handleApproveClick} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} /> Create PR
            </button>
          </div>
        </div>
      )}
      
      {status === 'pending' && jobStatus !== 'Rejected' && (
        <div className="glass-panel" style={{ padding: '24px', background: '#fffbeb', borderLeft: '4px solid var(--warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Manager Review Required</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Please review the line-by-line diffs below. Uncheck files to ignore them, or edit the proposed code before approving.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleRejectClick} style={{ background: 'white', border: '1px solid var(--panel-border)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} color="#0ea5e9"/> Reject & Save
            </button>
            <button className="btn-primary" onClick={handleApproveClick} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} /> Approve Selected
            </button>
          </div>
        </div>
      )}

      {status === 'approved' && (
        <div className="glass-panel" style={{ padding: '24px', background: '#e6f4ea', borderLeft: '4px solid #1a7f37', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#1a7f37', marginBottom: '4px', margin: 0 }}>Pull Request Created Successfully</h3>
            <p style={{ color: '#1a7f37', opacity: 0.9, fontSize: '0.95rem', margin: '4px 0 0 0', maxWidth: '600px' }}>
              The code changes have been pushed and a PR has been opened on GitHub. 
              <strong>Please proceed to the Migration Job page for your final review</strong>. From there, you can read the LLM Execution Report and merge the Pull Request directly.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = `/jobs/${jobId}`} 
            style={{ 
              background: '#1a7f37', color: 'white', padding: '10px 20px', 
              borderRadius: '8px', fontWeight: 600, border: 'none', 
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(26, 127, 55, 0.2)' 
            }}
          >
             View Migration Job &rarr;
          </button>
        </div>
      )}

        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--panel-border)', background: 'var(--panel-header)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontWeight: 600 }}>Pull Request Diffs</h3>
            {loading && <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</span>}
            <span style={{ marginLeft: 'auto' }}><DiffModeToggle mode={diffMode} onChange={setDiffMode} /></span>
            {loadError && (
              <button 
                onClick={fetchJobData} 
                style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '0.8rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Retry Loading
              </button>
            )}
          </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px' }}>
          {files.map(f => {
            const isExpanded = expandedFiles.includes(f.filePath);
            const isEditing = editingFile === f.id;

            return (
              <div key={f.id} style={{ border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f4f1', padding: '12px 16px', borderBottom: isExpanded ? '1px solid var(--panel-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={f.selected} 
                      onChange={() => toggleSelect(f.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-brown)' }} 
                    />
                    <button 
                      onClick={() => toggleExpand(f.filePath)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--text-primary)' }}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      {f.filePath}
                    </button>
                    {(() => {
                      const c = countChanges(rowsById.get(f.id) || []);
                      return (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          <span style={{ color: '#1a7f37' }}>+{c.added}</span>{' '}
                          <span style={{ color: '#cf222e' }}>−{c.removed}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {status === 'pending' && (
                      isEditing ? (
                        <button onClick={() => saveEdit(f.id)} style={{ background: '#e6f4ea', border: '1px solid #bce3c6', color: '#0d652d', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <Save size={14} /> Save Edit
                        </button>
                      ) : (
                        <button onClick={() => startEdit(f)} style={{ background: 'white', border: '1px solid var(--panel-border)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <Edit3 size={14} /> Edit File
                        </button>
                      )
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: '#ffffff', overflowX: 'auto' }}>
                    {isEditing ? (
                      <textarea 
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        style={{ width: '100%', minHeight: '150px', padding: '16px', background: '#fafafa', border: 'none', fontFamily: 'monospace', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                        spellCheck={false}
                      />
                    ) : (
                      <DiffView rows={rowsById.get(f.id) || []} mode={diffMode} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MigrationPlanBoard;
