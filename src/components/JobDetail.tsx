import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, Clock, AlertCircle, FileText, CheckSquare, Search, Terminal, Activity, CheckCircle2,
  Archive, RefreshCcw, XCircle, PlayCircle, GitMerge, GitBranch,
  FileCode, Package, AlertTriangle, ExternalLink, Info,
  ChevronDown, ChevronRight, Lightbulb, BookOpen, X, GitCommit, RefreshCw, Users, User
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PlanReview } from './PlanReview';
import MigrationPlanBoard from './MigrationPlanBoard';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface CommitDetail extends Commit {
  files: {
    filename: string;
    status: string;
    patch: string;
    additions: number;
    deletions: number;
    changes: number;
  }[];
}

interface FileChange {
  id: number;
  filePath: string;
  action: string;
  targetContent: string;
  replacementContent: string;
  accepted: boolean;
}

interface MigrationJob {
  id: number;
  repositoryUrl: string;
  status: string;
  createdAt: string;
  createdBy: string;
  migrationPlanJson: string;
  branchName?: string;
  prUrl?: string;
  commitHash?: string;
  targetBranch?: string;
  targetCommit?: string;
  executionReport?: string;
  isArchived?: boolean;
  llmUsageLogs?: any[];
  nodeExecutionLogs?: any[];
  repositoryProfileJson?: string;
  migrationTasks?: any[];
  executionTimeMs?: number;
  phase1ExecutionTimeMs?: number;
  phase2ExecutionTimeMs?: number;
  phase1Success?: boolean;
  phase2Success?: boolean;
  initialErrorCount?: number;
  residualErrorCount?: number;
  errorFixerIterations?: number;
  successRate?: number;
  regressionRate?: number;
  approvalRecords?: any[];
  team?: any;
  assignedToUser?: any;
  mergeCommitSha?: string;
  revertPrUrl?: string;
  fileChanges: FileChange[];
}

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<MigrationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [prStatus, setPrStatus] = useState<'pending' | 'approved'>('pending');
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [isCommitsModalOpen, setIsCommitsModalOpen] = useState(false);
  const [jobCommits, setJobCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<CommitDetail | null>(null);
  const [loadingCommitDetails, setLoadingCommitDetails] = useState(false);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeMethod, setMergeMethod] = useState('squash');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeSuccess, setMergeSuccess] = useState('');
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [deleteBranch, setDeleteBranch] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [fileContents, setFileContents] = useState<{[key: string]: string}>({});
  const [loadingFiles, setLoadingFiles] = useState<{[key: string]: boolean}>({});
  const [githubAuthError, setGithubAuthError] = useState(false);
  const [ciStatus, setCiStatus] = useState<any>(null);
  const [loadingCi, setLoadingCi] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [revertError, setRevertError] = useState('');

  const [logs, setLogs] = useState<any[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(true);
  const terminalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    const fetchJob = () => {
      fetch(`http://localhost:5153/api/migrationjob/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
      })
        .then(r => r.json())
        .then(data => {
          setJob(data);
          try {
            if (data.migrationPlanJson) {
              setPlan(JSON.parse(data.migrationPlanJson));
            }
          } catch {}
          setLoading(false);
          if (!['Analyzing', 'Executing'].includes(data.status) && interval) {
            clearInterval(interval);
          }
        })
        .catch(() => setLoading(false));
    };

    fetchJob();
    interval = setInterval(fetchJob, 3000);

    return () => clearInterval(interval);
  }, [id]);

  const handleApprovePlan = () => {
    if (!job) return;
    fetch(`http://localhost:5153/api/migrationjob/${job.id}/execute`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(r => r.json())
    .then(data => {
      setJob(prev => prev ? { ...prev, status: 'Executing' } : null);
    })
    .catch(() => {});
  };

  const handleRejectCode = (jobId: number, edits: any[]) => {
    fetch(`http://localhost:5153/api/migrationjob/${jobId}/reject-save`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileEdits: edits })
    })
    .then(r => r.json())
    .then(data => {
      setJob(prev => prev ? { ...prev, status: 'Rejected' } : null);
    })
    .catch(() => {});
  };

  const handleApproveCode = (jobId: number, edits: any[]) => {
    setPrStatus('approved');
    fetch(`http://localhost:5153/api/migrationjob/${jobId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileEdits: edits })
    })
    .then(r => r.json())
    .then(data => {
      setJob(prev => prev ? { ...prev, status: 'Approved and PR Created', prUrl: data.prUrl } : null);
    })
    .catch(() => setPrStatus('pending'));
  };

  const fetchCiStatus = (intervalId?: any) => {
    if (!job || !job.mergeCommitSha) return;
    const repoParts = job.repositoryUrl.replace('https://github.com/', '').replace('.git', '').split('/');
    fetch(`http://localhost:5153/api/github/repos/${repoParts[0]}/${repoParts[1]}/commits/${job.mergeCommitSha}/status`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(r => r.json())
    .then(data => {
      setCiStatus(data);
      if ((data.state === 'success' || data.state === 'failure') && intervalId) {
        clearInterval(intervalId);
      }
    })
    .catch(() => {});
  };

  useEffect(() => {
    if (job?.mergeCommitSha && job.status.includes('Merged')) {
      fetchCiStatus();
      const interval = setInterval(() => {
        fetchCiStatus();
      }, 15000); // Poll every 15 seconds
      return () => clearInterval(interval);
    }
  }, [job?.mergeCommitSha, job?.status]);

  useEffect(() => {
    if (job && (job.status === 'Pending PR Merge' || job.status === 'Approved and PR Created' || job.status === 'Merged')) {
      const syncInterval = setInterval(() => {
        fetch(`http://localhost:5153/api/migrationjob/${job.id}/sync`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        })
          .then(r => r.json())
          .then(data => {
            setJob(prev => prev ? { ...prev, status: data.status, revertPrUrl: data.revertPrUrl } : null);
          })
          .catch(() => {});
      }, 30000); // 30 seconds

      return () => clearInterval(syncInterval);
    }
  }, [job?.status, job?.id]);

  useEffect(() => {
    if (!job) return;
    
    const fetchLogs = () => {
      fetch(`http://localhost:5153/api/migrationjob/${job.id}/logs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
      })
      .then(r => r.json())
      .then(data => setLogs(data))
      .catch(() => {});
    };
    
    fetchLogs(); // initial fetch
    
    if (['Executing', 'Pending Plan Approval', 'Analyzing'].includes(job.status)) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [job?.status, job?.id]);

  useEffect(() => {
    if (terminalRef.current && isTerminalExpanded) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isTerminalExpanded]);

  const fetchCommits = () => {
    if (!job || !job.branchName) return;
    setLoadingCommits(true);
    const repoParts = job.repositoryUrl.replace('https://github.com/', '').replace('.git', '').split('/');
    fetch(`http://localhost:5153/api/github/repos/${repoParts[0]}/${repoParts[1]}/commits?branch=${job.branchName}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(async r => {
        if (!r.ok) {
            const txt = await r.text();
            throw new Error(txt);
        }
        return r.json();
    })
    .then(data => {
        if (Array.isArray(data)) setJobCommits(data);
        setLoadingCommits(false);
    })
    .catch((err) => {
        if (err.message?.includes('Bad credentials') || err.message?.includes('Unauthorized')) setGithubAuthError(true);
        setLoadingCommits(false);
    });
  };

  const handleCommitClick = () => {
    setIsCommitsModalOpen(true);
    setSelectedCommit(null);
    if (jobCommits.length === 0) fetchCommits();
  };

  const handleCommitDetailClick = (sha: string) => {
    if (!job) return;
    setLoadingCommitDetails(true);
    const repoParts = job.repositoryUrl.replace('https://github.com/', '').replace('.git', '').split('/');
    fetch(`http://localhost:5153/api/github/repos/${repoParts[0]}/${repoParts[1]}/commits/${sha}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt);
      }
      return r.json();
    })
    .then(data => {
      setSelectedCommit(data);
      setLoadingCommitDetails(false);
    })
    .catch((err) => {
      if (err.message?.includes('Bad credentials') || err.message?.includes('Unauthorized')) setGithubAuthError(true);
      setLoadingCommitDetails(false);
    });
  };

  const renderPatch = (patch: string) => {
    if (!patch) return null;
    return patch.split('\n').map((line, idx) => {
      let color = 'inherit';
      let background = 'transparent';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        color = '#1a7f37';
        background = '#e6ffec';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        color = '#cf222e';
        background = '#ffebe9';
      } else if (line.startsWith('@@')) {
        color = '#0969da';
        background = '#ddf4ff';
      }
      return (
        <div key={idx} style={{ color, background, padding: '0 4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.5' }}>
          {line}
        </div>
      );
    });
  };

  const handleArchive = () => {
    if (!job) return;
    
    setIsArchiving(true);
    fetch(`http://localhost:5153/api/migrationjob/${job.id}/archive`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(r => r.json())
    .then(() => {
      navigate('/history');
    })
    .catch(() => setIsArchiving(false));
  };

  const handleSync = () => {
    if (!job) return;
    setIsSyncing(true);
    fetch(`http://localhost:5153/api/migrationjob/${job.id}/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt);
      }
      return r.json();
    })
    .then(data => {
      setIsSyncing(false);
      setJob(prev => prev ? {...prev, status: data.status, revertPrUrl: data.revertPrUrl || prev.revertPrUrl} : null);
    })
    .catch(err => {
      setIsSyncing(false);
      if (err.message?.includes('Bad credentials') || err.message?.includes('Unauthorized')) {
        setGithubAuthError(true);
      }
    });
  };

  const handleMerge = () => {
    const targetUrl = job?.revertPrUrl || job?.prUrl;
    if (!job || !targetUrl) return;
    const repoParts = job.repositoryUrl.replace('https://github.com/', '').replace('.git', '').split('/');
    const pullNumber = targetUrl.split('/').pop();
    
    setIsMerging(true);
    setMergeError('');
    fetch(`http://localhost:5153/api/github/repos/${repoParts[0]}/${repoParts[1]}/pulls/${pullNumber}/merge`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({ mergeMethod, jobId: job.id, deleteBranch })
    })
    .then(async r => {
        if (!r.ok) {
            const txt = await r.text();
            throw new Error(txt);
        }
        return r.json();
    })
    .then((data) => {
        setIsMerging(false);
        setMergeSuccess(data.message || 'Pull request merged successfully!');
        setTimeout(() => {
            setIsMergeModalOpen(false);
            window.location.reload();
        }, 2000);
    })
    .catch((err) => {
        setIsMerging(false);
        const errMsg = err.message || '';
        if (errMsg.includes('Bad credentials') || errMsg.includes('Unauthorized')) {
            setGithubAuthError(true);
            setIsMergeModalOpen(false);
        } else if (errMsg.toLowerCase().includes('conflict') || errMsg.includes('not mergeable')) {
            setIsConflictModalOpen(true);
            setIsMergeModalOpen(false);
        } else {
            setMergeError(errMsg);
        }
    });
  };

  const handleRevert = () => {
    if (!job || !job.prUrl) return;
    const repoParts = job.repositoryUrl.replace('https://github.com/', '').replace('.git', '').split('/');
    const pullNumber = job.prUrl.split('/').pop();
    
    setIsReverting(true);
    setRevertError('');
    fetch(`http://localhost:5153/api/github/repos/${repoParts[0]}/${repoParts[1]}/pulls/${pullNumber}/revert`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId: job.id })
    })
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt);
      }
      return r.json();
    })
    .then(data => {
      setIsReverting(false);
      setIsRevertModalOpen(false);
      if (data.url) {
        window.open(data.url, '_blank');
      }
    })
    .catch(err => {
      setIsReverting(false);
      const errMsg = err.message || '';
      const branchMatch = errMsg.match(/A pull request already exists for ([a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-/]+)/);
      if (branchMatch) {
        const branchName = branchMatch[1].split(':')[1];
        setRevertError(`A Revert PR has already been created for this migration (branch: ${branchName}).`);
      } else {
        setRevertError(errMsg);
      }
    });
  };

  const handleRestore = () => {
    if (!job || !job.revertPrUrl) return;
    const repoParts = job.repositoryUrl.replace('https://github.com/', '').replace('.git', '').split('/');
    const pullNumber = job.revertPrUrl.split('/').pop();

    setIsReverting(true);
    setRevertError('');
    fetch(`http://localhost:5153/api/github/repos/${repoParts[0]}/${repoParts[1]}/pulls/${pullNumber}/revert`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId: job.id })
    })
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt);
      }
      return r.json();
    })
    .then(data => {
      setIsReverting(false);
      setJob(prev => prev ? {...prev, prUrl: data.url, revertPrUrl: undefined, status: 'Pending PR Merge'} : null);
    })
    .catch(err => {
      setIsReverting(false);
      setRevertError(err.message || 'Failed to restore migration.');
    });
  };

    
  const renderFullFileDiff = (fullFileContent: string, fileChangesForPath: FileChange[]) => {
    if (!fullFileContent) return null;
    
    // We want to find where each replacement is in the full new file.
    // Since fileChangesForPath contains multiple changes, we process them line by line.
    const lines = fullFileContent.split('\n');
    const renderedLines = [];
    
    let i = 0;
    while (i < lines.length) {
      let matchedChange = null;
      
      // Check if current line starts a replacement block
      for (const fc of fileChangesForPath) {
        if (!fc.replacementContent) continue;
        const replacementLines = fc.replacementContent.split('\n');
        if (replacementLines.length === 0) continue;
        
        // Does it match starting at line i?
        let isMatch = true;
        for (let j = 0; j < replacementLines.length; j++) {
          if (i + j >= lines.length || lines[i + j].trim() !== replacementLines[j].trim()) {
            isMatch = false;
            break;
          }
        }
        
        if (isMatch) {
          matchedChange = fc;
          break;
        }
      }
      
      if (matchedChange) {
        // Render target content (removed) in red
        const targetLines = matchedChange.targetContent.split('\n');
        targetLines.forEach((tLine, index) => {
          renderedLines.push(
            <tr key={`del-${matchedChange.id}-${index}`} style={{ background: '#ffebe9' }}>
              <td style={{ width: '40px', padding: '0 10px', textAlign: 'right', color: '#999', borderRight: '1px solid #f0f0f0' }}></td>
              <td style={{ width: '20px', padding: '0 8px', color: '#cf222e' }}>-</td>
              <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#cf222e' }}>{tLine}</td>
            </tr>
          );
        });
        
        // Render replacement content (added) in green
        const replacementLines = matchedChange.replacementContent.split('\n');
        replacementLines.forEach((rLine, index) => {
          renderedLines.push(
            <tr key={`add-${matchedChange.id}-${index}`} style={{ background: '#e6ffec' }}>
              <td style={{ width: '40px', padding: '0 10px', textAlign: 'right', color: '#999', borderRight: '1px solid #f0f0f0' }}>{i + index + 1}</td>
              <td style={{ width: '20px', padding: '0 8px', color: '#1a7f37' }}>+</td>
              <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#1a7f37' }}>{rLine}</td>
            </tr>
          );
        });
        
        // Advance i by the number of replacement lines we just consumed
        i += replacementLines.length;
      } else {
        // Normal unchanged line
        renderedLines.push(
          <tr key={`unchanged-${i}`}>
            <td style={{ width: '40px', padding: '0 10px', textAlign: 'right', color: '#999', borderRight: '1px solid #f0f0f0' }}>{i + 1}</td>
            <td style={{ width: '20px', padding: '0 8px' }}></td>
            <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{lines[i]}</td>
          </tr>
        );
        i++;
      }
    }
    
    return renderedLines;
  };


  const toggleExpand = (filePath: string) => {
    const isCurrentlyExpanded = expandedFiles.includes(filePath);
    if (isCurrentlyExpanded) {
        setExpandedFiles(prev => prev.filter(f => f !== filePath));
    } else {
        setExpandedFiles(prev => [...prev, filePath]);
        if (!fileContents[filePath] && job?.branchName) {
            const repoParts = job.repositoryUrl.replace('https://github.com/', '').replace('.git', '').split('/');
            setLoadingFiles(prev => ({...prev, [filePath]: true}));
            fetch(`http://localhost:5153/api/github/repos/${repoParts[0]}/${repoParts[1]}/contents?path=${encodeURIComponent(filePath)}&refBranch=${job.branchName}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
            })
            .then(async r => {
                if (!r.ok) {
                    const txt = await r.text();
                    throw new Error(txt);
                }
                return r.json();
            })
            .then(data => {
                setFileContents(prev => ({...prev, [filePath]: data.content ? data.content : 'Failed to decode file.'}));
                setLoadingFiles(prev => ({...prev, [filePath]: false}));
            })
            .catch((err) => {
                if (err.message?.includes('Bad credentials') || err.message?.includes('Unauthorized')) setGithubAuthError(true);
                setFileContents(prev => ({...prev, [filePath]: 'Failed to fetch file.'}));
                setLoadingFiles(prev => ({...prev, [filePath]: false}));
            });
        }
    }
  };

  const getStatusStyle = (status: string) => {
    if (status.includes('Failed')) return { bg: '#ffebe9', color: '#cf222e', icon: <XCircle size={20} /> };
    if (status.includes('Approved') || status.includes('Done')) return { bg: '#e6f4ea', color: '#1a7f37', icon: <CheckCircle size={20} /> };
    return { bg: '#fff8c5', color: '#9a6700', icon: <PlayCircle size={20} /> };
  };

  if (loading) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading job details...</div>;
  }

  if (!job) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>Job not found.</div>;
  }

  const repoName = job.repositoryUrl?.replace('https://github.com/', '').replace('.git', '') || 'Unknown';
  const statusStyle = getStatusStyle(job.status);
  const isCompleted = job.status.includes('Approved') || job.status.includes('Done') || job.status.includes('Merged') || job.status.includes('Closed') || job.status.includes('Archived');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back button */}
      <button 
        onClick={() => navigate('/history')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '24px', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to Migration History
      </button>

      {githubAuthError && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', background: '#ffebe9', borderLeft: '4px solid #cf222e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#cf222e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> GitHub Session Expired
            </h3>
            <p style={{ margin: 0, color: '#cf222e', fontSize: '0.95rem' }}>Your GitHub access token has expired or is invalid. Please reconnect your account to view files and commits.</p>
          </div>
          <button 
            onClick={() => { localStorage.clear(); window.location.href = 'http://localhost:5153/api/auth/github'; }}
            style={{ background: '#cf222e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reconnect GitHub
          </button>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
              <FileCode size={24} />
              {repoName}
              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px', background: '#f0f0f0', fontWeight: 400 }}>
                Job #{job.id}
              </span>
            </h2>
            <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginTop: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> {new Date(job.createdAt).toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={14} /> {job.assignedToUser?.username || job.createdBy || 'Unknown User'}
              </span>
              {job.team && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} /> {job.team.name}
                </span>
              )}
              {job.branchName && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Source Migration Branch">
                  <GitBranch size={14} /> {job.branchName}
                </span>
              )}
              {job.targetBranch && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9a6700' }} title="Target Branch">
                  <ArrowLeft size={14} /> {job.targetBranch}
                </span>
              )}
              {job.commitHash && (
                <span style={{ fontFamily: 'monospace' }}>
                  Commit: <button onClick={handleCommitClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-purple)', textDecoration: 'underline', fontFamily: 'monospace', padding: 0 }}>{job.commitHash.substring(0, 7)}</button>
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '20px',
              background: statusStyle.bg, color: statusStyle.color,
              fontWeight: 600, fontSize: '0.9rem'
            }}>
              {statusStyle.icon} {job.status}
            </div>
            {ciStatus && ciStatus.totalCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 16px', borderRadius: '20px',
                background: ciStatus.state === 'success' ? '#e6f4ea' : ciStatus.state === 'failure' ? '#ffebe9' : '#fff8c5',
                color: ciStatus.state === 'success' ? '#1a7f37' : ciStatus.state === 'failure' ? '#cf222e' : '#9a6700',
                fontWeight: 600, fontSize: '0.9rem'
              }}>
                {ciStatus.state === 'success' ? <CheckCircle size={16} /> : ciStatus.state === 'failure' ? <XCircle size={16} /> : <RefreshCw size={16} className="spin-animation" />} 
                {ciStatus.state === 'success' ? 'Build Passing' : ciStatus.state === 'failure' ? 'Build Failing' : 'CI Running'}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
            {(job.status === 'Pending PR Merge' || job.status === 'Approved and PR Created') && (
              <button 
                onClick={() => setIsMergeModalOpen(true)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1a7f37, #238636)', color: 'white',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(26,127,55,0.2)'
                }}
              >
                <GitMerge size={16} /> Merge PR
              </button>
            )}
            {job.status === 'Reverted' && (
              <button 
                onClick={handleRestore}
                disabled={isReverting}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8250df, #6639ba)', color: 'white',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(130,80,223,0.2)',
                  opacity: isReverting ? 0.7 : 1
                }}
              >
                <RefreshCcw size={16} /> {isReverting ? 'Restoring...' : 'Restore Migration'}
              </button>
            )}
            {job.revertPrUrl && job.status !== 'Reverted' && (
              <button 
                onClick={() => setIsMergeModalOpen(true)}
                disabled={isReverting}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1a7f37, #238636)', color: 'white',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(26,127,55,0.2)',
                  opacity: isReverting ? 0.7 : 1
                }}
              >
                <GitMerge size={16} /> Merge Revert PR
              </button>
            )}
            {job.prUrl && job.status.includes('Merged') && !job.revertPrUrl && (
              <button 
                onClick={() => setIsRevertModalOpen(true)}
                disabled={isReverting}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #cf222e, #a40e26)', color: 'white',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(207,34,46,0.2)',
                  opacity: isReverting ? 0.7 : 1
                }}
              >
                <AlertTriangle size={16} /> {isReverting ? 'Reverting...' : 'Revert Migration'}
              </button>
            )}
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                background: 'transparent', color: '#57606a',
                border: '1px solid #d0d7de', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              <RefreshCw size={16} className={isSyncing ? 'spin' : ''} /> Sync
            </button>
            {(job.status.includes('Merged') || job.status.includes('Closed') || job.status === 'Reverted' || job.status.includes('Failed')) && !job.isArchived && (
              <button 
                onClick={() => setIsArchiveModalOpen(true)}
                disabled={isArchiving}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'transparent', color: '#cf222e',
                  border: '1px solid #cf222e', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
                  opacity: isArchiving ? 0.7 : 1,
                  marginLeft: 'auto'
                }}
              >
                <Archive size={16} /> Archive Job
              </button>
            )}
            {job.prUrl && (
              <a 
                href={job.prUrl} target="_blank" rel="noreferrer"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: job.revertPrUrl ? 'transparent' : 'var(--accent-purple)', 
                  color: job.revertPrUrl ? 'var(--text-secondary)' : 'white',
                  border: job.revertPrUrl ? '1px solid var(--border-color)' : 'none',
                  textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                <GitMerge size={16} /> {job.revertPrUrl ? 'View Original PR' : 'View Pull Request'} <ExternalLink size={14} />
              </a>
            )}
            {job.revertPrUrl && (
              <a 
                href={job.revertPrUrl} target="_blank" rel="noreferrer"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'var(--accent-purple)', color: 'white',
                  textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                <GitMerge size={16} /> View Revert PR <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

      {/* Plan Review rendering when Pending Plan Approval or Failed Execution */}
      {(job.status === 'Pending Plan Approval' || job.status === 'Failed Execution') && job.migrationPlanJson && (
        <div style={{ marginBottom: '24px' }}>
          <PlanReview planJson={job.migrationPlanJson} onApprove={handleApprovePlan} />
        </div>
      )}

      {(job.status === 'Pending PR Review' || job.status === 'Rejected') && (
        <div style={{ marginBottom: '24px' }}>
          <MigrationPlanBoard show={true} jobId={job.id} status={prStatus} onApprove={handleApproveCode} onReject={handleRejectCode} jobStatus={job.status} />
        </div>
      )}

      {/* Terminal UI */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px', display: 'flex', flexDirection: 'column' }}>
        <div 
          onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
          style={{ 
            padding: '12px 16px', background: '#24292f', color: '#f0f6fc', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', borderBottom: isTerminalExpanded ? '1px solid #30363d' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>_ Terminal</span>
            {logs.length > 0 && (
              <span style={{ fontSize: '0.8rem', background: '#30363d', padding: '2px 8px', borderRadius: '12px' }}>
                {logs.length} logs
              </span>
            )}
          </div>
          {isTerminalExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
        
        {isTerminalExpanded && (
          <div 
            ref={terminalRef}
            style={{ 
              background: '#0d1117', color: '#c9d1d9', padding: '16px', 
              fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6',
              maxHeight: '400px', overflowY: 'auto'
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: '#8b949e', fontStyle: 'italic' }}>Waiting for workflow logs...</div>
            ) : (
              logs.map((log, idx) => {
                const isExpanded = expandedLogs.includes(log.id);
                const hasDetails = !!log.details;
                return (
                <div key={idx} style={{ 
                  marginBottom: '4px', display: 'flex', gap: '12px',
                  borderLeft: log.level === 'error' ? '3px solid #ff7b72' : log.level === 'warning' ? '3px solid #d29922' : '3px solid transparent',
                  paddingLeft: log.level === 'error' || log.level === 'warning' ? '8px' : '11px',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', gap: '12px', cursor: hasDetails ? 'pointer' : 'default', userSelect: hasDetails ? 'none' : 'auto' }}
                       onClick={() => {
                         if (hasDetails) {
                           setExpandedLogs(prev => prev.includes(log.id) ? prev.filter(id => id !== log.id) : [...prev, log.id]);
                         }
                       }}>
                    <span style={{ color: '#8b949e', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {hasDetails && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                      {!hasDetails && <span style={{ width: '14px' }}></span>}
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {log.phase && <span style={{ color: '#79c0ff', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>[{log.phase}]</span>}
                      <span style={{ color: log.level === 'error' ? '#ff7b72' : log.level === 'warning' ? '#d29922' : '#c9d1d9' }}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                  {hasDetails && isExpanded && (
                    <div style={{ 
                      marginLeft: '86px', 
                      marginTop: '4px',
                      marginBottom: '8px',
                      padding: '12px', 
                      background: '#010409', 
                      border: '1px solid #30363d', 
                      borderRadius: '6px',
                      overflowX: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: '#c9d1d9'
                    }}>
                      {log.details}
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Quantitative Metrics */}
      {(job.executionTimeMs !== undefined && job.executionTimeMs !== null) && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Activity size={20} color="#0969da" /> Quantitative Metrics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: '4px solid #0969da' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Execution Time</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{(job.executionTimeMs / 1000).toFixed(1)}s</div>
            </div>
            
            {job.phase1ExecutionTimeMs != null && (
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: '4px solid #8250df' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Phase 1 (Analysis) Time</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{(job.phase1ExecutionTimeMs / 1000).toFixed(1)}s</div>
              </div>
            )}
            
            {job.phase2ExecutionTimeMs != null && (
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: '4px solid #2da44e' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Phase 2 (Migration) Time</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{(job.phase2ExecutionTimeMs / 1000).toFixed(1)}s</div>
              </div>
            )}
            
            {job.initialErrorCount != null && (
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: '4px solid #cf222e' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Initial Compilation Errors</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{job.initialErrorCount}</div>
              </div>
            )}

            {job.residualErrorCount != null && (
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: job.residualErrorCount > 0 ? '4px solid #cf222e' : '4px solid #2da44e' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Residual Errors</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{job.residualErrorCount}</div>
              </div>
            )}
            
            {job.errorFixerIterations != null && (
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: '4px solid #bf8700' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Fixer Iterations</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{job.errorFixerIterations}</div>
              </div>
            )}

            {job.llmUsageLogs && job.llmUsageLogs.length > 0 && (
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: '4px solid #8957e5' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Tokens</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{(job.llmUsageLogs.reduce((acc, log) => acc + (log.totalTokens || 0), 0)).toLocaleString()}</div>
              </div>
            )}

            {job.llmUsageLogs && job.llmUsageLogs.length > 0 && (
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: '4px solid #0550ae' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Cost (USD)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>${(job.llmUsageLogs.reduce((acc, log) => acc + (log.totalCostUsd || 0), 0)).toFixed(4)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Migration Plan Summary */}
      {plan && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Info size={20} /> Migration Plan Summary
          </h3>

          {plan.risk_level && (
            <div style={{ 
              marginBottom: '20px', padding: '12px', borderRadius: '8px', 
              backgroundColor: plan.risk_level === 'high' ? '#ffebe9' : '#fff8c5', 
              border: `1px solid ${plan.risk_level === 'high' ? 'rgba(255,129,130,0.4)' : 'rgba(212,167,44,0.4)'}`
            }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: plan.risk_level === 'high' ? '#cf222e' : '#9a6700', margin: '0 0 4px 0' }}>
                <AlertTriangle size={16} /> Risk Level: {plan.risk_level.toUpperCase()}
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{plan.risk_notes}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Target Framework Updates */}
            {plan.target_framework_updates && plan.target_framework_updates.length > 0 && (
              <div>
                <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                  <GitMerge size={16} /> Target Framework Updates
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.target_framework_updates.map((u: any, i: number) => (
                    <div key={i} style={{ padding: '8px 12px', background: '#f6f8fa', borderRadius: '6px', fontSize: '0.9rem' }}>
                      <strong>{u.file?.split('/').pop()}</strong>: 
                      <span style={{ color: '#cf222e', textDecoration: 'line-through', marginLeft: '8px' }}>{u.from}</span>
                      <span style={{ margin: '0 6px' }}>→</span>
                      <span style={{ color: '#1a7f37', fontWeight: 600 }}>{u.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NuGet Package Updates */}
            {plan.package_updates && plan.package_updates.length > 0 && (
              <div>
                <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                  <Package size={16} /> NuGet Package Updates
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.package_updates.map((p: any, i: number) => (
                    <div key={i} style={{ padding: '8px 12px', background: '#f6f8fa', borderRadius: '6px', fontSize: '0.9rem' }}>
                      <strong>{p.name}</strong>
                      {p.action === 'remove' ? (
                        <span style={{ color: '#cf222e', marginLeft: '8px' }}>(Remove)</span>
                      ) : (
                        <span style={{ marginLeft: '8px' }}>
                          <span style={{ color: '#57606a' }}>{p.from_version}</span>
                          <span style={{ margin: '0 6px' }}>→</span>
                          <span style={{ color: '#1a7f37', fontWeight: 600 }}>{p.to_version}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Source Code Changes from Plan */}
          {plan.file_changes && plan.file_changes.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <FileCode size={16} /> Planned Source Changes ({plan.file_changes.length} files)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.file_changes.map((f: any, i: number) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#f6f8fa', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '4px' }}>{f.file}</div>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', margin: 0, color: '#57606a' }}>
                      {f.changes?.map((c: any, j: number) => (
                        <li key={j}>{c.reason}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Change Diffs */}
      {job.fileChanges && job.fileChanges.length > 0 && (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={20} />
            <h3 style={{ margin: 0, fontWeight: 600 }}>Code Changes ({job.fileChanges.length} files)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
            {job.fileChanges.map(fc => {
              const isExpanded = expandedFiles.includes(fc.filePath);
              return (
                <div key={fc.id} style={{ border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleExpand(fc.filePath)}
                    style={{ 
                      width: '100%', padding: '12px 16px', background: 'white', border: 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--panel-border)' : 'none'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {fc.filePath}
                    </span>
                    <span style={{ 
                      fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px',
                      background: fc.accepted ? '#e6f4ea' : '#ffebe9',
                      color: fc.accepted ? '#1a7f37' : '#cf222e'
                    }}>
                      {fc.accepted ? 'Accepted' : 'Rejected'}
                    </span>
                  </button>
                  {isExpanded && (
                    <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.5' }}>
                        <tbody>
                          {loadingFiles[fc.filePath] ? (
                            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading full file from GitHub...</td></tr>
                          ) : fileContents[fc.filePath] ? (
                            renderFullFileDiff(fileContents[fc.filePath], job.fileChanges.filter(f => f.filePath === fc.filePath))
                          ) : (
                            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Failed to load full file.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Steps - shown when migration is completed */}
      {isCompleted && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid var(--success)' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1a7f37' }}>
            <Lightbulb size={20} /> Next Steps & Recommendations
          </h3>
          
          {job.executionReport ? (
            <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <ReactMarkdown>{job.executionReport}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                  <BookOpen size={16} /> 1. Review the Pull Request
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Open the PR on GitHub and carefully review all code changes. Pay special attention to breaking API changes, 
                  deprecated method replacements, and NuGet package version compatibility.
                </p>
              </div>

              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                  <BookOpen size={16} /> 2. Run Tests Locally
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Checkout the migration branch (<code style={{ background: '#e8e8e8', padding: '2px 6px', borderRadius: '4px' }}>{job.branchName || 'migration/net8-' + job.id}</code>) 
                  and run <code style={{ background: '#e8e8e8', padding: '2px 6px', borderRadius: '4px' }}>dotnet build</code> and 
                  <code style={{ background: '#e8e8e8', padding: '2px 6px', borderRadius: '4px' }}> dotnet test</code> to verify everything compiles and passes.
                </p>
              </div>

              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                  <BookOpen size={16} /> 3. Check for Runtime Behavior Changes
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  .NET 8 introduced changes in JSON serialization defaults, middleware ordering, and minimal API hosting. 
                  Test your application's endpoints and workflows end-to-end before merging.
                </p>
              </div>

              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                  <BookOpen size={16} /> 4. Update CI/CD Pipeline
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  After merging, update your CI/CD pipeline (GitHub Actions, Azure DevOps, etc.) to use the .NET 8 SDK. 
                  Update your Docker base images to <code style={{ background: '#e8e8e8', padding: '2px 6px', borderRadius: '4px' }}>mcr.microsoft.com/dotnet/aspnet:8.0</code>.
                </p>
              </div>

              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                  <BookOpen size={16} /> 5. Post-Merge Cleanup
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Remove any deprecated <code style={{ background: '#e8e8e8', padding: '2px 6px', borderRadius: '4px' }}>global.json</code> SDK pinning, 
                  update your <code style={{ background: '#e8e8e8', padding: '2px 6px', borderRadius: '4px' }}>Dockerfile</code>, 
                  and verify deployment to staging before promoting to production.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commits Modal */}
      {isCommitsModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: selectedCommit ? '800px' : '600px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedCommit ? (
                  <>
                    <button onClick={() => setSelectedCommit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                      <ArrowLeft size={20} />
                    </button>
                    Commit Details
                  </>
                ) : (
                  <><GitCommit size={20} /> Migration Branch Commits</>
                )}
              </h3>
              <button onClick={() => setIsCommitsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingCommitDetails ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading commit details...</div>
              ) : selectedCommit ? (
                <div>
                  <div style={{ marginBottom: '24px', padding: '16px', background: '#f6f8fa', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>{selectedCommit.message}</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      By {selectedCommit.author} on {new Date(selectedCommit.date).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedCommit.files.map((f, idx) => (
                    <div key={idx} style={{ marginBottom: '16px', border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', background: '#f5f4f1', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{f.filename}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ color: '#1a7f37' }}>+{f.additions}</span> <span style={{ color: '#cf222e' }}>-{f.deletions}</span>
                        </span>
                      </div>
                      <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'white' }}>
                        {f.patch ? (
                          renderPatch(f.patch)
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No changes to display.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : loadingCommits ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading commits...</div>
              ) : jobCommits.map(c => (
                <div key={c.sha} onClick={() => handleCommitDetailClick(c.sha)} style={{ border: '1px solid var(--panel-border)', padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.2s', ':hover': { borderColor: 'var(--accent-purple)' } } as any}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{c.message}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>By {c.author} on {new Date(c.date).toLocaleDateString()}</span>
                    <span style={{ color: 'var(--accent-purple)' }}>{c.sha.substring(0, 7)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {isMergeModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                <GitMerge size={20} /> Merge Pull Request
              </h3>
              <button onClick={() => setIsMergeModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>Select a merge strategy for this pull request.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="mergeMethod" value="squash" checked={mergeMethod === 'squash'} onChange={(e) => setMergeMethod(e.target.value)} />
                  <span style={{ fontWeight: 600 }}>Squash and Merge</span>
                </label>
                <p style={{ margin: '0 0 0 28px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>The 1 commit from this branch will be added to the base branch.</p>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="mergeMethod" value="merge" checked={mergeMethod === 'merge'} onChange={(e) => setMergeMethod(e.target.value)} />
                  <span style={{ fontWeight: 600 }}>Create a merge commit</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="mergeMethod" value="rebase" checked={mergeMethod === 'rebase'} onChange={(e) => setMergeMethod(e.target.value)} />
                  <span style={{ fontWeight: 600 }}>Rebase and merge</span>
                </label>
              </div>

              <div style={{ marginBottom: '24px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={deleteBranch} onChange={(e) => setDeleteBranch(e.target.checked)} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Delete branch after successful merge</span>
                </label>
              </div>

              {mergeError && <div style={{ color: '#cf222e', fontSize: '0.9rem', marginBottom: '16px', background: '#ffebe9', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #cf222e' }}>{mergeError}</div>}
              {mergeSuccess && <div style={{ color: '#1a7f37', fontSize: '0.9rem', marginBottom: '16px', background: '#dafbe1', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #1a7f37' }}>{mergeSuccess}</div>}

              <button 
                onClick={handleMerge}
                disabled={isMerging}
                style={{ 
                  width: '100%', padding: '12px', background: '#1a7f37', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                  opacity: isMerging ? 0.7 : 1
                }}
              >
                {isMerging ? 'Merging...' : 'Confirm Merge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Error Modal */}
      {githubAuthError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#cf222e' }}>
                <AlertTriangle size={20} /> GitHub Session Expired
              </h3>
              <button onClick={() => setGithubAuthError(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Your GitHub access token has expired or is invalid. Please reconnect your account to view files and commits.</p>
              
              <button 
                onClick={() => { localStorage.clear(); window.location.href = 'http://localhost:5153/api/auth/github'; }}
                style={{ 
                  width: '100%', padding: '12px', background: '#cf222e', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Reconnect GitHub
              </button>
            </div>
          </div>
        </div>
      )}


        {/* --- TELEMETRY AND TIMINGS (BELOW TERMINAL) --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
          
          {/* Scan Profile */}
          {job.repositoryProfileJson && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                <Search size={20} color="#8957e5" /> Repository Scan Profile
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  try {
                    const profile = JSON.parse(job.repositoryProfileJson || '{}');
                    const items = Array.isArray(profile) ? profile : [profile];
                    return items.map((item, idx) => (
                      <div key={idx} style={{ background: '#f6f8fa', border: '1px solid var(--panel-border)', padding: '16px', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Project Path</div>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{item.Path || item.path || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Target Framework</div>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                            <span style={{ padding: '4px 8px', background: '#e6f4ea', color: '#1a7f37', borderRadius: '12px', fontSize: '0.85rem' }}>
                              {item.TargetFramework || item.targetFramework || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Project Type</div>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.ProjectType || item.projectType || 'N/A'}</div>
                        </div>
                      </div>
                    ));
                  } catch (e) {
                    return <div style={{ color: 'var(--error)' }}>Failed to parse profile JSON.</div>;
                  }
                })()}
              </div>
            </div>
          )}

          {/* LLM Telemetry & Node Timings Row */}
          {((job.llmUsageLogs && job.llmUsageLogs.length > 0) || (job.nodeExecutionLogs && job.nodeExecutionLogs.length > 0)) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* LLM Telemetry (Cost & Time) */}
              {job.llmUsageLogs && job.llmUsageLogs.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} /> LLM Telemetry & Costs
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--panel-border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '8px' }}>Time</th>
                          <th style={{ padding: '8px' }}>Agent</th>
                          <th style={{ padding: '8px' }}>LLM</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Tokens</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.llmUsageLogs.map((log: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--panel-border)', fontSize: '0.9rem' }}>
                            <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleTimeString()}</td>
                            <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{log.agentName}</td>
                            <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{log.modelName || log.provider}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{log.totalTokens?.toLocaleString()}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#1a7f37' }}>${(log.totalCostUsd || 0).toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>Total:</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#1a7f37' }}>
                            ${job.llmUsageLogs.reduce((acc: number, log: any) => acc + (log.totalCostUsd || 0), 0).toFixed(4)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Node Timings */}
              {job.nodeExecutionLogs && job.nodeExecutionLogs.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    <Clock size={20} color="#0969da" /> Agent Node Timings
                  </h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--panel-border)' }}>
                        <th style={{ padding: '8px 4px' }}>Phase</th>
                        <th style={{ padding: '8px 4px' }}>Node Name</th>
                        <th style={{ padding: '8px 4px' }}>Execution Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.nodeExecutionLogs.map((node: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                          <td style={{ padding: '8px 4px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: node.phase === 'Phase1' ? '#ddf4ff' : '#e6f4ea', color: node.phase === 'Phase1' ? '#0969da' : '#1a7f37' }}>
                              {node.phase}
                            </span>
                          </td>
                          <td style={{ padding: '8px 4px', fontWeight: 500 }}>{node.nodeName}</td>
                          <td style={{ padding: '8px 4px' }}>{(node.executionTimeMs / 1000).toFixed(2)}s</td>
                        </tr>
                      ))}
                      {(job.nodeExecutionLogs?.length || 0) > 0 && (
                        <tr style={{ background: '#f6f8fa' }}>
                          <td colSpan={2} style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Total Execution Time:</td>
                          <td style={{ padding: '8px 4px', fontWeight: 600, color: '#0969da' }}>
                            {(job.nodeExecutionLogs.reduce((acc: number, cur: any) => acc + (cur.executionTimeMs || 0), 0) / 1000).toFixed(2)}s
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Activity Log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              <Activity size={20} color="#8957e5" /> Activity Log
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
              {/* Timeline Line */}
              <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '24px', width: '2px', background: 'var(--panel-border)', zIndex: 0 }}></div>
              
              {/* Job Started Event */}
              <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ddf4ff', border: '2px solid #0969da', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0969da' }}></div>
                </div>
                <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', flexGrow: 1, border: '1px solid var(--panel-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Migration Job Started</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(job.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Started by {job.assignedToUser?.username || job.createdBy || 'Unknown User'}
                  </div>
                </div>
              </div>

              {/* Approval Events */}
              {job.approvalRecords && job.approvalRecords
                .sort((a: any, b: any) => new Date(a.approvedAt).getTime() - new Date(b.approvedAt).getTime())
                .map((rec: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e6f4ea', border: '2px solid #1a7f37', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <CheckCircle2 size={14} color="#1a7f37" />
                  </div>
                  <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', flexGrow: 1, border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>Phase {idx + 1} Approved</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(rec.approvedAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Approved by {rec.approverUser?.username || rec.approverUserId || 'System'}
                    </div>
                    {rec.executionOverridePrompt && (
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                        <strong>Override Prompt:</strong> {rec.executionOverridePrompt}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Tasks */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              <CheckSquare size={20} color="#0969da" /> Job Tasks ({job.migrationTasks?.length || 0})
            </h2>
            {job.migrationTasks && job.migrationTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {job.migrationTasks.map((task: any, idx: number) => {
                  const statusColors: any = {
                    'Todo': { bg: '#fff8c5', color: '#9a6700' },
                    'Started': { bg: '#ddf4ff', color: '#0969da' },
                    'Review': { bg: '#fbefff', color: '#8250df' },
                    'Finished': { bg: '#e6f4ea', color: '#1a7f37' },
                  };
                  const sc = statusColors[task.status] || { bg: '#f6f8fa', color: 'var(--text-secondary)' };
                  return (
                    <div key={idx} style={{ padding: '12px 16px', background: '#f6f8fa', borderRadius: '8px', borderLeft: `4px solid ${sc.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{task.title}</div>
                        {task.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{task.description}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        {task.assignedToUserId && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assigned: #{task.assignedToUserId}</span>
                        )}
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: sc.bg, color: sc.color }}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', background: '#f6f8fa', borderRadius: '8px' }}>
                No tasks assigned to this job yet.
              </div>
            )}
          </div>
        </div>
      {/* Conflict Modal */}
      {isConflictModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '450px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#cf222e' }}>
                <AlertTriangle size={20} /> Merge Conflict Detected
              </h3>
              <button onClick={() => setIsConflictModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                This pull request has merge conflicts that must be resolved manually before it can be merged.
              </p>
              <div style={{ padding: '16px', background: '#f6f8fa', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                You can resolve these conflicts natively within GitHub's web editor, or by pulling the branch locally.
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setIsConflictModalOpen(false)}
                  style={{ 
                    flex: 1, padding: '12px', background: '#f0f0f0', color: 'var(--text-primary)',
                    border: '1px solid #d0d7de', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <a 
                  href={job?.prUrl ? `${job.prUrl}/conflicts` : '#'} 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={() => setIsConflictModalOpen(false)}
                  style={{ 
                    flex: 2, padding: '12px', background: '#24292f', color: 'white',
                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                    textDecoration: 'none', textAlign: 'center', display: 'block'
                  }}
                >
                  Resolve on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {isArchiveModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                <Package size={20} /> Archive Job
              </h3>
              <button onClick={() => setIsArchiveModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Are you sure you want to archive this job? It will be hidden from the active dashboard.
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setIsArchiveModalOpen(false)}
                  style={{ 
                    flex: 1, padding: '12px', background: '#f0f0f0', color: 'var(--text-primary)',
                    border: '1px solid #d0d7de', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsArchiveModalOpen(false);
                    handleArchive();
                  }}
                  style={{ 
                    flex: 1, padding: '12px', background: '#24292f', color: 'white',
                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Confirm Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revert Confirmation Modal */}
      {isRevertModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '450px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#cf222e' }}>
                <AlertTriangle size={20} /> Revert Migration
              </h3>
              <button onClick={() => setIsRevertModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
                Are you sure you want to revert this migration?
              </p>
              <div style={{ padding: '16px', background: '#ffebe9', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', color: '#cf222e', border: '1px solid rgba(207,34,46,0.3)' }}>
                This action will automatically generate a new Pull Request on GitHub that undoes all the .NET 8 changes introduced by this migration.
              </div>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Note: Your target branch will not be immediately affected. You will still need to review and merge the generated Revert PR on GitHub.
              </p>

              {revertError && (
                <div style={{ color: '#cf222e', fontSize: '0.9rem', marginBottom: '16px', background: '#ffebe9', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #cf222e', lineHeight: '1.4' }}>
                  <strong>Error:</strong> {revertError}
                  {revertError.includes('branch:') && job && (
                    <div style={{ marginTop: '8px' }}>
                      <a 
                        href={`${job.repositoryUrl.replace('.git', '')}/pulls?q=is:pr+head:${revertError.match(/branch: ([^)]+)/)?.[1]}`}
                        target="_blank" rel="noreferrer"
                        style={{ color: '#cf222e', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        View the existing Revert PR here
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setIsRevertModalOpen(false)}
                  disabled={isReverting}
                  style={{ 
                    flex: 1, padding: '12px', background: '#f0f0f0', color: 'var(--text-primary)',
                    border: '1px solid #d0d7de', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                    opacity: isReverting ? 0.7 : 1
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleRevert();
                  }}
                  disabled={isReverting}
                  style={{ 
                    flex: 1, padding: '12px', background: '#cf222e', color: 'white',
                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                    opacity: isReverting ? 0.7 : 1
                  }}
                >
                  {isReverting ? 'Creating PR...' : 'Create Revert PR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
