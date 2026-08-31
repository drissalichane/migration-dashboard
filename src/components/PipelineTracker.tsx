import React from 'react';
import { DownloadCloud, Search, PenTool, CheckCircle, FileText, UserCheck } from 'lucide-react';

export type PipelineStep = 'idle' | 'cloning' | 'analyzing' | 'plan-review' | 'migrating' | 'testing' | 'report' | 'review' | 'done';

const STEPS = [
  { id: 'cloning', label: 'Clone Repo', icon: DownloadCloud },
  { id: 'analyzing', label: 'Analysis', icon: Search },
  { id: 'plan-review', label: 'Plan Review', icon: UserCheck },
  { id: 'migrating', label: 'Execute Code', icon: PenTool },
  { id: 'testing', label: 'Build & Test', icon: CheckCircle },
  { id: 'report', label: 'CVE Audit', icon: FileText },
  { id: 'review', label: 'Code Review', icon: UserCheck }
];

interface Props {
  currentStep: PipelineStep;
}

const PipelineTracker: React.FC<Props> = ({ currentStep }) => {
  if (currentStep === 'idle') return null;

  // If done, set index beyond the array so all are marked as past
  const currentIndex = currentStep === 'done' ? STEPS.length : STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="glass-panel" style={{ padding: '32px', margin: '32px auto', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
      {/* Connecting Line */}
      <div style={{ position: 'absolute', top: '50px', left: '60px', right: '60px', height: '2px', background: 'var(--panel-border)', zIndex: 0 }}>
        <div style={{ 
          height: '100%', 
          background: 'var(--accent-brown)', 
          width: `${Math.max(0, currentIndex) * 20}%`,
          transition: 'width 1s ease-in-out'
        }} />
      </div>

      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;
        
        let color = 'var(--text-secondary)';
        let bgColor = '#f0ede6';
        if (isActive) { color = 'white'; bgColor = 'var(--accent-brown)'; }
        if (isPast) { color = 'var(--success)'; bgColor = '#e6f4ea'; }

        return (
          <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', zIndex: 1, width: '100px' }}>
            <div 
              className={isActive ? 'pulse-active' : ''}
              style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                background: bgColor,
                border: isActive ? 'none' : `1px solid var(--panel-border)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.5s'
              }}
            >
              <Icon color={color} size={20} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 500, color: isActive || isPast ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineTracker;
