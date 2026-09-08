import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash, Save, X, Search } from 'lucide-react';

interface MigrationRule {
  id: number;
  sourceVersion: string;
  targetVersion: string;
  pattern: string;
  replacement: string;
  description: string;
  isActive: boolean;
}

export const KnowledgeBase: React.FC = () => {
  const [rules, setRules] = useState<MigrationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MigrationRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [sourceVersion, setSourceVersion] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('http://localhost:5153/api/rules');
      const data = await res.json();
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch rules', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (rule?: MigrationRule) => {
    if (rule) {
      setEditingRule(rule);
      setSourceVersion(rule.sourceVersion);
      setTargetVersion(rule.targetVersion);
      setPattern(rule.pattern);
      setReplacement(rule.replacement);
      setDescription(rule.description || '');
      setIsActive(rule.isActive);
    } else {
      setEditingRule(null);
      setSourceVersion('');
      setTargetVersion('');
      setPattern('');
      setReplacement('');
      setDescription('');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleSave = async () => {
    const payload = {
      sourceVersion, targetVersion, pattern, replacement, description, isActive
    };

    try {
      if (editingRule) {
        await fetch(`http://localhost:5153/api/rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('http://localhost:5153/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchRules();
      closeModal();
    } catch (err) {
      console.error('Failed to save rule', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await fetch(`http://localhost:5153/api/rules/${id}`, {
        method: 'DELETE'
      });
      fetchRules();
    } catch (err) {
      console.error('Failed to delete rule', err);
    }
  };

  const filteredRules = rules.filter(r => 
    r.pattern.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={28} color="var(--primary-color)" />
            Migration Knowledge Base
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Manage the centralized rules repository used by the AI Agent for code substitutions.
          </p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> New Rule
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={18} color="var(--text-secondary)" />
        <input 
          type="text" 
          placeholder="Search rules by pattern or description..." 
          style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Loading rules...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {filteredRules.map(rule => (
            <div key={rule.id} className="glass-panel rule-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge" style={{ background: rule.isActive ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)', color: rule.isActive ? '#1a7f37' : '#cf222e' }}>
                  {rule.sourceVersion} → {rule.targetVersion}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openModal(rule)}>
                    <Edit size={16} />
                  </button>
                  <button className="btn-secondary" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cf222e' }} onClick={() => handleDelete(rule.id)}>
                    <Trash size={16} />
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>{rule.description}</p>
              
              <div className="code-block">
                <div style={{ color: '#cf222e', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                  <span style={{ userSelect: 'none' }}>-</span> <span>{rule.pattern}</span>
                </div>
                <div style={{ color: '#1a7f37', display: 'flex', gap: '8px' }}>
                  <span style={{ userSelect: 'none' }}>+</span> <span>{rule.replacement}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>{editingRule ? 'Edit Rule' : 'New Rule'}</h2>
              <button className="btn-secondary" style={{ padding: '4px' }} onClick={closeModal}><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Source Version</label>
                  <input className="input-field" value={sourceVersion} onChange={e => setSourceVersion(e.target.value)} placeholder="e.g. netcoreapp3.1" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Target Version</label>
                  <input className="input-field" value={targetVersion} onChange={e => setTargetVersion(e.target.value)} placeholder="e.g. net8.0" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Description</label>
                <input className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this rule do?" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Pattern (Regex or exact match)</label>
                <textarea className="input-field" style={{ fontFamily: 'monospace', minHeight: '80px' }} value={pattern} onChange={e => setPattern(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Replacement</label>
                <textarea className="input-field" style={{ fontFamily: 'monospace', minHeight: '80px' }} value={replacement} onChange={e => setReplacement(e.target.value)} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <span>Rule is Active</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={handleSave}><Save size={18}/> Save Rule</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default KnowledgeBase;
