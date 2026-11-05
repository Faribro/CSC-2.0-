import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/components/forms/RegistrationForm.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Patch 1: HIV Status dropdown in B2
hiv_target = '''                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'एचआईवी स्थिति' : 'HIV Status'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.hivStatus}
                                onChange={(e) => handleUpdateMember(member.id, 'hivStatus', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-bold"
                              >
                                <option value="positive">{isHi ? 'पॉजिटिव (Positive)' : 'Positive'}</option>
                                <option value="negative">{isHi ? 'नेगेटिव (Negative)' : 'Negative'}</option>
                                <option value="unknown">{isHi ? 'अज्ञात (Unknown)' : 'Unknown'}</option>
                              </select>
                            </div>'''

hiv_replacement = '''                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'एचआईवी स्थिति' : 'HIV Status'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={
                                  member.hivStatus === 'positive'
                                    ? '1'
                                    : member.hivStatus === 'negative'
                                    ? '2'
                                    : member.hivStatus === 'unknown'
                                    ? '4'
                                    : member.hivStatus || '3'
                                }
                                onChange={(e) => handleUpdateMember(member.id, 'hivStatus', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-bold"
                              >
                                {(CHOICE_LISTS['hivstat'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>'''

text = text.replace(hiv_target.replace('\n', '\r\n'), hiv_replacement.replace('\n', '\r\n'))
text = text.replace(hiv_target, hiv_replacement)

# Patch 2: D5 Scheme dropdown
d5_target = "{(CHOICE_LISTS['d5_scheme'] || []).map((c) => ("
d5_replacement = "{(CHOICE_LISTS['sws'] || CHOICE_LISTS['d5_scheme'] || []).map((c) => ("
text = text.replace(d5_target, d5_replacement)

# Patch 3: J5 Purpose dropdown
j5_target = "{(CHOICE_LISTS['j5_purpose'] || []).map((c) => ("
j5_replacement = "{(CHOICE_LISTS['purpose'] || CHOICE_LISTS['j5_purpose'] || []).map((c) => ("
text = text.replace(j5_target, j5_replacement)

with open('frontend/components/forms/RegistrationForm.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('RegistrationForm.tsx patched successfully!')
