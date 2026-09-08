import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Package, GitMerge, FileCode, AlertTriangle, ListTodo } from 'lucide-react';

interface Props {
  planJson: string;
  onApprove: (customPrompt: string, updatedPlanJson?: string) => void;
}

export const PlanReview: React.FC<Props> = ({ planJson, onApprove }) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [localPlan, setLocalPlan] = useState<any>(null);
  
  useEffect(() => {
    try {
      setLocalPlan(JSON.parse(planJson));
    } catch (e) {
      setLocalPlan(null);
    }
  }, [planJson]);

  if (!localPlan) {
    return <div className="p-4 text-red-500">Failed to parse migration plan.</div>;
  }

  const togglePriority = (section: string, itemIndex: number, changeIndex?: number) => {
    setLocalPlan((prev: any) => {
      const newPlan = { ...prev };
      
      if (section === 'file_changes' && changeIndex !== undefined) {
        const current = newPlan.file_changes[itemIndex].changes[changeIndex].priority || 'must';
        newPlan.file_changes[itemIndex].changes[changeIndex].priority = current === 'must' ? 'should' : 'must';
      } else {
        const current = newPlan[section][itemIndex].priority || 'must';
        newPlan[section][itemIndex].priority = current === 'must' ? 'should' : 'must';
      }
      
      return newPlan;
    });
  };

  const renderBadge = (priority: string = 'must', onToggle: () => void, readOnly: boolean = false) => {
    const isMust = priority === 'must';
    return (
      <span 
        onClick={readOnly ? undefined : onToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 600,
          cursor: readOnly ? 'default' : 'pointer',
          backgroundColor: isMust ? '#ffebe9' : '#e0ebf9',
          color: isMust ? '#cf222e' : '#0969da',
          border: `1px solid ${isMust ? 'rgba(255,129,130,0.4)' : 'rgba(9,105,218,0.4)'}`,
          textTransform: 'uppercase',
          marginLeft: '8px'
        }}
        title={readOnly ? "Required for target framework" : "Click to toggle Must/Should"}
      >
        {isMust ? <AlertTriangle size={10} /> : <ListTodo size={10} />}
        {isMust ? 'MUST' : 'SHOULD'}
      </span>
    );
  };

  return (
    <div className="panel" style={{ marginTop: '20px' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <CheckCircle size={20} color="var(--primary-color)" />
          LLM Migration Plan Review
        </h3>
        <button 
          onClick={() => onApprove(customPrompt, JSON.stringify(localPlan))} 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #8250df, #0969da)',
            color: 'white', padding: '10px 24px', borderRadius: '30px',
            border: 'none', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(130, 80, 223, 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(130, 80, 223, 0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(130, 80, 223, 0.4)';
          }}
        >
          <Play size={18} fill="white" />
          Approve & Execute
        </button>
      </div>
      <div className="panel-body">
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} /> Execution Override Prompt (Optional)
          </h4>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="E.g. 'Do not use AutoMapper, map objects manually' or 'Ensure all controllers use async/await'"
            style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '6px', border: '1px solid var(--panel-border)', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
          />
        </div>
        
        {localPlan.risk_level && (
          <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '6px', backgroundColor: localPlan.risk_level === 'high' ? '#ffebe9' : '#fff8c5', border: `1px solid ${localPlan.risk_level === 'high' ? 'rgba(255,129,130,0.4)' : 'rgba(212,167,44,0.4)'}` }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: localPlan.risk_level === 'high' ? '#cf222e' : '#9a6700', margin: '0 0 8px 0' }}>
              <AlertTriangle size={18} />
              Risk Level: {localPlan.risk_level.toUpperCase()}
            </h4>
            <p style={{ margin: 0, fontSize: '14px' }}>{localPlan.risk_notes}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          <div>
            <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitMerge size={18} /> Target Framework Updates
            </h4>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              {localPlan.target_framework_updates?.map((u: any, i: number) => (
                <li key={i}>
                  <strong>{u.file.split('/').pop()}</strong>: <span style={{ color: '#cf222e', textDecoration: 'line-through' }}>{u.from}</span> &rarr; <span style={{ color: '#1a7f37', fontWeight: 500 }}>{u.to}</span>
                  {renderBadge('must', () => {}, true)}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} /> NuGet Package Updates
            </h4>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              {localPlan.package_updates?.map((p: any, i: number) => (
                <li key={i}>
                  <strong>{p.name}</strong> 
                  {p.action === 'remove' ? (
                    <span style={{ color: '#cf222e', marginLeft: '8px' }}>(Remove)</span>
                  ) : (
                    <span style={{ marginLeft: '8px' }}>
                      <span style={{ color: '#57606a' }}>{p.from_version}</span> &rarr; <span style={{ color: '#1a7f37', fontWeight: 500 }}>{p.to_version}</span>
                    </span>
                  )}
                  {renderBadge(p.priority, () => togglePriority('package_updates', i))}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={18} /> Source Code Changes ({localPlan.estimated_changes || localPlan.file_changes?.length} estimated files)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {localPlan.file_changes?.map((f: any, i: number) => (
                <div key={i} style={{ border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '12px', backgroundColor: '#f6f8fa' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', fontFamily: 'monospace', fontSize: '13px' }}>{f.file}</div>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', margin: 0, color: '#57606a' }}>
                    {f.changes?.map((c: any, j: number) => (
                      <li key={j}>
                        {c.reason}
                        {renderBadge(c.priority, () => togglePriority('file_changes', i, j))}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
