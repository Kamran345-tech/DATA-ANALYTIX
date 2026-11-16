export type RfmSegmentName =
  | 'Champions'
  | 'Loyal Customers'
  | 'Potential Loyalists'
  | 'At Risk'
  | 'Hibernating';

export interface RfmCustomerRecord {
  customer: string;
  recency: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfmScore: number;
  segment: RfmSegmentName;
}

export interface RfmSegmentSummary {
  segment: RfmSegmentName;
  count: number;
  sharePct: number;
  totalMonetary: number;
  monetarySharePct: number;
}

export interface RfmSegmentationResult {
  customers: RfmCustomerRecord[];
  segments: RfmSegmentSummary[];
  topSegment: RfmSegmentName | null;
  summary: string;
}

function assignQuintileScore(
  value: number,
  sortedAsc: number[],
  invert = false
): number {
  if (sortedAsc.length <= 1) return 3;
  const n = sortedAsc.length;
  let rank = sortedAsc.findIndex((v) => v >= value);
  if (rank === -1) rank = n - 1;
  const pct = rank / (n - 1);
  const rawScore = Math.min(5, Math.max(1, Math.floor(pct * 5) + 1));
  return invert ? 6 - rawScore : rawScore;
}

/**
 * Performs RFM (Recency, Frequency, Monetary) customer segmentation.
 * Lower recency (fewer days since last purchase) gets a higher R score.
 */
export function computeRfmSegmentation(
  rows: Record<string, any>[],
  customerField: string,
  recencyField: string,
  frequencyField: string,
  monetaryField: string
): RfmSegmentationResult {
  if (!rows || rows.length === 0) {
    return {
      customers: [],
      segments: [],
      topSegment: null,
      summary: 'No customer records provided for RFM segmentation.',
    };
  }

  // Aggregate per customer
  const custMap = new Map<
    string,
    { recency: number; frequency: number; monetary: number }
  >();
  for (const r of rows) {
    const cust = String(r[customerField] ?? '').trim();
    if (!cust) continue;
    const rec = Number(r[recencyField]);
    const freq = Number(r[frequencyField]);
    const mon = Number(r[monetaryField]);

    const prev = custMap.get(cust);
    if (!prev) {
      custMap.set(cust, {
        recency: Number.isFinite(rec) ? rec : 30,
        frequency: Number.isFinite(freq) ? freq : 1,
        monetary: Number.isFinite(mon) ? mon : 0,
      });
    } else {
      custMap.set(cust, {
        recency: Number.isFinite(rec) ? Math.min(prev.recency, rec) : prev.recency,
        frequency: prev.frequency + (Number.isFinite(freq) ? freq : 1),
        monetary: prev.monetary + (Number.isFinite(mon) ? mon : 0),
      });
    }
  }

  const entries = Array.from(custMap.entries());
  if (entries.length === 0) {
    return {
      customers: [],
      segments: [],
      topSegment: null,
      summary: 'No valid customer entities found.',
    };
  }

  const sortedRec = entries.map(([, v]) => v.recency).sort((a, b) => a - b);
  const sortedFreq = entries.map(([, v]) => v.frequency).sort((a, b) => a - b);
  const sortedMon = entries.map(([, v]) => v.monetary).sort((a, b) => a - b);

  const customers: RfmCustomerRecord[] = entries.map(([customer, vals]) => {
    const rScore = assignQuintileScore(vals.recency, sortedRec, true); // lower recency days = better
    const fScore = assignQuintileScore(vals.frequency, sortedFreq, false);
    const mScore = assignQuintileScore(vals.monetary, sortedMon, false);
    const rfmScore = rScore * 100 + fScore * 10 + mScore;

    let segment: RfmSegmentName;
    if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
      segment = 'Champions';
    } else if (fScore >= 4 && mScore >= 3) {
      segment = 'Loyal Customers';
    } else if (rScore >= 3 && (fScore >= 2 || mScore >= 3)) {
      segment = 'Potential Loyalists';
    } else if (rScore <= 2 && (fScore >= 3 || mScore >= 3)) {
      segment = 'At Risk';
    } else {
      segment = 'Hibernating';
    }

    return {
      customer,
      recency: Number(vals.recency.toFixed(1)),
      frequency: Number(vals.frequency.toFixed(1)),
      monetary: Number(vals.monetary.toFixed(2)),
      rScore,
      fScore,
      mScore,
      rfmScore,
      segment,
    };
  });

  const totalCustomers = customers.length;
  const grandMonetary =
    customers.reduce((sum, c) => sum + c.monetary, 0) || 1;

  const segmentOrder: RfmSegmentName[] = [
    'Champions',
    'Loyal Customers',
    'Potential Loyalists',
    'At Risk',
    'Hibernating',
  ];

  const segments: RfmSegmentSummary[] = segmentOrder.map((segName) => {
    const matching = customers.filter((c) => c.segment === segName);
    const totalMon = matching.reduce((s, c) => s + c.monetary, 0);
    return {
      segment: segName,
      count: matching.length,
      sharePct: Number(((matching.length / totalCustomers) * 100).toFixed(1)),
      totalMonetary: Number(totalMon.toFixed(2)),
      monetarySharePct: Number(((totalMon / grandMonetary) * 100).toFixed(1)),
    };
  });

  const topSeg = [...segments].sort((a, b) => b.totalMonetary - a.totalMonetary)[0];

  return {
    customers,
    segments,
    topSegment: topSeg ? topSeg.segment : null,
    summary: `Segmented ${totalCustomers} customers into 5 RFM tiers. ${
      topSeg ? `${topSeg.segment} drives ${topSeg.monetarySharePct}% of total monetary value.` : ''
    }`,
  };
}
