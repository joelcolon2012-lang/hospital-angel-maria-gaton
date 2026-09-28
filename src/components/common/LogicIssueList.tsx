import React from 'react';
import type { ClinicalIssue } from '../../services/clinicalLogic/clinicalLogicChecker';

const SEV_STYLE: Record<string, string> = {
  error: 'bg-red-50 border-red-300 text-red-800',
  alerta: 'bg-amber-50 border-amber-300 text-amber-900',
  aviso: 'bg-sky-50 border-sky-200 text-sky-900'
};

export const IssueList: React.FC<{ issues: ClinicalIssue[]; compact?: boolean }> = ({ issues, compact }) =>
  issues.length ? (
    <div className="space-y-1" data-testid="logic-issues">
      {issues.map((i) => (
        <div key={i.id} className={`border rounded-lg px-2 py-1.5 text-[11px] leading-snug ${SEV_STYLE[i.severity]}`} data-testid={`logic-issue-${i.id}`}>
          <b>{i.severity === 'error' ? '⛔ ' : i.severity === 'alerta' ? '⚠️ ' : 'ℹ️ '}{i.title}.</b> {!compact && i.message}
        </div>
      ))}
    </div>
  ) : null;

