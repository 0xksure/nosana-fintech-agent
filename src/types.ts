/**
 * Type definitions for Nosana FinTech Agent
 */

import { UUID } from '@elizaos/core';

// Core Nosana Job Types
export interface NosanaJobSpec {
  image: string;
  cmd: string[];
  env?: Record<string, string>;
  resources: {
    cpu: number;
    memory: string;
  };
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
}

export interface NosanaJobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
  progress?: number;
}

// FinTech Specific Types
export interface PortfolioData {
  assets: Asset[];
  totalValue: number;
  currency: string;
  lastUpdated: string;
}

export interface Asset {
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  weight: number;
}

export interface RiskAnalysisParams {
  portfolio: PortfolioData;
  confidenceLevels?: number[];
  timeHorizon?: number;
  method?: 'historical' | 'parametric' | 'monte_carlo';
}

export interface RiskAnalysisResult {
  var95: number;
  var99: number;
  expectedShortfall95: number;
  expectedShortfall99: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface OptionsPricingParams {
  spotPrice: number;
  strikePrice: number;
  timeToExpiry: number;
  riskFreeRate: number;
  volatility: number;
  optionType: 'call' | 'put';
}

export interface OptionsPricingResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface YieldOptimizationParams {
  availablePools: DeFiPool[];
  investmentAmount: number;
  riskTolerance: 'low' | 'medium' | 'high';
  timeHorizon: number;
}

export interface DeFiPool {
  protocol: string;
  pair: string;
  apy: number;
  tvl: number;
  riskScore: number;
}

export interface YieldOptimizationResult {
  recommendedPools: DeFiPool[];
  expectedReturn: number;
  riskScore: number;
  allocation: Record<string, number>;
}

// Job Management Types
export interface JobContext {
  id: string;
  roomId: string;
  userId: UUID;
  type: JobType;
  params: any;
  submittedAt: Date;
  status: NosanaJobStatus;
}

export type JobType = 
  | 'portfolio_risk'
  | 'options_pricing' 
  | 'yield_optimization'
  | 'backtest_strategy'
  | 'credit_risk'
  | 'generic_compute';

// Network Statistics
export interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  totalJobs: number;
  completedJobs: number;
  averageJobTime: number;
  networkUtilization: number;
}

// Plugin Configuration
export interface NosanaConfig {
  apiKey?: string;
  rpcEndpoint?: string;
  walletPath?: string;
  defaultResources?: {
    cpu: number;
    memory: string;
  };
  maxConcurrentJobs?: number;
  pollInterval?: number;
}