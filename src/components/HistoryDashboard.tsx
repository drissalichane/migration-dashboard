import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, PlayCircle, GitMerge, FileCode, Archive } from 'lucide-react';

interface MigrationJob {
  id: number;
  repositoryUrl: string;
  status: string;
  createdAt: string;
  branchName?: string;
  prUrl?: string;
  commitHash?: string;
  targetBranch?: string;
  targetFramework?: string;
  sourceFramework?: string;
  isArchived?: boolean;
}

const HistoryDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const navigate = useNavigate();

  const fetchJobs = () => {
    setLoading(true);
    fetch('http://localhost:5153/api/migrationjob', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
      .then(r => r.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleBulkArchive = async () => {
    if (selectedJobs.length === 0) return;
    setIsArchiving(true);
    try {
      const res = await fetch('http://localhost:5153/api/migrationjob/bulk-archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({ jobIds: selectedJobs })
      });
      if (res.ok) {
        setSelectedJobs([]);
        fetchJobs();
      }
    } catch (e) {
      console.error('Failed to bulk archive jobs', e);
    } finally {
      setIsArchiving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('Failed')) return <XCircle color="var(--danger)" size={18} />;
    if (status.includes('Approved') || status.includes('Done')) return <CheckCircle color="var(--success)" size={18} />;
    return <PlayCircle color="var(--warning)" size={18} />;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status.includes('Failed')) return { background: '#ffebe9', color: '#cf222e' };
    if (status.includes('Approved') || status.includes('Done')) return { background: '#e6f4ea', color: '#1a7f37' };
    return { background: '#fff8c5', color: '#9a6700' };
  };

  const displayedJobs = jobs.filter(j => showArchived || !j.isArchived);
  const allDisplayedIds = displayedJobs.map(j => j.id);
  const isAllSelected = displayedJobs.length > 0 && selectedJobs.length === displayedJobs.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs([...allDisplayedIds]);
    }
  };

  const toggleSelectJob = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (selectedJobs.includes(id)) {
      setSelectedJobs(selectedJobs.filter(jId => jId !== id));
    } else {
      setSelectedJobs([...selectedJobs, id]);
    }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
          <Clock size={20} /> Migration History
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {selectedJobs.length > 0 && (
            <button 
              className="btn btn-secondary" 
              onClick={handleBulkArchive}
              disabled={isArchiving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px' }}
            >
              <Archive size={16} />
              {isArchiving ? 'Archiving...' : `Archive Selected (${selectedJobs.length})`}
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setSelectedJobs([]); // Reset selection when toggling view
              }} 
              style={{ cursor: 'pointer' }}
            />
            Show Archived Jobs
          </label>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading history...</p>
      ) : displayedJobs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No migration jobs found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header row for Select All */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 8px 16px', gap: '16px' }}>
            <input 
              type="checkbox" 
              checked={isAllSelected}
              onChange={toggleSelectAll}
              style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select All</span>
          </div>

          {displayedJobs.map(job => (
            <div 
              key={job.id} 
              className="glass-panel" 
              onClick={() => navigate(`/jobs/${job.id}`)}
              style={{ 
                padding: '16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid var(--panel-border)',
                backgroundColor: selectedJobs.includes(job.id) ? 'rgba(92, 107, 192, 0.05)' : 'var(--bg-primary)'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-brown)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--panel-border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input 
                  type="checkbox" 
                  checked={selectedJobs.includes(job.id)}
                  onChange={() => {}} // handled by div click
                  onClick={(e) => toggleSelectJob(e, job.id)}
                  style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCode size={16} />
                    {job.repositoryUrl ? job.repositoryUrl.replace('https://github.com/', '').replace('.git', '') : 'Unknown Repository'}
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: '#f0f0f0', fontWeight: 400 }}>
                      Job #{job.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {new Date(job.createdAt).toLocaleString()}
                    {job.targetBranch && <span style={{ marginLeft: '12px' }}>Branch: <strong>{job.targetBranch}</strong></span>}
                    {job.targetFramework && (
                      <span style={{ marginLeft: '12px' }}>
                        Version: <strong>{job.sourceFramework || 'Unknown'} ➔ {job.targetFramework}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {job.prUrl && (
                  <a 
                    href={job.prUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-purple)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}
                  >
                    <GitMerge size={16} /> View PR
                  </a>
                )}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.85rem', 
                  padding: '4px 12px',
                  borderRadius: '16px',
                  ...getStatusBadgeStyle(job.status)
                }}>
                  {getStatusIcon(job.status)} {job.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryDashboard;
