import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Key, 
  Globe, 
  ShieldCheck, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Zap, 
  Lock, 
  Eye, 
  EyeOff, 
  FileCode, 
  Activity,
  Layers,
  Table,
  Radio,
  Clock
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

interface PrebuiltDatabase {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  host: string;
  port: number;
  database: string;
  username: string;
  tableName: string;
  description: string;
  badge: string;
  iconBg: string;
  suggestedQuery: string;
}

const PREBUILT_SERVERS: PrebuiltDatabase[] = [
  {
    id: 'postgres-aurora',
    name: 'AWS Aurora PostgreSQL (Prod Cluster)',
    type: 'postgres',
    typeLabel: 'PostgreSQL 16.2',
    host: 'db-orders-aurora.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'enterprise_production',
    username: 'svc_analytics_ro',
    tableName: 'orders',
    description: 'High-throughput transactional order facts, discounts, margins, and omnichannel fulfillment metrics.',
    badge: 'PostgreSQL Live',
    iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    suggestedQuery: 'SELECT * FROM orders WHERE status = \'Completed\' ORDER BY timestamp DESC LIMIT 120;'
  },
  {
    id: 'mysql-gcp',
    name: 'GCP Cloud SQL MySQL (Financial Ledger)',
    type: 'mysql',
    typeLabel: 'MySQL 8.0 Enterprise',
    host: 'finance-primary-01.us-central1.gcp.internal',
    port: 3306,
    database: 'fintech_recurring_mrr',
    username: 'bi_read_user',
    tableName: 'subscriptions',
    description: 'SaaS recurring billing, customer MRR movements, expansion tiers, and invoice settlement statuses.',
    badge: 'MySQL Cluster',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    suggestedQuery: 'SELECT * FROM subscriptions WHERE mrr_amount > 0 ORDER BY renewal_date ASC;'
  },
  {
    id: 'mongodb-atlas',
    name: 'MongoDB Atlas (Logistics & Fleet IoT)',
    type: 'mongodb',
    typeLabel: 'MongoDB 7.0 Atlas',
    host: 'fleet-telemetry-shard0.mongodb.net',
    port: 27017,
    database: 'iot_fleet_telemetry',
    username: 'telemetry_consumer',
    tableName: 'telemetry_pings',
    description: 'Real-time telemetry event streaming, geographic waypoints, fuel efficiency, and route latency.',
    badge: 'MongoDB Stream',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    suggestedQuery: 'db.telemetry_pings.find({ battery_level: { $gte: 20 } }).sort({ timestamp: -1 }).limit(100)'
  },
  {
    id: 'snowflake-dwh',
    name: 'Snowflake Enterprise (Growth Analytics)',
    type: 'snowflake',
    typeLabel: 'Snowflake Data Warehouse',
    host: 'acme_corp.us-east-1.snowflakecomputing.com',
    port: 443,
    database: 'MARKETING_ANALYTICS_WH',
    username: 'ANALYST_ROLE_USER',
    tableName: 'CAMPAIGN_ATTRIBUTION_FACTS',
    description: 'Multi-touch campaign attribution, blended ROAS, digital ad impressions, and conversion funnel data.',
    badge: 'Snowflake DWH',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    suggestedQuery: 'SELECT * FROM CAMPAIGN_ATTRIBUTION_FACTS ORDER BY ATTRIBUTED_REVENUE DESC LIMIT 150;'
  },
  {
    id: 'rest-live-stream',
    name: 'Live REST API / Real-Time JSON Feed',
    type: 'rest_api',
    typeLabel: 'REST / GraphQL Webhook',
    host: 'https://api.coincap.io/v2/assets?limit=50',
    port: 443,
    database: 'crypto_forex_ticks',
    username: 'Bearer_Token',
    tableName: 'live_assets',
    description: 'Real-time global market valuations, 24h volume weighted changes, and circulating market metrics.',
    badge: 'REST Live API',
    iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    suggestedQuery: 'GET /v2/assets?limit=50'
  }
];

export const LiveServerConnectorView: React.FC = () => {
  const { 
    ingestDatasetFromRows, 
    setCurrentTab, 
    liveConnection, 
    setLiveConnection, 
    syncLiveStream,
    cleanRows,
    project
  } = usePlatform();

  // Connection form state
  const [serverType, setServerType] = useState<string>('postgres');
  const [host, setHost] = useState<string>('db-orders-aurora.us-east-1.rds.amazonaws.com');
  const [port, setPort] = useState<string>('5432');
  const [database, setDatabase] = useState<string>('enterprise_production');
  const [username, setUsername] = useState<string>('svc_analytics_ro');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [sslEnabled, setSslEnabled] = useState<boolean>(true);
  const [tableName, setTableName] = useState<string>('orders');
  const [customQuery, setCustomQuery] = useState<string>('SELECT * FROM orders ORDER BY timestamp DESC LIMIT 100;');
  const [refreshInterval, setRefreshInterval] = useState<number>(0); // 0 = manual
  const [limit, setLimit] = useState<number>(120);

  // Status state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; tables?: string[] } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'custom' | 'templates'>('templates');

  const handleServerTypeChange = (type: string) => {
    setServerType(type);
    setTestResult(null);
    if (type === 'postgres') setPort('5432');
    else if (type === 'mysql') setPort('3306');
    else if (type === 'mssql') setPort('1433');
    else if (type === 'mongodb') setPort('27017');
    else if (type === 'snowflake') setPort('443');
    else if (type === 'oracle') setPort('1521');
    else if (type === 'rest_api') {
      setPort('443');
      if (!host.startsWith('http')) setHost('https://api.coincap.io/v2/assets?limit=50');
    }
  };

  const handleApplyTemplate = (tmpl: PrebuiltDatabase) => {
    setServerType(tmpl.type);
    setHost(tmpl.host);
    setPort(String(tmpl.port));
    setDatabase(tmpl.database);
    setUsername(tmpl.username);
    setTableName(tmpl.tableName);
    setCustomQuery(tmpl.suggestedQuery);
    setTestResult(null);
    setFetchError(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setFetchError(null);

    try {
      const res = await fetch('/api/live-data/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverType,
          host,
          port: Number(port) || 5432,
          database,
          username,
          ssl: sslEnabled,
          restEndpoint: serverType === 'rest_api' ? host : undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || `Successfully connected to ${serverType.toUpperCase()}`,
          latencyMs: data.latencyMs,
          tables: data.availableTables
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while attempting server handshake'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleFetchLiveData = async () => {
    setFetching(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/live-data/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverType,
          host,
          port: Number(port) || 5432,
          database,
          tableName,
          query: customQuery,
          limit,
          restEndpoint: serverType === 'rest_api' ? host : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server rejected live data stream request.');
      }

      if (!data.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
        throw new Error('Server returned empty record set. Verify query syntax or table selection.');
      }

      // Ingest into active platform
      const displayName = `${database}.${tableName || 'orders'}`;
      ingestDatasetFromRows(displayName, data.rows, {
        connectionType: serverType,
        serverHost: host,
        database,
        queryExecuted: customQuery
      });

      // Update live connection state in store
      setLiveConnection({
        isConnected: true,
        serverType,
        host,
        port,
        database,
        tableName,
        autoRefreshInterval: refreshInterval,
        lastSynced: new Date().toLocaleTimeString(),
        fetchCount: 1,
        isSyncing: false,
        queryExecuted: customQuery
      });

    } catch (err: any) {
      setFetchError(err?.message || 'Failed to fetch live database records');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#21F1A8]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 max-w-2xl relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#21F1A8]/10 text-[#21F1A8] text-xs font-mono font-semibold border border-[#21F1A8]/20">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#21F1A8]" />
            UNIVERSAL DATABASE & LIVE SERVER CONNECTOR
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            CONNECT TO ANY DATABASE & SERVER
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            Attach credentials for any server: <span className="text-white font-medium">PostgreSQL, MySQL, SQL Server, MongoDB, Snowflake, Oracle, or REST APIs</span>. Stream live records directly into the analytical pipeline for in-browser SQL or Python cleaning.
          </p>
        </div>

        {/* Live streaming status card if connected */}
        {liveConnection.isConnected ? (
          <div className="p-4 rounded-2xl bg-[#141414] border border-[#21F1A8]/40 space-y-2.5 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-gray-400">Stream Status:</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#21F1A8]">
                <span className="w-2 h-2 rounded-full bg-[#21F1A8] animate-ping" />
                LIVE CONNECTED
              </span>
            </div>
            <div className="text-xs font-mono text-gray-300">
              <div>DB: <span className="text-white font-bold">{liveConnection.database}</span></div>
              <div>Table: <span className="text-[#21F1A8] font-bold">{liveConnection.tableName}</span></div>
              <div className="text-gray-500 text-[10px]">Synced: {liveConnection.lastSynced || 'Just now'} ({liveConnection.fetchCount} syncs)</div>
            </div>
            <div className="pt-1 flex gap-2">
              <button
                onClick={syncLiveStream}
                disabled={liveConnection.isSyncing}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#21F1A8] text-black font-bold text-xs hover:bg-[#1cdb97] transition-all flex items-center justify-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${liveConnection.isSyncing ? 'animate-spin' : ''}`} />
                {liveConnection.isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={() => setCurrentTab('executive_dashboard')}
                className="py-1.5 px-3 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs border border-[#383838]"
              >
                View Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'templates' 
                  ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20' 
                  : 'bg-[#242424] text-gray-300 hover:text-white border border-[#333]'
              }`}
            >
              Curated Live Servers
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'custom' 
                  ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20' 
                  : 'bg-[#242424] text-gray-300 hover:text-white border border-[#333]'
              }`}
            >
              Custom Server Credentials
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Server Selection & Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Preset Templates */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#21F1A8]" />
              INSTANT CLUSTER CONNECTIONS
            </h2>
            <span className="text-[10px] font-mono text-gray-400">1-Click Live Setup</span>
          </div>

          <div className="space-y-3">
            {PREBUILT_SERVERS.map(tmpl => {
              const isSelected = serverType === tmpl.type && host === tmpl.host;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-[#222222] border-[#21F1A8] shadow-md shadow-[#21F1A8]/10' 
                      : 'bg-[#191919] border-[#2d2d2d] hover:border-[#3e3e3e] hover:bg-[#202020]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${tmpl.iconBg}`}>
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs sm:text-sm">{tmpl.name}</h4>
                        <div className="text-[11px] font-mono text-gray-400">{tmpl.typeLabel}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121212] border border-[#333] text-[#21F1A8]">
                      {tmpl.badge}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mt-2.5 line-clamp-2">
                    {tmpl.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-gray-500">
                    <span>Host: {tmpl.host.substring(0, 24)}...</span>
                    <span className="text-[#21F1A8] flex items-center gap-1 font-semibold">
                      Use Profile <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Connection Credentials & Query Editor */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2d2d] pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#21F1A8]" />
                  SERVER AUTHENTICATION & CREDENTIALS
                </h3>
                <p className="text-xs text-gray-400">Specify connection parameters to authenticate and stream live tables.</p>
              </div>

              {/* Server Engine Selector */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'postgres', label: 'Postgres' },
                  { id: 'mysql', label: 'MySQL' },
                  { id: 'mssql', label: 'SQL Server' },
                  { id: 'mongodb', label: 'MongoDB' },
                  { id: 'snowflake', label: 'Snowflake' },
                  { id: 'rest_api', label: 'REST API' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleServerTypeChange(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                      serverType === item.id 
                        ? 'bg-[#21F1A8] text-black font-bold' 
                        : 'bg-[#141414] text-gray-400 hover:text-white border border-[#2d2d2d]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Host / URL */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 font-mono flex items-center justify-between">
                  <span>{serverType === 'rest_api' ? 'REST API Endpoint URL' : 'Server Host / IP'}</span>
                  <span className="text-[10px] text-gray-500">e.g. {serverType === 'rest_api' ? 'https://api.domain.com/v1/orders' : '10.0.4.12 or db.domain.net'}</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="hostname or url..."
                    className="w-full bg-[#141414] text-xs font-mono text-white pl-9 pr-3 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  />
                </div>
              </div>

              {serverType !== 'rest_api' && (
                <>
                  {/* Port */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 font-mono">Port</label>
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="5432"
                      className="w-full bg-[#141414] text-xs font-mono text-white px-3 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    />
                  </div>

                  {/* Database Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 font-mono">Database / Schema</label>
                    <input
                      type="text"
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      placeholder="production_db"
                      className="w-full bg-[#141414] text-xs font-mono text-white px-3 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 font-mono">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="db_user"
                      className="w-full bg-[#141414] text-xs font-mono text-white px-3 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 font-mono">Password / Secret Key</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#141414] text-xs font-mono text-white px-3 pr-9 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Table / Extraction Source */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 font-mono">Target Table / Resource</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="orders"
                  className="w-full bg-[#141414] text-xs font-mono text-white px-3 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                />
              </div>

              {/* Auto-Refresh Polling */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 font-mono flex items-center justify-between">
                  <span>Auto-Refresh Polling</span>
                  <span className="text-[10px] text-[#21F1A8]">
                    {refreshInterval === 0 ? 'Manual Sync' : `Every ${refreshInterval}s`}
                  </span>
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full bg-[#141414] text-xs font-mono text-white px-3 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  <option value={0}>Manual On-Demand Sync</option>
                  <option value={5}>Live Real-Time Stream (Every 5 seconds)</option>
                  <option value={15}>Every 15 seconds</option>
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every 1 minute</option>
                </select>
              </div>

              {/* SSL & Max Records */}
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={sslEnabled}
                    onChange={(e) => setSslEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-[#21F1A8] bg-[#141414] border-[#333] focus:ring-0"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-[#21F1A8]" />
                  <span>Enforce SSL/TLS Encryption in Transit</span>
                </label>

                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <span>Limit Rows:</span>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    min={10}
                    max={500}
                    className="w-20 bg-[#141414] text-white px-2 py-1 rounded-lg border border-[#333] text-center"
                  />
                </div>
              </div>
            </div>

            {/* Custom SQL Extraction Query */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300 font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[#21F1A8]" />
                  Custom SQL Query Extraction (Optional)
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Overrides default SELECT *</span>
              </div>
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                rows={3}
                placeholder="SELECT * FROM table WHERE ... ORDER BY timestamp DESC LIMIT 100;"
                className="w-full bg-[#121212] text-xs font-mono text-[#21F1A8] p-3 rounded-xl border border-[#2d2d2d] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>

            {/* Test Connection Result Box */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                testResult.success 
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                  : 'bg-red-950/20 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                    <span className="font-bold">{testResult.success ? 'CONNECTION SUCCESSFUL' : 'AUTHENTICATION FAILED'}</span>
                  </div>
                  {testResult.latencyMs && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/40">
                      Ping: {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-90">{testResult.message}</p>
                {testResult.tables && testResult.tables.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-1.5">
                    <span className="text-gray-400 text-[10px]">Detected Schema Tables:</span>
                    {testResult.tables.map((t, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTableName(t);
                          setCustomQuery(`SELECT * FROM ${t} ORDER BY timestamp DESC LIMIT ${limit};`);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Feedback */}
            {fetchError && (
              <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fetchError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2d2d2d]">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || fetching}
                className="px-5 py-2.5 rounded-xl bg-[#262626] hover:bg-[#333] text-gray-200 text-xs font-semibold border border-[#3e3e3e] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 text-[#21F1A8]" />}
                <span>{testing ? 'Testing Handshake...' : 'Test Connection'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFetchLiveData}
                  disabled={fetching}
                  className="px-6 py-2.5 rounded-xl bg-[#21F1A8] text-black font-heading text-sm font-bold tracking-wide uppercase hover:bg-[#1cdb97] transition-all flex items-center gap-2 shadow-lg shadow-[#21F1A8]/20 disabled:opacity-50"
                >
                  {fetching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>FETCHING LIVE STREAM...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-black" />
                      <span>FETCH & INGEST LIVE DATA</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Quick Routing & Workflow Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              onClick={() => setCurrentTab('sql_lab')}
              className="p-4 rounded-2xl bg-[#191919] border border-[#2d2d2d] hover:border-[#21F1A8]/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-[#21F1A8] transition-colors flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#21F1A8]" /> Step 2: Clean via SQL Lab
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#21F1A8] transition-colors" />
              </div>
              <p className="text-[11px] text-gray-400">
                Filter nulls, deduplicate records, group dimensions, and generate verified SQL executive reports.
              </p>
            </div>

            <div 
              onClick={() => setCurrentTab('python_lab')}
              className="p-4 rounded-2xl bg-[#191919] border border-[#2d2d2d] hover:border-[#21F1A8]/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-[#21F1A8] transition-colors flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#21F1A8]" /> Step 3: Python Cleaning & Instant Dashboards
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#21F1A8] transition-colors" />
              </div>
              <p className="text-[11px] text-gray-400">
                Write Pandas queries, transform live rows, and watch real-time visual dashboards render right on the spot!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
