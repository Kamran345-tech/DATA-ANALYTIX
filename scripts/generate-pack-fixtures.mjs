import fs from 'node:fs';
import path from 'node:path';

const FIXTURES = {
  financial: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Reporting Date,Dept,Rev ($),COGS ($),OPEX ($),Net Profit ($),Current Assets ($),Current Liabilities ($),Accts Rec ($),Accts Pay ($)
2025-01-01,North America,"Rs 1,200,000","Rs 420,000","Rs 310,000","Rs 365,000",2400000,980000,145000,68000
2025-02-01,EMEA,"Rs 950,000","Rs 350,000","Rs 260,000","Rs 255,000",1950000,840000,130000,59000`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,shoba,amdani,laagat,kharcha,munafa,kul_assets,kul_wajibaat,wusooli,adaigi,equity_sarmaya
15/01/2025,Karachi HQ,"PKR 2,500,000","PKR 900,000","PKR 600,000","PKR 800,000",5000000,2000000,300000,150000,3000000
15/02/2025,Lahore North,"PKR 1,800,000","PKR 650,000","PKR 450,000","PKR 550,000",4200000,1700000,240000,120000,2500000`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `fiscalPeriod,businessUnit,grossRevenue,costOfGoodsSold,operatingExpense,netIncome,ebitda,cashBalance,arBalance,apBalance,shareholderEquity
2025-01-01,Cloud Core,1450000,480000,390000,460000,580000,980000,165000,74000,2800000
2025-02-01,Enterprise AI,1620000,520000,410000,540000,690000,1150000,172000,81000,3100000`,
    },
  ],
  sales: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Close Date,Sales Rep,Territory,Total Sales ($),Quota ($),Deals Won,Pipeline ($),Sales Cycle (Days),Discount (%)
2025-01-01,Sarah Chen,NA West,"$420,000","$380,000",14,"$1,250,000",34,6.5%
2025-02-01,Marcus Vance,EMEA North,"$310,000","$320,000",11,"$980,000",41,8.2%`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,faroosh_rep,ilaqa,bikri,hadaf_quota,kamyab_deals,kul_opportunities,pipeline_value,riayat_pct
2025-01-01,Ali Raza,Punjab,"$280,000","$250,000",18,52,"$890,000",5.5%
2025-02-01,Zainab Khan,Sindh,"$340,000","$300,000",22,60,"$1,100,000",4.8%`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `closeDate,accountExecutive,region,closedWonRevenue,quotaTarget,dealsWon,totalOpportunities,pipelineValue,salesCycleDays
2025-01-01,Elena Rostova,APAC,295000,280000,19,58,840000,29
2025-02-01,Devon Brooks,NA East,465000,400000,16,49,1420000,36`,
    },
  ],
  marketing: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Campaign Date,Ad Channel,Campaign Name,Ad Spend ($),Impressions,Ad Clicks,MQL Leads,Conversions,Attributed Rev ($)
2025-01-01,Paid Search,Brand_Q1,"$48,000","1,250,000",38500,1420,310,"$215,000"
2025-02-01,Paid Social,ABM_Enterprise,"$62,000","890,000",19400,860,195,"$278,000"`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,zariya,muhim_naam,ishtihar_kharch,dekhne_wale,clicks,naye_leads,gahaak_bane,muhim_amdani
2025-01-01,Google Ads,Ramzan_Sale,"Rs 85,000",950000,28000,1100,240,"Rs 420,000"
2025-02-01,Meta Ads,Eid_Campaign,"Rs 92,000",1120000,34000,1350,290,"Rs 510,000"`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `campaignDate,utmSource,campaignName,adSpend,impressionsCount,totalClicks,leadsGenerated,conversions,attributedRevenue
2025-01-01,LinkedIn,B2B_Exec,55000,720000,16200,790,185,264000
2025-02-01,Organic,SEO_Hub,14000,1680000,64000,2150,440,312000`,
    },
  ],
  customer: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Cohort Date,Customer Tier,Active Customers,Churned Customers,MRR ($),Expansion MRR ($),Contraction MRR ($),NPS Score,CLV ($)
2025-01-01,Enterprise,420,6,"$840,000","$92,000","$18,000",64,"$48,000"
2025-02-01,Mid-Market,1280,38,"$640,000","$54,000","$22,000",51,"$19,500"`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,gahak_darja,faal_gahak,chorne_wale_gahak,mahana_amdani,izafi_mrr,kami_mrr,nps_score,shikayat_tickets
2025-01-01,VIP Tier,310,5,620000,68000,12000,66,45
2025-02-01,Standard Tier,940,28,470000,39000,16000,52,180`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `cohortMonth,customerSegment,activeCustomers,churnedCustomers,monthlyRecurringRevenue,expansionMrr,contractionMrr,npsScore,ltvEstimate
2025-01-01,Enterprise,455,4,935000,118000,14000,69,52500
2025-02-01,SMB,3400,170,510000,31000,29000,42,6800`,
    },
  ],
  product: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Event Date,Feature Module,Platform,DAU,MAU,Activated Users,Signups,Feature Events,Avg Latency (ms),Crash Rate (%)
2025-01-01,SQL Workbench,Web Desktop,14200,38000,3150,4800,192000,145,0.18%
2025-02-01,AI Copilot,Web Desktop,16400,41000,3680,5200,248000,188,0.22%`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,product_hissa,platform,rozana_users,mahana_users,faal_signups,naye_signups,istemal_count,intezar_ms,kharabi_sharah
2025-01-01,Dashboard Studio,Web,18900,44500,4120,5600,310000,132,0.14%
2025-02-01,Mobile Viewer,iOS,8900,29000,1920,3100,94000,210,0.45%`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `eventDate,featureArea,devicePlatform,dailyActiveUsers,monthlyActiveUsers,activatedUsers,newSignups,eventCount,latencyMs,crashRatePct
2025-01-01,Connector Hub,Web,12800,36500,2890,4300,154000,162,0.25
2025-02-01,Report Builder,Android,6400,24000,1410,2400,72000,240,0.52`,
    },
  ],
  web: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Visit Date,Traffic Source,Device,Landing Page,Web Sessions,Page Views,Goal Conversions,Bounce Rate (%),LCP (ms)
2025-01-01,Organic Search,Mobile,/pricing,"18,400","58,880",790,34.2%,1850
2025-02-01,Paid Search,Desktop,/demo,"9,200","31,280",480,38.5%,1620`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,zariya,upkaran,safha,mulakaat,safha_views,tabdeeli,waapsi_dar,raftaar_ms,naye_visitors
2025-01-01,Google Organic,Mobile,/home,21000,68000,890,32.5%,1720,14500
2025-02-01,Direct Traffic,Desktop,/enterprise,15400,51200,670,29.4%,1580,8200`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `sessionDate,trafficSource,deviceCategory,landingPage,totalSessions,totalPageviews,goalCompletions,bounceRate,largestContentfulPaint,uniqueVisitors
2025-01-01,Organic Search,Desktop,/features,22400,76200,980,31.0,1690,15200
2025-02-01,Referral,Tablet,/pricing,6200,19800,275,35.2,1910,4100`,
    },
  ],
  operations: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Ship Date,Warehouse DC,Supplier,Shipments,On-Time Shipments,Lead Time (Days),Fill Rate (%),Stock on Hand,Backorders,Freight Cost ($)
2025-01-01,Chicago DC,Apex Logistics,"4,200","4,032",3.8,97.4%,68000,65,"$142,800"
2025-02-01,Newark Hub,GlobalFreight,"5,100","4,845",4.2,96.1%,82000,110,"$188,700"`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `rawangi_date,godown,tamaam_supplier,kheep,waqt_par_delivery,intezar_din,poori_supply_pct,maal_stock,ruke_orders,bhejna_kharcha,stock_gardish
2025-01-01,Lahore Godown,Pak Cargo,3800,3650,3.5,96.8%,54000,45,"Rs 125,000",9.4
2025-02-01,Karachi Port Hub,Swift Freight,4600,4370,4.1,95.5%,72000,88,"Rs 164,000",8.8`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `dispatchDate,distributionCenter,carrierVendor,shipmentsCount,otifOrders,leadTimeDays,fillRatePct,inventoryUnits,backorderUnits,logisticsCost,inventoryTurnover
2025-01-01,Dallas Hub,PrimeCarrier,3950,3810,3.6,98.1,59000,40,128400,9.6
2025-02-01,Atlanta DC,Apex Logistics,4400,4220,3.9,97.2,64000,58,146200,9.1`,
    },
  ],
  hr: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Review Period,Department,Office Location,Active Employees,New Hires,Terminations,Attrition Rate (%),Time to Hire (Days),Total Payroll ($),eNPS
2025-01-01,Engineering,Remote US,340,24,8,9.4%,38,"$5,440,000",48
2025-02-01,Sales,New York,210,19,11,14.8%,29,"$2,730,000",39`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,shoba,daftar,mulazim,naye_bharti,chorne_wale,chorne_ki_dar,bharti_waqt_din,tankhwah,mulazim_khushi,khawateen_pct
2025-01-01,Software Eng,Islamabad,280,20,6,8.5%,34,"Rs 4,200,000",52,38%
2025-02-01,Customer Care,Lahore,190,16,9,12.4%,25,"Rs 1,900,000",44,54%`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `reviewPeriod,orgUnit,officeLocation,activeEmployees,newHires,attritionCount,turnoverRate,timeToHireDays,payrollCost,engagementScore,diversityPct
2025-01-01,Product Design,San Francisco,95,7,2,8.1,41,1567500,54,49
2025-02-01,Finance Ops,London,82,5,2,7.6,31,1025000,47,52`,
    },
  ],
  'risk-fraud': [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Tx Date,Payment Method,Rule Type,Total Tx,Flagged Alerts,Confirmed Fraud,False Positives,Fraud Loss ($),Gross Volume ($),Recovered ($),Risk Score
2025-01-01,CNP Credit Card,ATO Stuffing,"420,000","3,150",680,620,"$94,000","$84,000,000","$41,000",28
2025-02-01,Instant Wire,Synthetic ID,"85,000",980,195,210,"$62,000","$51,000,000","$29,000",34`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,zariya,qism,len_den,mashkook_tx,tasdeeq_dhoka,ghalat_alert,dhoka_nuqsan,kul_raqam,wapas_raqam,khatra_score
2025-01-01,Debit Card,PIN Attack,310000,1950,420,380,"Rs 52,000","Rs 64,000,000","Rs 24,000",24
2025-02-01,Mobile Wallet,Phishing,260000,1480,310,290,"Rs 38,000","Rs 49,000,000","Rs 19,000",21`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `alertDate,paymentMethod,fraudType,totalTransactions,suspiciousTx,confirmedFraud,falsePositives,fraudLoss,processedAmount,preventedLoss,anomalyScore
2025-01-01,Digital Wallet,Velocity Spike,315000,1860,410,340,48000,62000000,24500,22
2025-02-01,ACH Direct,AML Structuring,148000,720,130,145,39000,72500000,21000,19`,
    },
  ],
  healthcare: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Admission Date,Specialty Ward,Hospital,Patient Admissions,30d Readmissions,ALOS (Days),Bed Occupancy (%),ER Wait (Mins),Treatment Cost ($),HCAHPS Score
2025-01-01,Cardiology,Metro General,620,58,4.8,88%,26,"$4,960,000",89
2025-02-01,Orthopedics,Westside Surgical,480,24,3.4,82%,21,"$4,320,000",92`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,ward_name,aspatal,dakhila,dobara_dakhila,qiyam_din,bistar_occupancy,intezar_mins,ilaaj_kharcha,mareez_itminan
2025-01-01,General Medicine,City Shifakhana,780,64,4.5,86%,29,"Rs 3,900,000",87
2025-02-01,Pediatrics,Children Hospital,540,32,3.2,81%,19,"Rs 2,700,000",93`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `admissionDate,serviceLine,medicalCenter,patientAdmissions,repeatAdmissions,lengthOfStay,bedOccupancyPct,waitTimeMins,encounterCost,patientSatisfaction
2025-01-01,Oncology,University Medical,410,31,5.6,85,19,5740000,94
2025-02-01,Emergency Trauma,Metro General,1120,96,2.9,93,42,4480000,81`,
    },
  ],
  retail: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `POS Date,Store Outlet,Merchandise Category,GMV ($),Receipt Baskets,Units Sold,Returned Value ($),Store Footfall,Sell-Through (%),Markdown ($)
2025-01-01,NYC Flagship,Apparel,"$640,000","4,800","14,400","$51,200","18,500",74%,"$38,400"
2025-02-01,LA Beverly,Footwear,"$890,000","6,900","17,250","$89,000","42,000",78%,"$44,500"`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,dukaan,maal_qism,kul_bikri_gmv,parchi_count,bika_maal,wapsi_raqam,gahak_aamad,bikri_sharah,riayat_raqam
2025-01-01,Dolmen Mall,Kapray,"Rs 820,000",5400,16200,"Rs 49,000",22000,76%,"Rs 35,000"
2025-02-01,Packages Mall,Jootay,"Rs 690,000",4600,13800,"Rs 41,000",19500,73%,"Rs 29,000"`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `saleDate,storeName,merchandiseCategory,grossMerchandiseValue,baskets,unitsSold,returnedValue,storeTraffic,sellThroughPct,clearanceMarkdown
2025-01-01,Chicago Mich Ave,Outerwear,520000,3400,8840,41600,13800,71,36400
2025-02-01,E-Commerce EU,Accessories,760000,5800,16240,68400,36500,76,45600`,
    },
  ],
  manufacturing: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Production Date,Factory Plant,Assembly Line,Produced Units,Good Units,Scrap Units,OEE (%),Unplanned Downtime (Hrs),Manufacturing Cost ($),Cycle Time (Sec)
2025-01-01,Detroit Stamping,Line A-1,"48,000","47,040",960,86.5%,14,"$576,000",22
2025-02-01,Stuttgart Precision,Line C-1,"39,000","38,415",585,89.8%,9,"$546,000",20`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,karkhana,machine_line,kul_paidawar,sahi_maal,kharab_maal,machine_oee,band_ghante,paidawar_laagat,fi_unit_sec
2025-01-01,Faisalabad Textile,Loom Line 1,52000,50960,1040,85.4%,15,"Rs 620,000",21
2025-02-01,Sialkot Assembly,Line B-2,44000,42900,1100,83.2%,18,"Rs 510,000",24`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `productionDate,manufacturingPlant,assemblyLine,producedUnits,conformingUnits,scrapUnits,equipmentEffectiveness,unplannedDowntime,manufacturingCost,cycleTimeSec
2025-01-01,Guadalajara Plant,Line B-1,46000,44988,1012,84.9,16,496800,23
2025-02-01,Detroit Stamping,Line A-2,44500,43388,1112,83.4,19,534000,23`,
    },
  ],
  'banking-insurance': [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Reporting Date,Product Line,Credit Tier,Gross Loans ($),Total Deposits ($),Net Interest Income ($),NPL Balance ($),Earned Premium ($),Claims Paid ($),NIM (%),Loss Ratio (%)
2025-01-01,Commercial RE,Prime (A+),"$145,000,000","$172,000,000","$4,350,000","$1,885,000","$6,200,000","$3,596,000",3.45%,58.0%
2025-02-01,Residential Mortgage,Super Prime (AA),"$210,000,000","$245,000,000","$5,880,000","$1,680,000","$8,400,000","$4,704,000",3.15%,56.0%`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,qarza_qism,credit_darja,kul_qarza,bank_jama,sood_amdani,dooba_qarza,bima_qist,bima_claim,sood_margin,nuqsan_sharah
2025-01-01,SME Qarza,Prime A,"Rs 95,000,000","Rs 115,000,000","Rs 3,400,000","Rs 1,520,000","Rs 4,500,000","Rs 2,700,000",3.65%,60.0%
2025-02-01,Auto Leasing,Near Prime B,"Rs 72,000,000","Rs 84,000,000","Rs 2,880,000","Rs 1,800,000","Rs 3,800,000","Rs 2,508,000",4.05%,66.0%`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `reportingDate,loanType,riskGrade,loanPortfolio,totalDeposits,netInterestIncome,nonPerformingLoans,earnedPremium,incurredClaims,netInterestMargin,claimsRatio
2025-01-01,Working Capital,Prime A,112000000,134000000,3920000,1904000,4800000,2928000,3.65,61.0
2025-02-01,Property Casualty,Prime A+,94000000,115000000,3102000,1410000,9200000,5796000,3.30,63.0`,
    },
  ],
  education: [
    {
      file: 'fixture-1-abbreviated-symbols.csv',
      csv: `Term Date,Academic Program,Campus Modality,Enrolled Students,Completed Graduates,Dropped Students,Attendance Rate (%),Test Score,Tuition Revenue ($),Instruction Cost ($)
2025-01-01,Computer Science & AI,Main Campus,"1,250","1,125",62,93%,86,"$15,000,000","$8,750,000"
2025-02-01,Business Analytics,Online Hybrid,980,862,68,89%,84,"$10,780,000","$5,880,000"`,
    },
    {
      file: 'fixture-2-roman-urdu.csv',
      csv: `tareekh,nisab,idara,dakhila_talaba,kamyab_talaba,chorne_wale_talaba,hazri_pct,imtihan_score,parhai_fees,taleem_kharcha
2025-01-01,Software Engineering,Lahore Campus,1100,990,55,92%,85,"Rs 12,000,000","Rs 7,100,000"
2025-02-01,Data Science,Online Academy,850,748,52,88%,83,"Rs 8,500,000","Rs 4,900,000"`,
    },
    {
      file: 'fixture-3-camelcase.csv',
      csv: `semesterDate,courseName,deliveryMode,enrolledStudents,completedStudents,withdrawn,attendanceRate,assessmentScore,tuitionRevenue,instructionCost
2025-01-01,Nursing Health,Medical Campus,740,688,29,96,88,9620000,6290000
2025-02-01,Data Engineering,Main Campus,860,782,43,94,87,10320000,5848000`,
    },
  ],
};

const baseDir = path.resolve('tests/fixtures');
let count = 0;
for (const [packId, items] of Object.entries(FIXTURES)) {
  const dir = path.join(baseDir, packId);
  fs.mkdirSync(dir, { recursive: true });
  for (const item of items) {
    fs.writeFileSync(path.join(dir, item.file), item.csv.trim() + '\n', 'utf8');
    count++;
  }
}
console.log(`Generated ${count} messy CSV fixtures across ${Object.keys(FIXTURES).length} packs.`);
