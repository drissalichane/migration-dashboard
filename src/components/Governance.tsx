import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash, X, Users, Building, ListTodo, FolderGit2 } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  organizationId: number;
  organization?: { name: string };
}

interface User {
  id: number;
  username: string;
  role: string;
  teamId?: number;
  team?: Team;
}

interface MigrationTask {
  id: number;
  title: string;
  description: string;
  status: string;
  migrationJobId?: number;
  assignedToUser?: User;
  assignedToUserId?: number;
  migrationJob?: {
    id: number;
    repositoryUrl: string;
    branchName: string;
    projectId?: number;
  };
  comments?: {
    id: number;
    author: string;
    text: string;
    createdAt: string;
  }[];
}

export const Governance: React.FC = () => {
  const userRole = localStorage.getItem('user_role') || 'Dev';
  
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'teams' | 'tasks'>('users');
  
  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTask, setSelectedTask] = useState<MigrationTask | null>(null);
  const [isEditingTaskDesc, setIsEditingTaskDesc] = useState(false);
  const [taskDescBuffer, setTaskDescBuffer] = useState('');
  const [newComment, setNewComment] = useState('');

  // Form State - User
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Dev');
  const [userTeamId, setUserTeamId] = useState('');

  // Form State - Team
  const [teamName, setTeamName] = useState('');
  const [orgId, setOrgId] = useState('1'); // Default to Org 1 for demo

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, tRes, taskRes] = await Promise.all([
        fetch('http://localhost:5153/api/users'),
        fetch('http://localhost:5153/api/teams'),
        fetch('http://localhost:5153/api/tasks')
      ]);
      const uData = await uRes.json();
      const tData = await tRes.json();
      const taskData = await taskRes.json();
      setUsers(uData);
      setTeams(tData);
      setTasks(taskData);
    } catch (err) {
      console.error('Failed to fetch governance data', err);
    } finally {
      setLoading(false);
    }
  };

  // --- USER HANDLERS ---
  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setRole(user.role);
      setUserTeamId(user.teamId ? user.teamId.toString() : '');
    } else {
      setEditingUser(null);
      setUsername('');
      setRole('Dev');
      setUserTeamId('');
    }
    setIsUserModalOpen(true);
  };

  const saveUser = async () => {
    const payload = { 
      username, 
      role, 
      teamId: userTeamId ? parseInt(userTeamId) : null,
      passwordHash: 'dummy' // only used if creating
    };

    try {
      if (editingUser) {
        await fetch(`http://localhost:5153/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('http://localhost:5153/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchData();
      setIsUserModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete user?')) return;
    await fetch(`http://localhost:5153/api/users/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // --- TEAM HANDLERS ---
  const openTeamModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setTeamName(team.name);
      setOrgId(team.organizationId.toString());
    } else {
      setEditingTeam(null);
      setTeamName('');
      setOrgId('1');
    }
    setIsTeamModalOpen(true);
  };

  const saveTeam = async () => {
    const payload = { name: teamName, organizationId: parseInt(orgId) };
    try {
      if (editingTeam) {
        await fetch(`http://localhost:5153/api/teams/${editingTeam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('http://localhost:5153/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchData();
      setIsTeamModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTeam = async (id: number) => {
    if (!confirm('Delete team?')) return;
    await fetch(`http://localhost:5153/api/teams/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // --- TASK HANDLERS (KANBAN) ---
  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await fetch(`http://localhost:5153/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      // Optimistically update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (e) {
      console.error(e);
    }
  };

  const updateTaskDescription = async (taskId: number, newDesc: string) => {
    try {
      const res = await fetch(`http://localhost:5153/api/tasks/${taskId}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDesc })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, description: newDesc } : t));
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(prev => prev ? { ...prev, description: newDesc } : null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const assignTask = async (taskId: number, userId: number) => {
    try {
      const res = await fetch(`http://localhost:5153/api/tasks/${taskId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error('Failed to assign task');
      // Update state
      const updatedUser = users.find(u => u.id === userId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedToUserId: userId, assignedToUser: updatedUser, status: t.status === 'PendingApproval' ? 'Todo' : t.status } : t));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, assignedToUserId: userId, assignedToUser: updatedUser, status: prev.status === 'PendingApproval' ? 'Todo' : prev.status } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    try {
      const author = localStorage.getItem('user_name') || 'Anonymous';
      const res = await fetch(`http://localhost:5153/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, text: newComment })
      });
      if (!res.ok) throw new Error('Failed to post comment');
      const savedComment = await res.json();
      
      const updatedTask = {
        ...selectedTask,
        comments: [...(selectedTask.comments || []), savedComment]
      };
      
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      setNewComment('');
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Todo': return '#6e7781';
      case 'InProgress': return '#0969da';
      case 'Review': return '#8250df';
      case 'Finished': return '#1a7f37';
      default: return '#6e7781';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch(status) {
      case 'Todo': return '#f6f8fa';
      case 'InProgress': return '#ddf4ff';
      case 'Review': return '#f3f0ff';
      case 'Finished': return '#dafbe1';
      default: return '#f6f8fa';
    }
  };

  const TaskCard = ({ task, isGeneratedTask }: { task: MigrationTask, isGeneratedTask?: boolean }) => {
    const columnColor = getStatusColor(task.status);
    
    return (
      <div 
        draggable={!isGeneratedTask}
        onClick={() => setSelectedTask(task)}
        onDragStart={!isGeneratedTask ? (e) => e.dataTransfer.setData("taskId", task.id.toString()) : undefined}
        style={{ 
          background: 'white', 
          padding: '14px', 
          borderRadius: '8px', 
          border: isGeneratedTask ? '1px solid #ffe69c' : '1px solid var(--panel-border)', 
          borderLeft: isGeneratedTask ? '1px solid #ffe69c' : `4px solid ${columnColor}`,
          cursor: 'pointer', 
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          position: 'relative',
          transition: 'transform 0.1s, box-shadow 0.1s',
          width: isGeneratedTask ? '300px' : 'auto',
          flex: isGeneratedTask ? '0 0 auto' : undefined,
          display: 'flex',
          flexDirection: 'column'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          {task.migrationJobId ? (
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: isGeneratedTask ? '#ffe69c' : '#f3f4f6', borderRadius: '4px', color: isGeneratedTask ? '#664d03' : '#4b5563', fontWeight: 600 }}>
              Job #{task.migrationJobId}
            </span>
          ) : <span />}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TASK-{task.id}</span>
        </div>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: isGeneratedTask ? '#664d03' : 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>{task.title}</h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, wordBreak: 'break-word' }}>{task.description}</p>
        
        {isGeneratedTask && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn-primary" style={{ flex: 1, padding: '8px', background: '#1a7f37', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'Todo'); }}>
              Approve to Todo
            </button>
          </div>
        )}
      </div>
    );
  };

  const TaskColumn = ({ title, status }: { title: string, status: string }) => {
    const columnColor = getStatusColor(status);
    const columnBg = getStatusBgColor(status);
    const count = tasks.filter(t => t.status === status).length;
    
    return (
      <div 
        style={{ 
          flex: 1, 
          minWidth: 0,
          background: '#f6f8fa', 
          borderRadius: '12px', 
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          borderTop: `4px solid ${columnColor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = columnBg; }}
        onDragLeave={(e) => { e.currentTarget.style.background = '#f6f8fa'; }}
        onDrop={(e) => { 
          e.preventDefault(); 
          e.currentTarget.style.background = '#f6f8fa';
          updateTaskStatus(parseInt(e.dataTransfer.getData("taskId")), status); 
        }}
      >
        <div style={{ padding: '16px 16px 12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: columnColor, display: 'inline-block' }}></span>
            {title}
          </h3>
          <span style={{ background: 'rgba(0,0,0,0.08)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {count}
          </span>
        </div>
        
        <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
          {tasks.filter(t => t.status === status).map(t => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={28} color="var(--primary-color)" />
            Team Management
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Manage Organizations, Teams, Users, and Roles for Multi-Tenant Access Control.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--panel-border)' }}>
        <button 
          onClick={() => setActiveTab('users')} 
          style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', borderBottom: activeTab === 'users' ? '3px solid var(--accent-purple)' : '3px solid transparent', color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <Users size={18}/> Users & Roles
        </button>
        <button 
          onClick={() => setActiveTab('teams')} 
          style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', borderBottom: activeTab === 'teams' ? '3px solid var(--accent-purple)' : '3px solid transparent', color: activeTab === 'teams' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <Building size={18}/> Teams
        </button>
        <button 
          onClick={() => setActiveTab('tasks')} 
          style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', borderBottom: activeTab === 'tasks' ? '3px solid var(--accent-purple)' : '3px solid transparent', color: activeTab === 'tasks' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <ListTodo size={18}/> Tasks (Kanban)
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Loading governance data...</div>
      ) : activeTab === 'users' ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            {userRole === 'Admin' && <button className="btn-primary" onClick={() => openUserModal()}><Plus size={18} /> New User</button>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Username</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Team / Org</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--bg-primary)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{u.id}</td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{u.username}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge" style={{ background: u.role === 'Admin' ? '#ffebe9' : '#e6f4ea', color: u.role === 'Admin' ? '#cf222e' : '#1a7f37' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    {u.team ? `${u.team.name} (${u.team.organization?.name})` : 'Unassigned'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {userRole === 'Admin' && (
                      <>
                        <button className="btn-secondary" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => openUserModal(u)}><Edit size={16} /></button>
                        <button className="btn-secondary" style={{ padding: '4px', border: 'none', background: 'transparent', color: '#cf222e' }} onClick={() => deleteUser(u.id)}><Trash size={16} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'teams' ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            {userRole === 'Admin' && <button className="btn-primary" onClick={() => openTeamModal()}><Plus size={18} /> New Team</button>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Team Name</th>
                <th style={{ padding: '12px' }}>Organization</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-primary)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{t.id}</td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{t.organization?.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {userRole === 'Admin' && (
                      <>
                        <button className="btn-secondary" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => openTeamModal(t)}><Edit size={16} /></button>
                        <button className="btn-secondary" style={{ padding: '4px', border: 'none', background: 'transparent', color: '#cf222e' }} onClick={() => deleteTeam(t.id)}><Trash size={16} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'tasks' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {userRole !== 'Dev' && tasks.some(t => t.status === 'PendingApproval') && (
            <div className="glass-panel" style={{ padding: '16px', background: '#fff3cd', border: '1px solid #ffe69c' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#664d03', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} /> Generated Tasks (Pending Manager Approval)
              </h3>
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                {tasks.filter(t => t.status === 'PendingApproval').map(t => (
                  <TaskCard key={t.id} task={t} isGeneratedTask />
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '16px', width: '100%', overflowX: 'auto' }}>
            <TaskColumn title="To Do" status="Todo" />
            <TaskColumn title="In Progress" status="InProgress" />
            <TaskColumn title="Review" status="Review" />
            <TaskColumn title="Finished" status="Finished" />
          </div>
        </div>
      ) : null}

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{editingUser ? 'Edit User' : 'New User'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="input-field" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
              <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
                <option value="Dev">Dev</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
              <select className="input-field" value={userTeamId} onChange={e => setUserTeamId(e.target.value)}>
                <option value="">-- No Team --</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button className="btn-secondary" onClick={() => setIsUserModalOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveUser}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM MODAL */}
      {isTeamModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{editingTeam ? 'Edit Team' : 'New Team'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="input-field" placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} />
              <select className="input-field" value={orgId} onChange={e => setOrgId(e.target.value)}>
                <option value="1">Global Corp</option>
                {/* Additional Orgs could go here */}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button className="btn-secondary" onClick={() => setIsTeamModalOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveTeam}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {selectedTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={() => setSelectedTask(null)}>
          <div className="glass-panel" style={{ width: '600px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: '#f3f4f6', borderRadius: '4px', color: '#4b5563', fontWeight: 600 }}>
                  TASK-{selectedTask.id}
                </span>
                <h2 style={{ margin: '8px 0 0 0', color: 'var(--text-primary)' }}>{selectedTask.title}</h2>
              </div>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={24} color="var(--text-secondary)" />
              </button>
            </div>
            
            {isEditingTaskDesc ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea 
                  style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' }}
                  value={taskDescBuffer}
                  onChange={(e) => setTaskDescBuffer(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="btn-secondary" onClick={() => setIsEditingTaskDesc(false)}>Cancel</button>
                  <button className="btn-primary" onClick={() => { updateTaskDescription(selectedTask.id, taskDescBuffer); setIsEditingTaskDesc(false); }}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', paddingRight: '24px' }}>
                  {selectedTask.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description provided...</span>}
                </p>
                <button 
                  onClick={() => { setTaskDescBuffer(selectedTask.description); setIsEditingTaskDesc(true); }}
                  style={{ position: 'absolute', top: '-4px', right: '0', background: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  title="Edit Description"
                >
                  <Edit size={14} color="var(--text-secondary)" />
                </button>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f6f8fa', padding: '16px', borderRadius: '8px' }}>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>STATUS</p>
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600, background: getStatusBgColor(selectedTask.status), color: getStatusColor(selectedTask.status) }}>
                  {selectedTask.status}
                </span>
              </div>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ASSIGNEE</p>
                {(userRole === 'Manager' || userRole === 'Admin') ? (
                  <select 
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--panel-border)', width: '100%', fontSize: '0.9rem' }}
                    value={selectedTask.assignedToUserId || ''}
                    onChange={(e) => assignTask(selectedTask.id, parseInt(e.target.value))}
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-brown)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {selectedTask.assignedToUser ? selectedTask.assignedToUser.username[0].toUpperCase() : '?'}
                    </div>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {selectedTask.assignedToUser ? selectedTask.assignedToUser.username : 'Unassigned'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedTask.migrationJobId && (
              <div style={{ background: 'white', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <FolderGit2 size={18} color="var(--text-secondary)" /> Related Migration Job
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Job ID:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{selectedTask.migrationJobId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Repository:</span>
                    <a href={selectedTask.migrationJob?.repositoryUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 500 }}>
                      {selectedTask.migrationJob?.repositoryUrl ? (() => { try { return new URL(selectedTask.migrationJob.repositoryUrl).pathname.substring(1) } catch(e) { return selectedTask.migrationJob.repositoryUrl }})() : 'Unknown Repo'}
                    </a>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Branch:</span>
                    <span style={{ fontWeight: 500, fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{selectedTask.migrationJob?.branchName || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '4px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Comments</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                  <div style={{ background: '#f6f8fa', padding: '20px 12px', borderRadius: '8px', border: '1px dashed var(--panel-border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No comments yet.
                  </div>
                ) : (
                  selectedTask.comments.map(c => (
                    <div key={c.id} style={{ background: '#f6f8fa', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.author}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Write a comment..." 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if(e.key === 'Enter') submitComment() }}
                  style={{ flex: 1, margin: 0 }}
                />
                <button className="btn-primary" onClick={submitComment} disabled={!newComment.trim()}>
                  Post
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}

export default Governance;
