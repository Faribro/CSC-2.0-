with open('frontend/components/forms/RegistrationForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the new Section B replacement
new_sec_b_block = '''              {/* SECTION B: REPEAT GROUP B2 (Family Members) & B5 CODING GUIDE */}
              {isSecB && (
                <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
                  {/* B5. Reference Legend / Coding Guide from NACO CRF Page 4 */}
                  <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-3.5 text-xs text-slate-800 space-y-2">
                    <div className="font-black text-amber-950 flex items-center gap-2">
                      <Icon name="Info" className="w-4 h-4 text-amber-700" />
                      <span>B5. {isHi ? 'तालिका में जानकारी भरने के लिए कॉलम शीर्षक के अनुसार संख्या चुनें' : 'Pick the number as per column heading to fill the data in the table'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2e. {isHi ? 'जीवित स्थिति (Living)' : 'Living Status'}:</span>
                        <span className="text-slate-600">1. {isHi ? 'जीवित' : 'Alive'} • 2. {isHi ? 'मृत' : 'Dead'}</span>
                      </div>
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2g. {isHi ? 'एचआईवी स्थिति' : 'HIV Status'}:</span>
                        <span className="text-slate-600">1. +ve • 2. -ve • 3. Not Tested • 4. Don&apos;t Know</span>
                      </div>
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2j. {isHi ? 'एआरटी स्थिति' : 'ART Status'}:</span>
                        <span className="text-slate-600">1. Pre-ART • 2. On-ART • 3. New PLHIV</span>
                      </div>
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2k. {isHi ? 'आईडी प्रकार' : 'Type of ID'}:</span>
                        <span className="text-slate-600">1. Pre-ART • 2. On-ART • 3. ICTC PID</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-900/90 font-medium italic">
                      {isHi
                        ? 'नोट: यदि एक से अधिक साथी हों, तो उसे बच्चे की पंक्ति में भरें। गैर-पारंपरिक परिवार सदस्य (MSM/TG/अन्य साथी) भी यहाँ दर्ज करें।'
                        : 'Note: If more than one partner, fill it in the child row. Include non-traditional household members (MSM/TG/other sexual partners).'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>B2. {isHi ? 'परिवार के सदस्य और आश्रित' : 'Family Members & Dependents'}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({formData.b2_members?.length || 0} {isHi ? 'सदस्य' : 'members'})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isHi
                          ? 'कॉलम B2a से B2l तक सभी विवरण भरें (पिता, माता, पति/पत्नी, साथी, बच्चे, गैर-पारंपरिक सदस्य)।'
                          : 'Record columns B2a through B2l for each household member (Father, Mother, Spouse, Partner, Children, Non-traditional members).'}
                      </p>
                    </div>

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="inline-flex items-center gap-1.5 bg-mint/40 hover:bg-mint text-success-ink text-xs font-bold px-3 py-1.5 rounded-lg border border-mint transition-colors"
                      >
                        <Icon name="add" className="w-3.5 h-3.5" />
                        <span>{isHi ? '+ सदस्य जोड़ें' : '+ Add Member'}</span>
                      </button>
                    )}
                  </div>

                  {formData.b2_members && formData.b2_members.length > 0 ? (
                    <div className="space-y-4">
                      {formData.b2_members.map((member, idx) => (
                        <div
                          key={member.id}
                          className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              #{idx + 1} • {member.name || (isHi ? 'नया सदस्य' : 'Family Member')}
                            </span>
                            {!isReadOnly && formData.b2_members.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1"
                              >
                                <Icon name="delete" className="w-3.5 h-3.5" />
                                <span>{isHi ? 'हटाएं' : 'Remove'}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                            {/* B2a. Relationship */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2a. {isHi ? 'रिश्ता' : 'Relationship'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.relationship}
                                onChange={(e) => handleUpdateMember(member.id, 'relationship', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-medium"
                              >
                                {(CHOICE_LISTS['relation'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2b. Full Name */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2b. {isHi ? 'नाम' : 'Full Name'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={member.name}
                                onChange={(e) => handleUpdateMember(member.id, 'name', e.target.value)}
                                placeholder="Name"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2c. Age (years) */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2c. {isHi ? 'उम्र (पूर्ण वर्ष)' : 'Age (Complete years)'}
                              </label>
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={member.age}
                                onChange={(e) => handleUpdateMember(member.id, 'age', e.target.value)}
                                placeholder="Age"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2d. Gender */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2d. {isHi ? 'लिंग' : 'Gender'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.gender}
                                onChange={(e) => handleUpdateMember(member.id, 'gender', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                {(CHOICE_LISTS['gender'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2e. Living Status */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2e. {isHi ? 'जीवित स्थिति' : 'Living Status'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.living || '1'}
                                onChange={(e) => handleUpdateMember(member.id, 'living', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                {(CHOICE_LISTS['living'] || [
                                  { code: '1', labelEn: 'Alive', labelHi: 'जीवित' },
                                  { code: '2', labelEn: 'Dead', labelHi: 'मृत' },
                                ]).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2f. Date of HIV Testing */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2f. {isHi ? 'हाल के HIV टेस्ट की तारीख' : 'Date of HIV Test'}
                              </label>
                              <input
                                type="date"
                                disabled={isReadOnly}
                                value={member.hivDate || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'hivDate', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2g. HIV Status */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2g. {isHi ? 'एचआईवी स्थिति' : 'HIV Status'}
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
                            </div>

                            {/* B2h. Latest CD4 count */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2h. {isHi ? 'नवीनतम CD4 (यदि +ve)' : 'Latest CD4 (If +ve)'}
                              </label>
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={member.cd4 || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'cd4', e.target.value)}
                                placeholder="0–5000"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2i. Latest Viral Load */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2i. {isHi ? 'नवीनतम VL (यदि +ve)' : 'Latest Viral Load (If +ve)'}
                              </label>
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={member.vl || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'vl', e.target.value)}
                                placeholder="Copies / mL"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2j. ART Status */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2j. {isHi ? 'एआरटी स्थिति' : 'ART Status'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.artStatus || '1'}
                                onChange={(e) => handleUpdateMember(member.id, 'artStatus', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-medium"
                              >
                                {(CHOICE_LISTS['artstat'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2k. Type of ID */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2k. {isHi ? 'आईडी प्रकार' : 'Type of ID'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.idType || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'idType', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                <option value="">{isHi ? '-- चुनें --' : '-- Select --'}</option>
                                {(CHOICE_LISTS['idtype'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2k. ID Number */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2k. {isHi ? 'आईडी संख्या' : 'ID Number'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={member.idNumber || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'idNumber', e.target.value)}
                                placeholder="ID Number"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2l. Registered at CSC? */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2l. {isHi ? 'CSC में पंजीकृत?' : 'Registered at CSC?'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.registeredAtCsc || 'no'}
                                onChange={(e) => handleUpdateMember(member.id, 'registeredAtCsc', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                <option value="no">{isHi ? '1. नहीं (No)' : '1. No'}</option>
                                <option value="yes">{isHi ? '2. हाँ (Yes)' : '2. Yes'}</option>
                              </select>
                            </div>

                            {/* B2l. Client CSC ID */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2l. {isHi ? 'क्लाइंट CSC आईडी' : 'Client CSC ID'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly || member.registeredAtCsc !== 'yes'}
                                value={member.cscId || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'cscId', e.target.value)}
                                placeholder={member.registeredAtCsc === 'yes' ? 'CSC ID (e.g. DL-01-0023)' : isHi ? 'पंजीकृत होने पर भरें' : 'If registered at CSC'}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {isHi ? 'कोई परिवार का सदस्य दर्ज नहीं है।' : 'No family members recorded.'}
                    </p>
                  )}
                </div>
              )}
'''

import re
pattern = r'[ \t]*\{/\* SECTION B: REPEAT GROUP B2 \(Family Members\) \*/\}[\s\S]*?\{/\* SECTION D: REPEAT GROUP'
m = re.search(pattern, content)
if m:
    replacement = new_sec_b_block + '\n              {/* SECTION D: REPEAT GROUP'
    content = content[:m.start()] + replacement + content[m.end():]
    with open('frontend/components/forms/RegistrationForm.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully replaced Section B in RegistrationForm.tsx!')
else:
    print('Pattern not matched for Section B replacement!')
