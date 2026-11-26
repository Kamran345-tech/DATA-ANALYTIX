# Phase 2.2 (Part A2) — Adaptive Learning Benchmark Across 17 Datasets

- **Detection Accuracy Before Learning**: 15/17 (88.2%)
- **Detection Accuracy After One Correction**: **17/17 (100.0%)**

| Dataset Scenario | Category | Expected Pack | Detected Before Learning | Confidence Before | Detected After One Correction | Confidence After | Active KPIs After |
|---|---|---|---|---:|---|---:|---:|
| 1. Clean Financial FP&A Ledger | Clean | `financial` | `financial` (✓) | 100% | `financial` (✓) | **100%** | **12/12** |
| 2. Clean Sales Pipeline CRM | Clean | `sales` | `sales` (✓) | 100% | `sales` (✓) | **100%** | **9/9** |
| 3. Clean HR Workforce Roster | Clean | `hr` | `hr` (✓) | 100% | `hr` (✓) | **100%** | **9/9** |
| 4. Clean Product SaaS Telemetry | Clean | `product` | `product` (✓) | 100% | `product` (✓) | **100%** | **9/9** |
| 5. Abbreviated Sales (`dt`, `ae_nm`, `terr`, `bkgs_usd`, `qta_usd`, `won_n`, `opp_n`) | Abbreviated | `sales` | `sales` (✓) | 2% | `sales` (✓) | **100%** | **9/9** |
| 6. Roman-Urdu Retail (`tarikh`, `dukan_naam`, `qism`, `kul_gmv`, `parchi_cnt`, `bika_qty`, `wapsi_amt`) | Roman-Urdu | `retail` | `retail` (✓) | 27% | `retail` (✓) | **100%** | **9/9** |
| 7. Spanish Finance (`fecha_contable`, `unidad_negocio`, `ingresos_brutos`, `costo_ventas`, `gastos_operativos`, `utilidad_neta`) | Other-Language (ES) | `financial` | `marketing` (✗) | 15% | `financial` (✓) | **100%** | **5/12** |
| 8. Abbreviated Operations (`shp_dt`, `dc_hub`, `vnd_cd`, `shp_cnt`, `otif_cnt`, `lt_d`, `fill_p`, `bo_cnt`, `frt_usd`) | Abbreviated | `operations` | `operations` (✓) | 6% | `operations` (✓) | **100%** | **8/9** |
| 9. Cryptic Healthcare (`adm_ts`, `dept_cd`, `hosp_nm`, `enc_cnt`, `readm_n`, `stay_d`, `occ_p`, `er_m`, `tx_usd`) | Abbreviated | `healthcare` | `healthcare` (✓) | 2% | `healthcare` (✓) | **100%** | **9/9** |
| 10. Abbreviated Marketing (`cmp_dt`, `chnl_nm`, `cmp_id`, `spnd_v`, `imp_n`, `clk_n`, `mql_n`, `acq_n`, `rev_attr`) | Abbreviated | `marketing` | `marketing` (✓) | 7% | `marketing` (✓) | **100%** | **9/9** |
| 11. German Manufacturing (`schicht_datum`, `werk_name`, `linie_id`, `stueck_gesamt`, `gut_stueck`, `ausschuss_stueck`, `anlagen_oee`, `stillstand_std`) | Other-Language (DE) | `manufacturing` | `manufacturing` (✓) | 5% | `manufacturing` (✓) | **100%** | **8/9** |
| 12. Abbreviated Banking (`rpt_dt`, `prod_ln`, `br_nm`, `ln_bk`, `dep_bal`, `nii_usd`, `npl_usd`, `prem_usd`, `clm_usd`, `nim_p`) | Abbreviated | `banking-insurance` | `banking-insurance` (✓) | 12% | `banking-insurance` (✓) | **100%** | **9/9** |
| 13. Abbreviated Customer Retention (`coh_dt`, `tier_nm`, `act_accts`, `chrn_accts`, `mrr_v`, `exp_v`, `con_v`, `nps_v`, `clv_v`) | Abbreviated | `customer` | `customer` (✓) | 19% | `customer` (✓) | **100%** | **9/9** |
| 14. Abbreviated Education (`trm_dt`, `deg_prg`, `cmp_mod`, `enr_n`, `grad_n`, `drp_n`, `att_p`, `scr_avg`, `tuit_v`, `inst_c`) | Abbreviated | `education` | `financial` (✗) | 0% | `education` (✓) | **100%** | **9/9** |
| 15. Abbreviated Web Analytics (`vst_dt`, `acq_src`, `dev_cat`, `sess_n`, `pv_n`, `goal_n`, `bnc_p`, `dur_s`, `lcp_v`) | Abbreviated | `web` | `web` (✓) | 2% | `web` (✓) | **100%** | **9/9** |
| 16. Missing Values HR (`rev_dt`, `org_dept`, `fte_n`, `join_n`, `exit_n`, `attr_p`, `tth_d`, `comp_usd`) | Missing Values | `hr` | `hr` (✓) | 15% | `hr` (✓) | **100%** | **8/9** |
| 17. Messy Risk & Fraud (`tx_dt`, `pay_rail`, `tot_tx_n`, `flg_n`, `frd_n`, `fp_n`, `loss_v`, `tpv_v`, `rec_v`) | Messy Currency | `risk-fraud` | `risk-fraud` (✓) | 6% | `risk-fraud` (✓) | **100%** | **9/9** |
