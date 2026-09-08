import React, { useState, useEffect } from 'react';
import { FolderGit2, ArrowRight, BarChart2, Clock, CheckCircle2, XCircle, DollarSign, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MigrationStatsDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5153/api/migrationjob', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(r => r.json())
    .then(data => {
      setJobs(data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading migration stats...</div>;
  }

  // Aggregate stats logic
  const completedJobs = jobs.filter(j => j.status === 'Completed' || j.status === 'Failed' || j.status === 'Pending_PR_Review' || j.status === 'Pending_Plan_Approval');
  
  const calculateStats = (jobList: any[]) => {
    let totalTime = 0;
    let timeCount = 0;
    let phase1Time = 0;
    let phase2Time = 0;
    
    let totalCost = 0;
    let totalTokens = 0;

    let successCount = 0;
    let phase1SuccessCount = 0;
    let phase2SuccessCount = 0;
    let totalFinished = 0;
    let phase2Attempted = 0;

    jobList.forEach(j => {
      if (j.executionTimeMs && (j.status === 'Pending PR Review' || j.status === 'Failed Execution' || j.status === 'Approved and PR Created' || j.status === 'Merged' || j.status === 'Reverted')) {
        totalTime += j.executionTimeMs;
        timeCount++;
      }
      if (j.phase1ExecutionTimeMs) phase1Time += j.phase1ExecutionTimeMs;
      if (j.phase2ExecutionTimeMs) phase2Time += j.phase2ExecutionTimeMs;
      
      if (j.llmUsageLogs && Array.isArray(j.llmUsageLogs)) {
        j.llmUsageLogs.forEach((l: any) => {
          totalCost += l.totalCostUsd || 0;
          totalTokens += l.totalTokens || 0;
        });
      }

      // Success boolean
      if (j.status !== 'In_Progress' && j.status !== 'Pending' && j.status !== 'Analyzing') {
        totalFinished++;
        if (j.isSuccess) successCount++;
        if (j.phase1Success) phase1SuccessCount++;
        
        // A job attempted Phase 2 if Phase 1 succeeded (or if it has Phase2 metrics)
        if (j.phase1Success || j.phase2ExecutionTimeMs > 0 || j.status === 'Failed Execution') {
          phase2Attempted++;
          if (j.phase2Success) phase2SuccessCount++;
        }
      }
    });

    const avgTime = timeCount > 0 ? (totalTime / timeCount) / 1000 : 0;
    const avgPhase1 = timeCount > 0 ? (phase1Time / timeCount) / 1000 : 0;
    const avgPhase2 = timeCount > 0 ? (phase2Time / timeCount) / 1000 : 0;
    const successRate = totalFinished > 0 ? Math.round((successCount / totalFinished) * 100) : 0;
    const p1SuccessRate = totalFinished > 0 ? Math.round((phase1SuccessCount / totalFinished) * 100) : 0;
    const p2SuccessRate = phase2Attempted > 0 ? Math.round((phase2SuccessCount / phase2Attempted) * 100) : 0;

    return { avgTime, avgPhase1, avgPhase2, totalCost, totalTokens, successRate, p1SuccessRate, p2SuccessRate, totalRuns: jobList.length, totalFinished };
  };

  const globalStats = calculateStats(jobs);

  // Group by project
  const projectsMap = new Map<string, any[]>();
  jobs.forEach(j => {
    if (!j.repositoryUrl) return;
    if (!projectsMap.has(j.repositoryUrl)) {
      projectsMap.set(j.repositoryUrl, []);
    }
    projectsMap.get(j.repositoryUrl)!.push(j);
  });

  const projectEntries = Array.from(projectsMap.entries());

  if (selectedProject) {
    const projectJobs = projectsMap.get(selectedProject) || [];
    const pStats = calculateStats(projectJobs);
    const parts = selectedProject.replace('https://github.com/', '').replace('.git', '').split('/');
    const repoName = parts[1] || selectedProject;

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <button 
          onClick={() => setSelectedProject(null)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
        >
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to All Projects
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--panel-bg)', border: '1px solid var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderGit2 size={28} color="var(--accent-purple)" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '2rem', color: 'var(--text-primary)' }}>{repoName}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Detailed migration stats for this project</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <StatCard icon={<CheckCircle2 size={20} color="#3fb950" />} label="Overall Success" value={`${pStats.successRate}%`} />
          <StatCard icon={<CheckCircle2 size={20} color="#2ea043" />} label="Phase 1 Success" value={`${pStats.p1SuccessRate}%`} />
          <StatCard icon={<CheckCircle2 size={20} color="#2ea043" />} label="Phase 2 Success" value={`${pStats.p2SuccessRate}%`} />
          <StatCard icon={<Clock size={20} color="#58a6ff" />} label="Avg Total Time" value={`${pStats.avgTime.toFixed(1)}s`} />
          <StatCard icon={<Cpu size={20} color="#bc8cff" />} label="Total Tokens" value={pStats.totalTokens.toLocaleString()} />
          <StatCard icon={<DollarSign size={20} color="#d29922" />} label="Total Cost" value={`$${pStats.totalCost.toFixed(4)}`} />
        </div>

        <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Migration Runs ({projectJobs.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {projectJobs.map((job, idx) => (
            <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: job.isSuccess ? '4px solid #3fb950' : '4px solid #f85149' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Run #{job.id}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{new Date(job.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: '32px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</div>
                  <div style={{ color: job.isSuccess ? '#3fb950' : 'var(--text-primary)' }}>{job.status}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Execution Time</div>
                  <div style={{ color: 'var(--text-primary)' }}>{job.executionTimeMs ? (job.executionTimeMs / 1000).toFixed(1) + 's' : '-'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--panel-bg)', border: '1px solid var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart2 size={28} color="var(--accent-purple)" />
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '2rem', color: 'var(--text-primary)' }}>Global Migration Stats</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Aggregate performance and cost metrics across all projects</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        <StatCard icon={<FolderGit2 size={20} color="var(--accent-purple)" />} label="Total Projects" value={projectEntries.length} />
        <StatCard icon={<CheckCircle2 size={20} color="#3fb950" />} label="Overall Success" value={`${globalStats.successRate}%`} />
        <StatCard icon={<CheckCircle2 size={20} color="#2ea043" />} label="Phase 1 Success" value={`${globalStats.p1SuccessRate}%`} />
        <StatCard icon={<CheckCircle2 size={20} color="#2ea043" />} label="Phase 2 Success" value={`${globalStats.p2SuccessRate}%`} />
        <StatCard icon={<Clock size={20} color="#58a6ff" />} label="Avg Time" value={`${globalStats.avgTime.toFixed(1)}s`} />
        <StatCard icon={<Cpu size={20} color="#bc8cff" />} label="Total Tokens" value={globalStats.totalTokens.toLocaleString()} />
        <StatCard icon={<DollarSign size={20} color="#d29922" />} label="Total Cost" value={`$${globalStats.totalCost.toFixed(2)}`} />
      </div>

      <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1.4rem' }}>Project Drill-Down</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {projectEntries.map(([repoUrl, pJobs]) => {
          const parts = repoUrl.replace('https://github.com/', '').replace('.git', '').split('/');
          const owner = parts[0];
          const name = parts[1] || repoUrl;
          const pStats = calculateStats(pJobs);
          
          return (
            <div key={repoUrl} onClick={() => setSelectedProject(repoUrl)} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', ':hover': { transform: 'translateY(-4px)' } } as any}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
                  <FolderGit2 size={24} color="var(--text-secondary)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{name}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>{owner}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid var(--panel-border)', borderBottom: '1px solid var(--panel-border)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Runs</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pJobs.length}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Success</div>
                  <div style={{ fontWeight: 600, color: pStats.successRate > 50 ? '#3fb950' : '#f85149' }}>{pStats.successRate}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Avg Time</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pStats.avgTime.toFixed(0)}s</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: 'var(--accent-purple)', fontWeight: 600, fontSize: '0.9rem' }}>
                View Details <ArrowRight size={16} style={{ marginLeft: '6px' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  </div>
);

export default MigrationStatsDashboard;
