/**
 * sPendle APR Calculator
 * 
 * Formulas based on Pendle's sPENDLE documentation:
 * - 80% of protocol revenue distributed to sPENDLE holders
 * - Legacy vePENDLE holders get 1x-4x multiplier based on remaining lock time
 * - New sPENDLE stakers get 1x multiplier
 */

export interface SimulatorInputs {
    // Protocol parameters
    annualRevenue: number;        // USD - Total protocol revenue
    pendlePrice: number;          // USD per PENDLE

    // Supply parameters
    totalSPendle: number;         // PENDLE staked as sPENDLE (1x multiplier)
    totalVePendle: number;        // PENDLE locked as legacy vePENDLE
    avgVePendleMultiplier: number; // Average multiplier of legacy lockers (1-4x)

    // User parameters
    userAmount: number;           // PENDLE the user is staking/locking
    userLockYears: number;        // Years remaining on user's lock (0 = new staker, 2 = max)
    isLegacyLocker: boolean;      // Whether user is a legacy vePENDLE holder
}

export interface SimulatorResults {
    userMultiplier: number;
    userWeightedAmount: number;
    totalNetworkWeight: number;
    userSharePercent: number;
    annualRevenueShare: number;    // USD
    annualPendleRewards: number;   // PENDLE tokens
    apr: number;                   // Percentage
}

/**
 * Calculate the multiplier for a legacy vePENDLE holder
 * Multiplier ranges from 1x (0 years) to 4x (2 years)
 * Formula: 1 + (1.5 * yearsRemaining) for linear interpolation
 */
export function calculateMultiplier(lockYearsRemaining: number, isLegacy: boolean): number {
    if (!isLegacy) {
        return 1; // New sPENDLE stakers always get 1x
    }

    // Clamp to valid range
    const years = Math.max(0, Math.min(2, lockYearsRemaining));

    // Linear interpolation: 1x at 0 years, 4x at 2 years
    return 1 + (1.5 * years);
}

/**
 * Calculate the total weighted supply of the network
 * This represents the "denominator" for calculating share percentages
 */
export function calculateTotalNetworkWeight(
    totalSPendle: number,
    totalVePendle: number,
    avgVePendleMultiplier: number
): number {
    const sPendleWeight = totalSPendle * 1; // sPENDLE always has 1x multiplier
    const vePendleWeight = totalVePendle * avgVePendleMultiplier;
    return sPendleWeight + vePendleWeight;
}

/**
 * Main simulator function
 */
export function calculateSimulation(inputs: SimulatorInputs): SimulatorResults {
    const REVENUE_SHARE = 0.8; // 80% goes to holders

    // Calculate user's multiplier
    const userMultiplier = calculateMultiplier(inputs.userLockYears, inputs.isLegacyLocker);

    // Calculate user's weighted amount
    const userWeightedAmount = inputs.userAmount * userMultiplier;

    // Calculate total network weight
    const totalNetworkWeight = calculateTotalNetworkWeight(
        inputs.totalSPendle,
        inputs.totalVePendle,
        inputs.avgVePendleMultiplier
    );

    // Avoid division by zero - add user to the network if they're not already counted
    const effectiveNetworkWeight = totalNetworkWeight + userWeightedAmount;

    // Calculate user's share of the network
    const userSharePercent = (userWeightedAmount / effectiveNetworkWeight) * 100;

    // Calculate annual revenue share in USD
    const totalDistributedRevenue = inputs.annualRevenue * REVENUE_SHARE;
    const annualRevenueShare = (userWeightedAmount / effectiveNetworkWeight) * totalDistributedRevenue;

    // Calculate PENDLE rewards
    const annualPendleRewards = inputs.pendlePrice > 0
        ? annualRevenueShare / inputs.pendlePrice
        : 0;

    // Calculate APR
    const userValueStaked = inputs.userAmount * inputs.pendlePrice;
    const apr = userValueStaked > 0
        ? (annualRevenueShare / userValueStaked) * 100
        : 0;

    return {
        userMultiplier,
        userWeightedAmount,
        totalNetworkWeight: effectiveNetworkWeight,
        userSharePercent,
        annualRevenueShare,
        annualPendleRewards,
        apr,
    };
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number, decimals: number = 2): string {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(decimals) + 'B';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(decimals) + 'M';
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
}

/**
 * Format USD currency
 */
export function formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
    return value.toFixed(decimals) + '%';
}
