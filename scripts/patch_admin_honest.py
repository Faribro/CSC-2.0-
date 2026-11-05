import re

path = 'frontend/app/admin/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add statesList state
state_pattern = r"(const \[leadershipSelectedState, setLeadershipSelectedState\] = useState<string>\('ALL'\);)"
state_replacement = r"""\1
  const [statesList, setStatesList] = useState<Array<{ stateCode: string; stateName: string }>>([]);"""

if 'const [statesList, setStatesList]' not in content:
    content = re.sub(state_pattern, state_replacement, content, count=1)

# 2. Add availableDistricts computation and fetch states in useEffect
effect_pattern = r"(// Stats & Data\n  const \[stats, setStats\] = useState<EvaluationStats \| null>\(null\);)"
effect_replacement = r"""// Dynamic Districts derived from roster, supervision tasks, and reference data
  const availableDistricts = Array.from(
    new Set([
      ...roster.map((r) => r.district).filter(Boolean),
      ...supervisionTasks.map((t) => t.district).filter(Boolean),
      'Pune', 'Mumbai Suburban', 'Thane', 'Solapur', 'Nashik', 'Nagpur', 'Kolhapur', 'Aurangabad'
    ])
  ).sort();

  \1"""

if 'const availableDistricts' not in content:
    content = re.sub(effect_pattern, effect_replacement, content, count=1)

# 3. Add states fetch to loadDashboardData
fetch_states = """      // 0. Fetch States Reference
      fetch('/api/v1/evaluation/states')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => { if (Array.isArray(data)) setStatesList(data); })
        .catch(() => {});
"""
if '// 0. Fetch States Reference' not in content:
    content = content.replace("try {\n      // 1. Fetch Stats", "try {\n" + fetch_states + "\n      // 1. Fetch Stats")

# 4. Replace MAHARASHTRA_DISTRICTS
content = content.replace("{MAHARASHTRA_DISTRICTS.map((dist) => (", "{availableDistricts.map((dist) => (")

# 5. Replace hardcoded states in Leadership Scope Selector
old_scope_select = """                  <select
                    value={leadershipSelectedState}
                    onChange={(e) => setLeadershipSelectedState(e.target.value)}
                    className="text-xs font-bold bg-canvas border border-border/50 rounded-[8px] px-2.5 py-1 text-ink"
                  >
                    <option value="ALL">National Aggregate (All India)</option>
                    <option value="MH">Maharashtra</option>
                    <option value="WB">West Bengal</option>
                    <option value="DL">Delhi</option>
                    <option value="KA">Karnataka</option>
                    <option value="TN">Tamil Nadu</option>
                  </select>"""

new_scope_select = """                  <select
                    value={leadershipSelectedState}
                    onChange={(e) => setLeadershipSelectedState(e.target.value)}
                    className="text-xs font-bold bg-canvas border border-border/50 rounded-[8px] px-2.5 py-1 text-ink"
                  >
                    <option value="ALL">National Aggregate (All India)</option>
                    {statesList.map((st) => (
                      <option key={st.stateCode} value={st.stateCode}>
                        {st.stateName} ({st.stateCode})
                      </option>
                    ))}
                  </select>"""

content = content.replace(old_scope_select, new_scope_select)

# 6. Add Sample Data Banner & Verified indicator cards to Leadership Overview
old_leadership_overview = """              {/* LEADERSHIP TAB 1: CALM STRATEGIC INDICATORS WITH EXPLICIT DENOMINATORS */}
              {activeTab === 'leadership_overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Indicator 1: Active Cohort */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Active Enrolled Cohort</span>
                          <Icon name="Users" className="w-4 h-4 text-plum" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">540</span>
                          <span className="text-xs font-bold text-success-ink">Active Individuals</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted">
                        <strong>Denominator:</strong> 540 registered beneficiaries active in CSC centers across evaluated scope
                      </div>
                    </div>

                    {/* Indicator 2: 6-Month Retention Rate */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>6-Month Routine Retention</span>
                          <Icon name="Heart" className="w-4 h-4 text-primary" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">88.5%</span>
                          <span className="text-xs font-bold text-success-ink font-mono">478 / 540</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted">
                        <strong>Definition:</strong> Attended scheduled ART refills and care visits within ±7 days of due date
                      </div>
                    </div>

                    {/* Indicator 3: Viral Load Suppression */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Viral Load Suppression</span>
                          <Icon name="ShieldCheck" className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">94.2%</span>
                          <span className="text-xs font-bold text-emerald-700 font-mono">438 / 465</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted">
                        <strong>Definition:</strong> Documented undetectable or suppressed viral load (&lt;1000 copies/mL) among tested cohort
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Indicator 4: Routine Follow-up Completion */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Outreach Visit Completion</span>
                          <Icon name="Activity" className="w-4 h-4 text-plum" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-ink font-comic">91.6%</span>
                          <span className="text-xs font-bold text-ink-muted font-mono">1,210 of 1,321 visits completed</span>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/30 text-[10.5px] text-ink-muted">
                        <strong>Numerator/Denominator:</strong> Field contacts completed vs total visits scheduled under J5 protocol
                      </div>
                    </div>

                    {/* Indicator 5: LFU Tracing Recovery Rate */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Lost-to-Follow-Up Recovery</span>
                          <Icon name="RotateCcw" className="w-4 h-4 text-warning-ink" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-ink font-comic">74.4%</span>
                          <span className="text-xs font-bold text-warning-ink font-mono">32 of 43 recovered</span>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/30 text-[10.5px] text-ink-muted">
                        <strong>Rule Standard:</strong> Weekly outreach contact until definite re-engagement at ART Center
                      </div>
                    </div>
                  </div>"""

new_leadership_overview = """              {/* LEADERSHIP TAB 1: CALM STRATEGIC INDICATORS WITH EXPLICIT DENOMINATORS */}
              {activeTab === 'leadership_overview' && (
                <div className="space-y-4">
                  {/* Sample Demonstration Data Banner */}
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-[16px] p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-200 border border-amber-400 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
                        <Icon name="AlertCircle" className="w-4 h-4 text-amber-800" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                            {lang === 'hi' ? 'नमूना प्रदर्शन डेटा • नाको अनुमोदन लंबित' : 'Sample Demonstration Data • Pending NACO Approval'}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                            SYNTHETIC DEMO
                          </span>
                        </div>
                        <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                          {lang === 'hi'
                            ? 'यह रणनीतिक डैशबोर्ड अभी प्रारूप (DRAFT) स्थिति में है। वास्तविक नैदानिक निर्णय लेने से पहले संकेतकों की परिभाषाओं को नाको (NACO) द्वारा अनुमोदित किया जाना आवश्यक है। नीचे दिए गए आंकड़े प्रदर्शन नमूना डेटा हैं।'
                            : 'Strategic indicators displayed below reflect draft programmatic definitions pending formal NACO/SACS approval. Clinical and operational decisions must not be taken from these demonstration values until verified.'}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-amber-800 font-bold bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 whitespace-nowrap">
                      Status: DRAFT v1.0
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Indicator 1: Active Cohort */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Active Enrolled Cohort</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">
                            {stats?.totalSurveys ? stats.totalSurveys : '540'}
                          </span>
                          <span className="text-xs font-bold text-success-ink">
                            {stats?.totalSurveys ? 'Live Enrolled' : 'Active Individuals [Sample]'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Total active registered beneficiaries receiving CSC outreach services in scope.</div>
                        <div><strong>Numerator:</strong> {stats?.totalSurveys ? stats.totalSurveys : '540'} active clients in registry</div>
                        <div><strong>Denominator:</strong> {stats?.totalSurveys ? stats.totalSurveys : '540'} total registrations in scope</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Live DB Cache / Demo)</div>
                      </div>
                    </div>

                    {/* Indicator 2: 6-Month Retention Rate */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>6-Month Routine Retention</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">88.5%</span>
                          <span className="text-xs font-bold text-success-ink font-mono">478 / 540 [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Attended scheduled ART refills and care visits within ±7 days of due date over 6 months.</div>
                        <div><strong>Numerator:</strong> 478 attended on schedule</div>
                        <div><strong>Denominator:</strong> 540 total cohort due for 6-month check</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Synthetic Demo)</div>
                      </div>
                    </div>

                    {/* Indicator 3: Viral Load Suppression */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Viral Load Suppression</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">94.2%</span>
                          <span className="text-xs font-bold text-emerald-700 font-mono">438 / 465 [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Documented undetectable or suppressed viral load (&lt;1000 copies/mL) among tested cohort.</div>
                        <div><strong>Numerator:</strong> 438 suppressed (&lt;1000 copies/mL)</div>
                        <div><strong>Denominator:</strong> 465 tested in 12-month cohort</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Synthetic Demo)</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Indicator 4: Routine Follow-up Completion */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Outreach Visit Completion</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-ink font-comic">91.6%</span>
                          <span className="text-xs font-bold text-ink-muted font-mono">1,210 of 1,321 visits completed [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Field outreach contacts completed vs total visits scheduled under Section J.2 protocol.</div>
                        <div><strong>Numerator:</strong> 1,210 completed contacts</div>
                        <div><strong>Denominator:</strong> 1,321 scheduled visits in period</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Synthetic Demo)</div>
                      </div>
                    </div>

                    {/* Indicator 5: LFU Tracing Recovery Rate */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Lost-to-Follow-Up Recovery</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-ink font-comic">74.4%</span>
                          <span className="text-xs font-bold text-warning-ink font-mono">32 of 43 recovered [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Beneficiaries classified as LFU who were tracked by caseworkers and confirmed re-linked to ART Care within 90 days.</div>
                        <div><strong>Numerator:</strong> 32 confirmed re-linked to ART</div>
                        <div><strong>Denominator:</strong> 43 active LFU cases tracked</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Synthetic Demo)</div>
                      </div>
                    </div>
                  </div>"""

content = content.replace(old_leadership_overview, new_leadership_overview)

# 7. Add Synthetic Benchmark banner to District Performance table
old_district_table_header = """              {/* LEADERSHIP TAB 2: DISTRICT PERFORMANCE RANKING TABLE */}
              {activeTab === 'leadership_districts' && (
                <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic overflow-hidden">
                  <div className="p-4 border-b border-border/30 bg-canvas/40">
                    <h2 className="text-sm font-black text-ink font-comic">
                      Aggregated District Performance & Retention Rankings
                    </h2>
                    <p className="text-[11px] text-ink-muted">
                      Evaluated across active CSC centers. Zero personal client information exposed.
                    </p>
                  </div>"""

new_district_table_header = """              {/* LEADERSHIP TAB 2: DISTRICT PERFORMANCE RANKING TABLE */}
              {activeTab === 'leadership_districts' && (
                <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic overflow-hidden">
                  <div className="p-4 border-b border-border/30 bg-canvas/40">
                    <h2 className="text-sm font-black text-ink font-comic">
                      Aggregated District Performance & Retention Rankings
                    </h2>
                    <p className="text-[11px] text-ink-muted">
                      Evaluated across active CSC centers. Zero personal client information exposed.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-2">
                    <Icon name="AlertCircle" className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>[SYNTHETIC BENCHMARK: Demonstration district indicators from synthetic test registry. Zero personal client data is exposed.]</span>
                  </div>"""

content = content.replace(old_district_table_header, new_district_table_header)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched admin page with honest indicators, dynamic reference states, and synthetic banners.")
