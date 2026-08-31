import React from 'react';
import { Play, CheckCircle, Package, GitMerge, FileCode, AlertTriangle } from 'lucide-react';

interface Props {
  planJson: string;
  onApprove: () => void;
}

export const PlanReview: React.FC<Props> = ({ planJson, onApprove }) => {
  let plan = null;
  try {
    plan = JSON.parse(planJson);
  } catch (e) {
    return <div className="p-4 text-red-500">Failed to parse migration plan.</div>;
  }

  return (
    <div className="panel" style={{ marginTop: '20px' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <CheckCircle size={20} color="var(--primary-color)" />
          LLM Migration Plan Review
        </h3>
        <button 
          onClick={onApprove} 
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
        
        {plan.risk_level && (
          <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '6px', backgroundColor: plan.risk_level === 'high' ? '#ffebe9' : '#fff8c5', border: `1px solid ${plan.risk_level === 'high' ? 'rgba(255,129,130,0.4)' : 'rgba(212,167,44,0.4)'}` }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: plan.risk_level === 'high' ? '#cf222e' : '#9a6700', margin: '0 0 8px 0' }}>
              <AlertTriangle size={18} />
              Risk Level: {plan.risk_level.toUpperCase()}
            </h4>
            <p style={{ margin: 0, fontSize: '14px' }}>{plan.risk_notes}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          <div>
            <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitMerge size={18} /> Target Framework Updates
            </h4>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              {plan.target_framework_updates?.map((u: any, i: number) => (
                <li key={i}>
                  <strong>{u.file.split('/').pop()}</strong>: <span style={{ color: '#cf222e', textDecoration: 'line-through' }}>{u.from}</span> &rarr; <span style={{ color: '#1a7f37', fontWeight: 500 }}>{u.to}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} /> NuGet Package Updates
            </h4>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              {plan.package_updates?.map((p: any, i: number) => (
                <li key={i}>
                  <strong>{p.name}</strong> 
                  {p.action === 'remove' ? (
                    <span style={{ color: '#cf222e', marginLeft: '8px' }}>(Remove)</span>
                  ) : (
                    <span style={{ marginLeft: '8px' }}>
                      <span style={{ color: '#57606a' }}>{p.from_version}</span> &rarr; <span style={{ color: '#1a7f37', fontWeight: 500 }}>{p.to_version}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={18} /> Source Code Changes ({plan.estimated_changes || plan.file_changes?.length} estimated files)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.file_changes?.map((f: any, i: number) => (
                <div key={i} style={{ border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '12px', backgroundColor: '#f6f8fa' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', fontFamily: 'monospace', fontSize: '13px' }}>{f.file}</div>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', margin: 0, color: '#57606a' }}>
                    {f.changes?.map((c: any, j: number) => (
                      <li key={j}>{c.reason}</li>
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
