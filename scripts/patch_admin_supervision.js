const fs = require('fs');

const path = 'frontend/app/admin/page.tsx';
let content = fs.readFileSync(path, 'utf8');
const isCRLF = content.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// 1. Add SupervisionTaskDto interface
const supervisionDtoDef = `interface SupervisionTaskDto {
  taskId: string;
  taskRef: string;
  clientId: string;
  clientRef: string;
  clientName: string;
  district: string;
  centerId: string;
  dueDate: string;
  status: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  attemptCount: number;
  rescheduleCount: number;
  lastAttemptDate?: string;
  lastAttemptOutcome?: string;
}
`;

// Insert after AdminStatus interface
content = content.replace(
  'interface AdminStatus {',
  supervisionDtoDef + '\ninterface AdminStatus {'
);

// 2. Expand activeTab union and add supervision states
const activeTabOld = "  const [activeTab, setActiveTab] = useState<'roster' | 'surveys' | 'system'>('roster');";
const activeTabNew = `  const [activeTab, setActiveTab] = useState<'roster' | 'supervision' | 'surveys' | 'system'>('roster');

  // Supervision States
  const [supervisionView, setSupervisionView] = useState<'OVERDUE' | 'COULD_NOT_REACH' | 'UNASSIGNED' | 'RESCHEDULED_OFTEN'>('OVERDUE');
  const [supervisionDistrict, setSupervisionDistrict] = useState<string>('');
  const [supervisionWorkerId, setSupervisionWorkerId] = useState<string>('');
  const [escalationThreshold, setEscalationThreshold] = useState<number>(3);
  const [supervisionTasks, setSupervisionTasks] = useState<SupervisionTaskDto[]>([]);
  const [supervisionLoading, setSupervisionLoading] = useState<boolean>(false);

  // Reassign Modal States
  const [reassignModalTask, setReassignModalTask] = useState<SupervisionTaskDto | null>(null);
  const [reassignTargetWorkerId, setReassignTargetWorkerId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignSubmitting, setReassignSubmitting] = useState<boolean>(false);`;

content = content.replace(activeTabOld, activeTabNew);

// 3. Add loadSupervisionTasks and handleConfirmReassign
const handlerBlock = `
  // Fetch Supervision Tasks
  const loadSupervisionTasks = React.useCallback(async () => {
    if (!evalUser) return;
    setSupervisionLoading(true);
    const token = localStorage.getItem('csc2_auth_token');
    const headers: Record<string, string> = {
      Authorization: \`Bearer \${token}\`,
      'Content-Type': 'application/json',
    };
    const params = new URLSearchParams();
    params.set('view', supervisionView);
    if (evalUser.state && evalUser.state !== 'NATIONAL') params.set('state', evalUser.state);
    if (supervisionDistrict) params.set('district', supervisionDistrict);
    if (supervisionWorkerId) params.set('workerId', supervisionWorkerId);
    params.set('threshold', String(escalationThreshold));

    try {
      const res = await fetch(\`/api/v1/evaluation/supervision?\${params.toString()}\`, { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        setSupervisionTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load supervision tasks', err);
    } finally {
      setSupervisionLoading(false);
    }
  }, [evalUser, supervisionView, supervisionDistrict, supervisionWorkerId, escalationThreshold]);

  useEffect(() => {
    if (activeTab === 'supervision') {
      loadSupervisionTasks();
    }
  }, [activeTab, loadSupervisionTasks]);

  // Handle Confirm Reassignment
  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalTask || !reassignTargetWorkerId || !reassignReason.trim()) return;
    setReassignSubmitting(true);
    const token = localStorage.getItem('csc2_auth_token');
    try {
      const res = await fetch(\`/api/v1/evaluation/tasks/\${reassignModalTask.taskId}/reassign\`, {
        method: 'POST',
        headers: {
          Authorization: \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newWorkerId: reassignTargetWorkerId,
          reason: reassignReason.trim(),
        }),
      });

      if (res.ok) {
        setSuccessMessage('Task reassigned successfully. Audit record created.');
        setTimeout(() => setSuccessMessage(null), 4000);
        setReassignModalTask(null);
        setReassignTargetWorkerId('');
        setReassignReason('');
        loadSupervisionTasks();
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Failed to reassign task.');
      }
    } catch {
      setErrorMessage('Network error while reassigning task.');
    } finally {
      setReassignSubmitting(false);
    }
  };
`;

content = content.replace('  // Authentication check', handlerBlock + '\n  // Authentication check');

// 4. Add Tab Button for Supervision
const supervisionTabButton = `          <button
            type="button"
            onClick={() => setActiveTab('supervision')}
            className={\`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 \${
              activeTab === 'supervision'
                ? 'text-plum border-b-3 border-plum'
                : 'text-ink-muted hover:text-ink'
            }\`}
          >
            <Icon name="Activity" className="w-4 h-4" />
            <span>{lang === 'hi' ? 'फॉलो-अप पर्यवेक्षण' : 'Supervision & Follow-ups'}</span>
            <span className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
              {stats?.openFollowUps ?? 4}
            </span>
          </button>
`;

content = content.replace(
  '          <button\n            type="button"\n            onClick={() => setActiveTab(\'surveys\')}',
  supervisionTabButton + '          <button\n            type="button"\n            onClick={() => setActiveTab(\'surveys\')}'
);

// 5. Add TAB: SUPERVISION UI content before TAB 2: STATE LINELIST
const supervisionTabContent = `        {/* TAB: SUPERVISION & FOLLOW-UP AUDIT */}
        {activeTab === 'supervision' && (
          <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4">
              <div>
                <h2 className="text-base font-black text-ink font-comic flex items-center gap-2">
                  <span>{lang === 'hi' ? 'फील्ड कार्यकर्ता फॉलो-अप पर्यवेक्षण' : 'Field Worker Follow-Up Supervision'}</span>
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Monitor missed client contacts, overdue appointments, unassigned tasks, and reassign with mandatory audit logs.
                </p>
              </div>

              {/* Configurable Programme Escalation Threshold */}
              <div className="flex items-center gap-2 bg-canvas px-3 py-1.5 rounded-[12px] border border-border/40 text-xs">
                <span className="font-bold text-ink-muted">{lang === 'hi' ? 'एस्केलेशन सीमा:' : 'Escalation Threshold:'}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={escalationThreshold}
                  onChange={(e) => setEscalationThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-1 text-center font-mono font-bold bg-surface border border-border/60 rounded-[8px] text-xs focus:ring-1 focus:ring-plum focus:outline-hidden"
                  title="Configurable programme threshold for failed contact attempts before supervisor escalation"
                />
                <span className="text-[11px] text-ink-muted">{lang === 'hi' ? 'प्रयास' : 'attempts'}</span>
              </div>
            </div>

            {/* 4 Supervison Segment Filter Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'OVERDUE', label: lang === 'hi' ? 'अतिदेय (Overdue)' : 'Overdue by Worker', icon: 'Clock', desc: 'Missed due dates' },
                { id: 'COULD_NOT_REACH', label: lang === 'hi' ? 'संपर्क नहीं हुआ' : 'Could Not Reach', icon: 'AlertTriangle', desc: \`\${escalationThreshold}+ failed attempts\` },
                { id: 'UNASSIGNED', label: lang === 'hi' ? 'अहस्तांतरित (Unassigned)' : 'Unassigned Tasks', icon: 'Users', desc: 'Needs worker assignment' },
                { id: 'RESCHEDULED_OFTEN', label: lang === 'hi' ? 'बार-बार पुनर्निर्धारित' : 'Rescheduled Often', icon: 'RefreshCw', desc: 'Frequent delays' },
              ].map((seg) => {
                const isSelected = supervisionView === seg.id;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setSupervisionView(seg.id as any)}
                    className={\`p-3.5 rounded-[14px] border-2 text-left transition-all cursor-pointer min-h-[48px] \${
                      isSelected
                        ? 'bg-lavender/50 border-plum text-plum shadow-comic-sm'
                        : 'bg-canvas border-border/40 text-ink hover:bg-canvas/80'
                    }\`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black tracking-tight">{seg.label}</span>
                      <Icon name={seg.icon as any} className={\`w-4 h-4 \${isSelected ? 'text-plum' : 'text-ink-muted'}\`} />
                    </div>
                    <p className="text-[10.5px] text-ink-muted">{seg.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* District & Worker Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-canvas p-3 rounded-[14px] border border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-muted">{lang === 'hi' ? 'जिला:' : 'District:'}</span>
                <select
                  value={supervisionDistrict}
                  onChange={(e) => setSupervisionDistrict(e.target.value)}
                  className="text-xs bg-surface border border-border/60 rounded-[8px] px-2.5 py-1.5 font-medium text-ink focus:outline-hidden"
                >
                  <option value="">{lang === 'hi' ? 'सभी जिले (All)' : 'All Districts'}</option>
                  {Array.from(new Set(roster.map((r) => r.district).filter(Boolean))).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-muted">{lang === 'hi' ? 'कार्यकर्ता:' : 'Worker:'}</span>
                <select
                  value={supervisionWorkerId}
                  onChange={(e) => setSupervisionWorkerId(e.target.value)}
                  className="text-xs bg-surface border border-border/60 rounded-[8px] px-2.5 py-1.5 font-medium text-ink focus:outline-hidden"
                >
                  <option value="">{lang === 'hi' ? 'सभी कार्यकर्ता (All)' : 'All Caseworkers'}</option>
                  {roster.map((r) => (
                    <option key={r.id} value={r.id}>{r.phoneE164} ({r.district})</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={loadSupervisionTasks}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-border/30 text-ink text-xs font-bold rounded-[8px] border border-border/60 transition-colors"
              >
                <Icon name="RefreshCw" className={\`w-3.5 h-3.5 \${supervisionLoading ? 'animate-spin text-plum' : ''}\`} />
                <span>{lang === 'hi' ? 'ताज़ा करें' : 'Refresh'}</span>
              </button>
            </div>

            {/* Supervision Tasks Linelist */}
            <div className="overflow-x-auto rounded-[14px] border border-border/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-canvas border-b border-border/40 text-ink font-black uppercase text-[10.5px] tracking-wider">
                    <th className="py-3 px-4">{lang === 'hi' ? 'क्लाइंट संदर्भ' : 'Client Ref / Name'}</th>
                    <th className="py-3 px-3">{lang === 'hi' ? 'जिला / केंद्र' : 'District / Center'}</th>
                    <th className="py-3 px-3">{lang === 'hi' ? 'नियत तारीख' : 'Due Date'}</th>
                    <th className="py-3 px-3">{lang === 'hi' ? 'जिम्मेदार कार्यकर्ता' : 'Assigned Worker'}</th>
                    <th className="py-3 px-3">{lang === 'hi' ? 'प्रयास / पुनर्निर्धारण' : 'Attempts / Reschedules'}</th>
                    <th className="py-3 px-4 text-center">{lang === 'hi' ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {supervisionLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        <div className="inline-flex items-center gap-2">
                          <Icon name="RefreshCw" className="w-4 h-4 animate-spin text-plum" />
                          <span>{lang === 'hi' ? 'पर्यवेक्षण डेटा लोड हो रहा है...' : 'Loading supervision tasks...'}</span>
                        </div>
                      </td>
                    </tr>
                  ) : supervisionTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        <Icon name="CheckCircle" className="w-8 h-8 mx-auto text-success-ink/40 mb-2" />
                        <p className="font-bold text-xs">
                          {lang === 'hi' ? 'वर्तमान फ़िल्टर में कोई कार्य नहीं है।' : 'No tasks requiring supervision under this view.'}
                        </p>
                        <p className="text-[11px] text-ink-muted/80 mt-0.5">
                          {lang === 'hi' ? 'सभी फॉलो-अप समय पर हैं अथवा सीमा के भीतर हैं।' : 'All client appointments are on track or within threshold.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    supervisionTasks.map((t) => (
                      <tr key={t.taskId} className="hover:bg-canvas/50 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={\`/clients/\${t.clientId}?tab=followup\`} className="font-mono font-bold text-plum hover:underline block">
                            {t.clientRef}
                          </Link>
                          <span className="text-[11px] font-semibold text-ink">{t.clientName}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-ink">{t.district || '—'}</span>
                          <span className="block text-[10.5px] text-ink-muted">{t.centerId}</span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={\`font-bold \${new Date(t.dueDate) < new Date() ? 'text-primary' : 'text-ink'}\`}>
                            {t.dueDate || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {t.assignedWorkerName ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-mint/40 text-success-ink border border-mint">
                              <Icon name="User" className="w-3 h-3" />
                              <span>{t.assignedWorkerName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Icon name="AlertCircle" className="w-3 h-3" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={\`px-2 py-0.5 rounded font-mono text-[10.5px] font-bold \${
                              t.attemptCount >= escalationThreshold ? 'bg-primary text-white' : 'bg-canvas text-ink border border-border/50'
                            }\`}>
                              {t.attemptCount} {t.attemptCount === 1 ? 'attempt' : 'attempts'}
                            </span>
                            {t.rescheduleCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-sun/40 text-warning-ink font-mono text-[10px] font-bold border border-sun">
                                {t.rescheduleCount} resched
                              </span>
                            )}
                          </div>
                          {t.lastAttemptOutcome && (
                            <span className="text-[10px] text-ink-muted block mt-0.5 capitalize">
                              last: {t.lastAttemptOutcome.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setReassignModalTask(t);
                              setReassignTargetWorkerId(t.assignedWorkerId || '');
                              setReassignReason('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lavender hover:bg-plum text-plum hover:text-white text-xs font-bold rounded-[10px] border border-plum/30 transition-all cursor-pointer min-h-[38px] shadow-2xs"
                          >
                            <Icon name="UserCheck" className="w-3.5 h-3.5" />
                            <span>{lang === 'hi' ? 'पुनर्आवंटित करें' : 'Reassign'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
`;

content = content.replace(
  '        {/* TAB 2: STATE LINELIST DIRECTORY */}\n        {activeTab === \'surveys\' && (',
  supervisionTabContent + '\n        {/* TAB 2: STATE LINELIST DIRECTORY */}\n        {activeTab === \'surveys\' && ('
);

// 6. Add Reassign Modal before the closing </div> of return
const reassignModalContent = `
        {/* MODAL: ONE-CLICK REASSIGN TASK WITH REASON & AUDIT TRAIL */}
        {reassignModalTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-in fade-in duration-150" role="dialog" aria-modal="true">
            <div className="bg-surface rounded-[20px] max-w-lg w-full p-6 shadow-comic border-2 border-border/40 space-y-4">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <div>
                  <h3 className="text-base font-black text-ink font-comic">
                    {lang === 'hi' ? 'फॉलो-अप कार्य पुनर्आवंटन' : 'Reassign Follow-up Task'}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Client: <strong className="font-mono text-plum">{reassignModalTask.clientRef}</strong> ({reassignModalTask.clientName})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReassignModalTask(null)}
                  className="p-1 text-ink-muted hover:text-ink rounded-full cursor-pointer"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmReassign} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    {lang === 'hi' ? 'नया फील्ड कार्यकर्ता चुनें *' : 'Select New Field Worker *'}
                  </label>
                  <select
                    required
                    value={reassignTargetWorkerId}
                    onChange={(e) => setReassignTargetWorkerId(e.target.value)}
                    className="w-full text-xs bg-canvas border-2 border-border/50 rounded-[10px] px-3 py-2.5 font-bold text-ink focus:outline-hidden focus:border-plum min-h-[44px]"
                  >
                    <option value="">{lang === 'hi' ? '-- कार्यकर्ता चुनें --' : '-- Choose Worker from Roster --'}</option>
                    {roster
                      .filter((r) => r.status === 'ACTIVE')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.phoneE164} — {r.district}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    {lang === 'hi' ? 'पुनर्आवंटन का कारण (अनिवार्य ऑडिट रिकॉर्ड) *' : 'Reason for Reassignment (Mandatory Audit Trail) *'}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder={lang === 'hi' ? 'उदा. कार्यकर्ता छुट्टी पर है, क्षेत्र परिवर्तन, या बार-बार अनुपलब्ध...' : 'e.g. Previous worker on medical leave, caseload rebalance, or geographic boundary realignment...'}
                    className="w-full text-xs bg-canvas border-2 border-border/50 rounded-[10px] p-3 text-ink focus:outline-hidden focus:border-plum"
                  />
                  <p className="text-[10.5px] text-ink-muted mt-1">
                    This reason is permanently logged in the audit ledger with your identity and IP address.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setReassignModalTask(null)}
                    className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink bg-canvas border border-border/40 rounded-[10px] min-h-[44px] cursor-pointer"
                  >
                    {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={reassignSubmitting || !reassignTargetWorkerId || !reassignReason.trim()}
                    className="px-5 py-2 text-xs font-black text-white bg-primary hover:bg-primary-hover rounded-[10px] shadow-comic-sm disabled:opacity-50 min-h-[44px] cursor-pointer flex items-center gap-1.5"
                  >
                    {reassignSubmitting && <Icon name="RefreshCw" className="w-3.5 h-3.5 animate-spin" />}
                    <span>{reassignSubmitting ? 'Reassigning...' : 'Confirm Reassignment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
`;

content = content.replace(
  '        {/* MODAL: BULK CSV UPLOAD */}',
  reassignModalContent + '\n        {/* MODAL: BULK CSV UPLOAD */}'
);

const finalContent = isCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(path, finalContent, 'utf8');
console.log('Successfully updated frontend/app/admin/page.tsx with Supervision tab and Reassign modal!');
