const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Expected fields per section from PDF
const expectedBySection = {
  'sec-a': [
    'a01_reg_date', 'a02_reg_place', 'a03_name', 'a04_age', 'a05_gender', 'a06_abha', 'a07_csc_id', 'a08_consent',
    'a09_artc_name', 'a09_artc_code', 'a10_csc_name', 'a10_csc_code', 'a10_clh_code',
    'a11_res_type', 'a11_door', 'a11_street', 'a11_village', 'a11_block', 'a11_landmark', 'a11_district', 'a11_state', 'a11_pin', 'a11_phone', 'a11_addr_verified', 'a11_phone_verified',
    'a12_same', 'a12_res_type', 'a12_door', 'a12_street', 'a12_village', 'a12_block', 'a12_landmark', 'a12_district', 'a12_state', 'a12_pin', 'a12_phone', 'a12_addr_verified', 'a12_phone_verified',
    'a13_client_type', 'a14_kp', 'a15_typ_other', 'a16_caretaker', 'a17_orphan', 'a18_education', 'a18_in_school', 'a19_occupation',
    'a20_marital', 'a21_income'
  ],
  'sec-b': [
    'b1_family_id', 'b3_total_plhiv', 'b4_eligible_ictc'
  ],
  'sec-c': [
    'c1_hiv_confirmed', 'c2_confirm_date', 'c3_ictc_pid', 'c4_ictc_name', 'c5_route',
    'c6_artc_name', 'c6_artc_type', 'c7_pre_art_date', 'c7a_pre_art_no', 'c8_art_status',
    'c9_art_date', 'c9a_art_no', 'c9b_art_regimen', 'c9c_art_regimen_current',
    'c10_height', 'c10_muac', 'c11_weight', 'c11_who_stage',
    'c12a_cd4_date', 'c12b_cd4_count', 'c12b_cd4_pct',
    'c13a_vl_date', 'c13b_vl_count',
    'c14_tb_history', 'c14_tb_confirm_date', 'c14_att_initiated', 'c14_att_start_date', 'c14_att_comp_date',
    'c15_tb_status', 'c16_tb_family'
  ],
  'sec-d': [
    'd1_linked', 'd1a_services', 'd1_other1', 'd1_other2', 'd1_other3',
    'd2_has_ent', 'd2a_docs', 'd2_other',
    'd3_assessed', 'd4_willing'
  ],
  'sec-e': [
    'e1_sex_work', 'e2_ost', 'e3_needle', 'e4_ost_type', 'e5_condom_knowledge',
    'e6_condom_causal', 'e7_condom_regular', 'e8_condom_paid',
    'e9a_smoking', 'e9b_oral', 'e9c_chewing', 'e9d_alcohol', 'e9e_injecting',
    'e10_diabetic', 'e10_diabetic_details', 'e11_hypertension', 'e11_hypertension_details'
  ],
  'sec-f': [
    'f1_discrimination', 'f2_from_whom'
  ],
  'sec-g': [
    'g1_has_disability', 'g2_disability_types', 'g3_has_cert', 'g4_receives_benefits', 'g4_scheme_name'
  ],
  'sec-h': [
    'h1_death_date', 'h2_death_reason', 'h2_other', 'h3_info_received_date', 'h4_reported_artc',
    'h5_artc_death_date', 'h6_death_place', 'h6_other', 'h7_in_mis_lfu', 'h8_death_cert', 'h_remarks'
  ],
  'sec-j': [
    'j1_checked', 'j2_clh', 'j3_coord', 'j4_comments',
    'j_doc_hiv', 'j_doc_addr', 'j_doc_art',
    'j_dln_registered', 'j_dln_name'
  ]
};

// Check which expected fields are currently present in crfDefinitions
for (const [sec, expectedList] of Object.entries(expectedBySection)) {
  console.log(`\n=== Checking ${sec} ===`);
  const missing = [];
  const present = [];
  expectedList.forEach(f => {
    // Check if name: "f" exists in crfDefinitions
    const re = new RegExp(`name:\\s*"${f}"`);
    if (re.test(content)) {
      present.push(f);
    } else {
      missing.push(f);
    }
  });
  console.log(`Present (${present.length}):`, present.join(', '));
  if (missing.length > 0) {
    console.log(`MISSING (${missing.length}):`, missing.join(', '));
  } else {
    console.log(`ALL EXPECTED FIELDS PRESENT!`);
  }
}
