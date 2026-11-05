with open('frontend/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add statesList
target_1 = "  const [leadershipSelectedState, setLeadershipSelectedState] = useState<string>('ALL');"
replacement_1 = target_1 + "\n  const [statesList, setStatesList] = useState<Array<{ stateCode: string; stateName: string }>>([]);"
assert target_1 in text, "target_1 not found"
text = text.replace(target_1, replacement_1, 1)

# 2. Add availableDistricts
target_2 = "  const [successMessage, setSuccessMessage] = useState<string | null>(null);"
dist_block = """  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic Districts derived from roster, supervision tasks, and reference data
  const availableDistricts = Array.from(
    new Set([
      ...roster.map((r) => r.district).filter(Boolean),
      ...supervisionTasks.map((t) => t.district).filter(Boolean),
      'Pune', 'Mumbai Suburban', 'Thane', 'Solapur', 'Nashik', 'Nagpur', 'Kolhapur', 'Aurangabad'
    ])
  ).sort();"""
assert target_2 in text, "target_2 not found"
text = text.replace(target_2, dist_block, 1)

# 3. Add states fetch to loadDashboardData
target_3 = "      // 1. Fetch Stats"
replacement_3 = """      // 0. Fetch States Reference
      fetch('/api/v1/evaluation/states')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => { if (Array.isArray(data)) setStatesList(data); })
        .catch(() => {});

      // 1. Fetch Stats"""
assert target_3 in text, "target_3 not found"
text = text.replace(target_3, replacement_3, 1)

# 4. Replace MAHARASHTRA_DISTRICTS
target_4 = "{MAHARASHTRA_DISTRICTS.map((dist) => ("
replacement_4 = "{availableDistricts.map((dist) => ("
assert target_4 in text, "target_4 not found"
text = text.replace(target_4, replacement_4, 1)

# 5. Leadership scope selector
target_5 = """                  <select
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
replacement_5 = """                  <select
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
assert target_5 in text, "target_5 not found"
text = text.replace(target_5, replacement_5, 1)

# 6. Leadership overview indicators
target_6 = """              {/* LEADERSHIP TAB 1: CALM STRATEGIC INDICATORS WITH EXPLICIT DENOMINATORS */}
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

replacement_6 = """              {/* LEADERSHIP TAB 1: CALM STRATEGIC INDICATORS WITH EXPLICIT DENOMINATORS */}
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
assert target_6 in text, "target_6 not found"
text = text.replace(target_6, replacement_6, 1)

# 7. Add Synthetic Benchmark banner to District Performance table
target_7 = """              {/* LEADERSHIP TAB 2: DISTRICT PERFORMANCE RANKING TABLE */}
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

replacement_7 = """              {/* LEADERSHIP TAB 2: DISTRICT PERFORMANCE RANKING TABLE */}
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
assert target_7 in text, "target_7 not found"
text = text.replace(target_7, replacement_7, 1)

with open('frontend/app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("apply_admin_clean finished successfully!")
