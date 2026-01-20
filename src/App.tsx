import { useState, useMemo, useEffect } from 'react';
import './index.css';
import {
  calculateSimulation,
  formatNumber,
  formatUSD,
  formatPercent,
  type SimulatorInputs
} from './calculator';

// Known/Fixed values from Pendle data (January 2026)
const KNOWN_DATA = {
  totalSupply: 281_527_448,       // Total PENDLE supply
  vePendleLocked: 63_503_414,     // Fixed: Legacy vePENDLE locked
  circulatingSupply: 162_000_000, // Approx circulating supply
};


// Historical revenue data from Token Terminal (ACTUAL, not annualized)
const HISTORICAL_REVENUE = [
  { year: '2023', revenue: 191_048, note: 'Early phase' },
  { year: '2024', revenue: 19_100_000, note: 'Growth year' },
  { year: '2025', revenue: 44_640_000, note: 'Peak year (actual)' },
];

// Default values based on January 2026 data
const DEFAULTS = {
  annualRevenue: 44_640_000,      // 2025 actual revenue from Token Terminal
  pendlePrice: 5.00,              // Approximate current price
  totalSPendle: 10_000_000,       // New sPENDLE locked
  avgVePendleMultiplier: 2.0,     // ~1 year avg remaining → 2x, being conservative
  userAmount: 10_000,             // Example user stake
  userLockYears: 0,               // Default: new staker
};

// Type for live revenue data
interface LiveRevenueData {
  fetchedAt: string;
  daily: number;
  annualized: number;
  weeklyAvg: number;
  monthlyTotal: number;
  allTimeTotal: number;
  source: string;
}

// Editable value component
function EditableValue({
  value,
  onChange,
  format,
  min = 0,
  max = Infinity,
  className = ""
}: {
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));

  const handleBlur = () => {
    const parsed = parseFloat(inputValue.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        type="text"
        autoFocus
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-gray-800 border border-cyan-500 rounded px-2 py-0.5 text-right font-mono w-32 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setInputValue(String(value)); setIsEditing(true); }}
      className={`cursor-pointer hover:bg-gray-700/50 px-2 py-0.5 rounded transition-colors ${className}`}
      title="Click to edit"
    >
      {format(value)}
    </span>
  );
}

function App() {
  // Protocol parameters
  const [annualRevenue, setAnnualRevenue] = useState(DEFAULTS.annualRevenue);
  const [pendlePrice, setPendlePrice] = useState(DEFAULTS.pendlePrice);

  // Network supply parameters
  const [totalSPendle, setTotalSPendle] = useState(DEFAULTS.totalSPendle);
  const [avgVePendleMultiplier, setAvgVePendleMultiplier] = useState(DEFAULTS.avgVePendleMultiplier);

  // User parameters
  const [userAmount, setUserAmount] = useState(DEFAULTS.userAmount);
  const [userLockYears, setUserLockYears] = useState(DEFAULTS.userLockYears);
  const [isLegacyLocker, setIsLegacyLocker] = useState(false);

  // Live 2026 estimate from DefiLlama
  const [liveData, setLiveData] = useState<LiveRevenueData | null>(null);

  // Fetch live revenue data on mount
  useEffect(() => {
    fetch('/pendle-estimation/revenue-data.json')
      .then(res => res.json())
      .then(data => setLiveData(data))
      .catch(err => console.warn('Could not fetch live data:', err));
  }, []);

  // Calculate locked percentage
  const lockedPercent = (KNOWN_DATA.vePendleLocked / KNOWN_DATA.totalSupply) * 100;

  // Calculate results
  const results = useMemo(() => {
    const inputs: SimulatorInputs = {
      annualRevenue,
      pendlePrice,
      totalSPendle,
      totalVePendle: KNOWN_DATA.vePendleLocked, // Fixed value
      avgVePendleMultiplier,
      userAmount,
      userLockYears,
      isLegacyLocker,
    };
    return calculateSimulation(inputs);
  }, [annualRevenue, pendlePrice, totalSPendle, avgVePendleMultiplier, userAmount, userLockYears, isLegacyLocker]);

  const resetToDefaults = () => {
    setAnnualRevenue(DEFAULTS.annualRevenue);
    setPendlePrice(DEFAULTS.pendlePrice);
    setTotalSPendle(DEFAULTS.totalSPendle);
    setAvgVePendleMultiplier(DEFAULTS.avgVePendleMultiplier);
    setUserAmount(DEFAULTS.userAmount);
    setUserLockYears(DEFAULTS.userLockYears);
    setIsLegacyLocker(false);
  };

  const applyHistoricalRevenue = (revenue: number) => {
    setAnnualRevenue(revenue);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="text-center mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">
          <span className="gradient-text">sPENDLE</span> APR Simulator
        </h1>
        <p className="text-gray-400 text-lg">
          Estimate your returns based on different market scenarios
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          {/* Historical Revenue Reference Card */}
          <div className="glass-card p-6 border-l-4 border-yellow-500">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Revenue Data (Click to Apply)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {HISTORICAL_REVENUE.map((data) => (
                <button
                  key={data.year}
                  onClick={() => applyHistoricalRevenue(data.revenue)}
                  className={`p-3 rounded-lg transition-all hover:scale-105 ${annualRevenue === data.revenue
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-500'
                    : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                    }`}
                >
                  <p className="text-lg font-bold text-white">{data.year}</p>
                  <p className="text-cyan-400 font-mono text-sm">{formatUSD(data.revenue)}</p>
                  <p className="text-xs text-gray-500 mt-1">{data.note}</p>
                </button>
              ))}
              {/* 2026 Live Estimate */}
              <button
                onClick={() => liveData && applyHistoricalRevenue(liveData.annualized)}
                className={`p-3 rounded-lg transition-all hover:scale-105 ${liveData && annualRevenue === liveData.annualized
                  ? 'bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-500'
                  : 'bg-gradient-to-r from-emerald-900/30 to-green-900/30 hover:from-emerald-800/30 hover:to-green-800/30 border border-emerald-700'
                  }`}
              >
                <p className="text-lg font-bold text-emerald-400">2026</p>
                <p className="text-emerald-400 font-mono text-sm">
                  {liveData ? formatUSD(liveData.annualized) : 'Loading...'}
                </p>
                <p className="text-xs text-emerald-600 mt-1">Live estimate 🔄</p>
              </button>
            </div>
            {liveData && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                2026 = {liveData.source} daily (${liveData.daily.toLocaleString()}) × 365 • Updated {new Date(liveData.fetchedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Protocol Parameters Card */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Protocol Parameters
            </h2>

            <div className="space-y-5">
              {/* Annual Revenue */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-gray-300">Annual Revenue</label>
                  <EditableValue
                    value={annualRevenue}
                    onChange={setAnnualRevenue}
                    format={formatUSD}
                    min={0}
                    max={500_000_000}
                    className="text-cyan-400"
                  />
                </div>
                <input
                  type="range"
                  min={1_000_000}
                  max={100_000_000}
                  step={500_000}
                  value={annualRevenue}
                  onChange={(e) => setAnnualRevenue(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$1M (Bear)</span>
                  <span>$100M (Bull)</span>
                </div>
              </div>

              {/* PENDLE Price */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-gray-300">PENDLE Price</label>
                  <EditableValue
                    value={pendlePrice}
                    onChange={setPendlePrice}
                    format={formatUSD}
                    min={0.01}
                    max={100}
                    className="text-cyan-400"
                  />
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={50}
                  step={0.01}
                  value={pendlePrice}
                  onChange={(e) => setPendlePrice(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$0.01</span>
                  <span>$50.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Network Supply Card */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Network Supply
            </h2>

            <div className="space-y-5">
              {/* Legacy vePENDLE - FIXED VALUE */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-300 font-medium">Legacy vePENDLE Locked</p>
                    <p className="text-xs text-gray-500">Fixed value from Pendle Dashboard</p>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-400 font-mono text-lg">{formatNumber(KNOWN_DATA.vePendleLocked)}</p>
                    <p className="text-xs text-gray-500">
                      {lockedPercent.toFixed(1)}% of supply
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    style={{ width: `${lockedPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>Total Supply: {formatNumber(KNOWN_DATA.totalSupply)}</span>
                </div>
              </div>

              {/* New sPENDLE Stakers - Raw number */}
              <div>
                <div className="flex justify-between mb-2">
                  <div>
                    <label className="text-gray-300">New sPENDLE Locked</label>
                    <p className="text-xs text-gray-500">Circulating: {formatNumber(KNOWN_DATA.circulatingSupply)}</p>
                  </div>
                  <EditableValue
                    value={totalSPendle}
                    onChange={setTotalSPendle}
                    format={(v) => formatNumber(v) + ' PENDLE'}
                    min={0}
                    max={KNOWN_DATA.circulatingSupply}
                    className="text-purple-400"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100_000_000}
                  step={1_000_000}
                  value={totalSPendle}
                  onChange={(e) => setTotalSPendle(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>100M PENDLE</span>
                </div>
              </div>

              {/* Average Legacy Multiplier */}
              <div>
                <div className="flex justify-between mb-2">
                  <div>
                    <label className="text-gray-300">Avg. Legacy Multiplier</label>
                    <p className="text-xs text-gray-500">Weighted avg of all legacy lockers</p>
                  </div>
                  <span className="text-purple-400 font-mono">{avgVePendleMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.1}
                  value={avgVePendleMultiplier}
                  onChange={(e) => setAvgVePendleMultiplier(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1x (All expiring soon)</span>
                  <span>4x (All 2yr locked)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Your Position Card */}
          <div className="glass-card p-6 glow">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Your Position
            </h2>

            <div className="space-y-5">
              {/* User Amount */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-gray-300">Your PENDLE Amount</label>
                  <EditableValue
                    value={userAmount}
                    onChange={setUserAmount}
                    format={(v) => formatNumber(v)}
                    min={0}
                    max={10_000_000}
                    className="text-emerald-400"
                  />
                </div>
                <input
                  type="range"
                  min={100}
                  max={1_000_000}
                  step={100}
                  value={userAmount}
                  onChange={(e) => setUserAmount(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100</span>
                  <span>1M</span>
                </div>
              </div>

              {/* Legacy Locker Toggle */}
              <div className="flex items-center justify-between py-2">
                <label className="text-gray-300">Legacy vePENDLE Holder?</label>
                <button
                  onClick={() => setIsLegacyLocker(!isLegacyLocker)}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isLegacyLocker
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    : 'bg-gray-700'
                    }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${isLegacyLocker ? 'left-8' : 'left-1'
                      }`}
                  />
                </button>
              </div>

              {/* Lock Duration (only for legacy) */}
              {isLegacyLocker && (
                <div className="animate-fade-in">
                  <div className="flex justify-between mb-2">
                    <label className="text-gray-300">Your Remaining Lock</label>
                    <span className="text-emerald-400 font-mono">
                      {userLockYears.toFixed(1)} years → {results.userMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={userLockYears}
                    onChange={(e) => setUserLockYears(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 years (1x)</span>
                    <span>2 years (4x)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetToDefaults}
            className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Main APR Display */}
          <div className="glass-card p-8 text-center pulse-glow">
            <p className="text-gray-400 mb-2">Your Estimated APR</p>
            <p className="text-6xl md:text-7xl font-bold gradient-text mb-4">
              {formatPercent(results.apr)}
            </p>
            <div className="flex justify-center gap-4 text-sm text-gray-400">
              <span>Multiplier: <strong className="text-emerald-400">{results.userMultiplier.toFixed(2)}x</strong></span>
              <span>•</span>
              <span>Network Share: <strong className="text-cyan-400">{formatPercent(results.userSharePercent, 4)}</strong></span>
            </div>
          </div>

          {/* Detailed Results Card */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Detailed Breakdown
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Your Weighted Amount</span>
                <span className="font-mono text-lg">{formatNumber(results.userWeightedAmount)} wPENDLE</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <div>
                  <span className="text-gray-400">Total Network Weight</span>
                  <p className="text-xs text-gray-500">= vePENDLE×{avgVePendleMultiplier}x + sPENDLE×1x</p>
                </div>
                <span className="font-mono text-lg">{formatNumber(results.totalNetworkWeight)} wPENDLE</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Annual Revenue (Distributed)</span>
                <span className="font-mono text-lg text-cyan-400">{formatUSD(annualRevenue * 0.8)}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Your Annual Earnings (USD)</span>
                <span className="font-mono text-lg text-emerald-400">{formatUSD(results.annualRevenueShare)}</span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-400">Your Annual Earnings (PENDLE)</span>
                <span className="font-mono text-lg text-purple-400">{formatNumber(results.annualPendleRewards, 2)} PENDLE</span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="glass-card p-6 border-l-4 border-cyan-500">
            <h3 className="font-semibold mb-2 text-cyan-400">ℹ️ How this works</h3>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• <strong>80%</strong> of Pendle's protocol revenue is distributed to sPENDLE holders</li>
              <li>• New sPENDLE stakers receive a <strong>1x multiplier</strong></li>
              <li>• Legacy vePENDLE holders receive a <strong>1x-4x bonus</strong> based on remaining lock time</li>
              <li>• Your share = (Your Weight / Total Network Weight) × 80% Revenue</li>
            </ul>
          </div>

          {/* Data Source Info */}
          <div className="text-center text-xs text-gray-500">
            <p>Data from Token Terminal (historical) & DefiLlama (live)</p>
            <p className="mt-1">For educational purposes only. Not financial advice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
