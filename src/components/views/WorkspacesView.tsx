import React, { useState } from 'react';
import { Users, UserPlus, Shield, Clock, Link, Check, Trash2 } from 'lucide-react';
import { getBrandText, loadFeatureFlags } from '../../config/features';

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  joinedAt: string;
}

export interface WorkspaceAuditLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
}

export const WorkspacesView: React.FC = () => {
  const flags = loadFeatureFlags();
  const brandName = getBrandText('primary', flags);

  const [activeWorkspace, setActiveWorkspace] = useState<'Enterprise Analytics Hub' | 'Marketing Intelligence'>('Enterprise Analytics Hub');
  const [members, setMembers] = useState<WorkspaceMember[]>([
    { id: '1', name: 'Alex Mercer (You)', email: 'alex@company.internal', role: 'Owner', joinedAt: '2025-01-15' },
    { id: '2', name: 'Sarah Chen', email: 'schen@company.internal', role: 'Editor', joinedAt: '2025-02-01' },
    { id: '3', name: 'Marcus Brody', email: 'mbrody@company.internal', role: 'Viewer', joinedAt: '2025-02-14' },
  ]);

  const [auditLogs] = useState<WorkspaceAuditLog[]>([
    { id: 'l1', user: 'Alex Mercer', action: 'Exported PBIP Bundle', target: 'Fact_Sales_Telemetry', timestamp: '10 mins ago' },
    { id: 'l2', user: 'Sarah Chen', action: 'Applied 1-Click Clean', target: 'Messy Outliers & Whitespaces', timestamp: '1 hour ago' },
    { id: 'l3', user: 'Marcus Brody', action: 'Accessed Executive Deck', target: 'Q1 Board Review PDF', timestamp: 'Yesterday' },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Editor' | 'Viewer'>('Editor');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setMembers([
      ...members,
      {
        id: String(Date.now()),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        joinedAt: new Date().toISOString().split('T')[0]
      }
    ]);
    setInviteEmail('');
  };

  const handleCopyShareLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/#/workspaces?invite=token_xyz_expires24h`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-subtle">
              Team Governance & RBAC
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary mt-1">
            Workspaces & Access Control
          </h1>
          <p className="text-xs text-secondary mt-1">
            Manage organization members, assigned roles, and inspect historical workspace audit logs in {brandName}.
          </p>
        </div>

        {/* Workspace Switcher */}
        <div className="flex items-center gap-3">
          <select
            value={activeWorkspace}
            onChange={(e) => setActiveWorkspace(e.target.value as any)}
            className="bg-input border border-subtle rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-hidden focus:ring-1 focus:ring-teal-500"
          >
            <option value="Enterprise Analytics Hub">Enterprise Analytics Hub (Default)</option>
            <option value="Marketing Intelligence">Marketing Intelligence</option>
          </select>
          <button
            onClick={handleCopyShareLink}
            className="px-3.5 py-2 rounded-xl bg-input hover:bg-card-hover text-primary text-xs font-medium border border-subtle flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-success" /> : <Link className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied (24h)' : 'Share 24h Invite'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-subtle rounded-2xl p-6">
            <h2 className="text-base font-bold text-primary flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-accent" />
              Workspace Members ({members.length})
            </h2>

            {/* Invite Form */}
            <form onSubmit={handleAddMember} className="flex flex-wrap items-center gap-3 mb-6">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-input border border-subtle rounded-xl px-3 py-2 text-xs text-primary placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-500 min-w-[200px]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="bg-input border border-subtle rounded-xl px-3 py-2 text-xs text-primary focus:outline-hidden"
              >
                <option value="Editor">Editor (Can edit & clean)</option>
                <option value="Viewer">Viewer (Read-only)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-accent hover:opacity-90 text-on-accent text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
              </button>
            </form>

            {/* Members Table */}
            <div className="overflow-x-auto divide-y divide-[var(--border-subtle)]">
              {members.map(member => (
                <div key={member.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-primary">{member.name}</div>
                    <div className="text-secondary text-[11px] font-mono">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        member.role === 'Owner'
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                          : member.role === 'Editor'
                          ? 'bg-accent-soft text-accent border border-subtle'
                          : 'bg-input text-secondary border border-subtle'
                      }`}
                    >
                      {member.role}
                    </span>
                    {member.role !== 'Owner' && (
                      <button
                        onClick={() => setMembers(members.filter(m => m.id !== member.id))}
                        className="text-muted hover:text-danger p-1 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Log Panel */}
        <div className="space-y-6">
          <div className="bg-card border border-subtle rounded-2xl p-6">
            <h2 className="text-base font-bold text-primary flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-accent" />
              Compliance Audit Trail
            </h2>
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-input border border-subtle text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-primary">{log.user}</span>
                    <span className="text-[10px] text-muted">{log.timestamp}</span>
                  </div>
                  <div className="text-secondary">
                    <span className="text-accent font-medium">{log.action}</span> on {log.target}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-subtle flex items-center gap-2 text-[11px] text-muted">
              <Shield className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Immutable append-only telemetry logging</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
