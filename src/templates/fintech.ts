/**
 * FinTech-Specific Job Templates for Nosana Compute
 */

import { NosanaJobSpec, JobType } from '../types';

export class JobTemplates {
  
  static createJobSpec(jobType: JobType, params: any = {}): NosanaJobSpec {
    switch (jobType) {
      case 'portfolio_risk':
        return this.createPortfolioRiskJob(params);
      case 'options_pricing':
        return this.createOptionsPricingJob(params);
      case 'yield_optimization':
        return this.createYieldOptimizationJob(params);
      case 'backtest_strategy':
        return this.createBacktestJob(params);
      case 'credit_risk':
        return this.createCreditRiskJob(params);
      default:
        return this.createGenericComputeJob(params);
    }
  }

  static createPortfolioRiskJob(params: any): NosanaJobSpec {
    return {
      image: 'python:3.9-slim',
      cmd: ['python', '/app/portfolio_risk.py'],
      env: {
        PORTFOLIO_DATA: params.portfolioData || JSON.stringify({
          assets: [
            { symbol: 'BTC', quantity: 1.5, price: 45000 },
            { symbol: 'ETH', quantity: 10, price: 3000 },
            { symbol: 'SOL', quantity: 100, price: 100 }
          ]
        }),
        CONFIDENCE_LEVELS: params.confidenceLevels || '0.95,0.99',
        TIME_HORIZON: params.timeHorizon || '252',
        METHOD: params.method || 'historical_simulation',
        LOOKBACK_PERIOD: params.lookbackPeriod || '1000'
      },
      resources: {
        cpu: 2,
        memory: '4Gi'
      },
      metadata: {
        name: 'Portfolio Risk Analysis',
        description: 'Calculate VaR, Expected Shortfall, and risk metrics for cryptocurrency portfolio',
        tags: ['fintech', 'risk-management', 'portfolio', 'var']
      }
    };
  }

  static createOptionsPricingJob(params: any): NosanaJobSpec {
    return {
      image: 'quantlib/python:latest',
      cmd: ['python', '/app/options_pricing.py'],
      env: {
        SPOT_PRICE: params.spotPrice || '100',
        STRIKE_PRICE: params.strikePrice || '105',
        TIME_TO_EXPIRY: params.timeToExpiry || '0.25',
        RISK_FREE_RATE: params.riskFreeRate || '0.05',
        VOLATILITY: params.volatility || '0.20',
        OPTION_TYPE: params.optionType || 'call',
        MODEL: params.model || 'black_scholes'
      },
      resources: {
        cpu: 1,
        memory: '2Gi'
      },
      metadata: {
        name: 'Options Pricing Model',
        description: 'Calculate option prices using Black-Scholes and Greeks',
        tags: ['fintech', 'options', 'derivatives', 'black-scholes']
      }
    };
  }

  static createYieldOptimizationJob(params: any): NosanaJobSpec {
    return {
      image: 'python:3.9-slim',
      cmd: ['python', '/app/yield_optimization.py'],
      env: {
        INVESTMENT_AMOUNT: params.investmentAmount || '10000',
        RISK_TOLERANCE: params.riskTolerance || 'medium',
        TIME_HORIZON: params.timeHorizon || '365',
        PROTOCOLS: params.protocols || JSON.stringify([
          'aave', 'compound', 'curve', 'convex', 'yearn'
        ]),
        MIN_APY: params.minApy || '5',
        MAX_RISK_SCORE: params.maxRiskScore || '7'
      },
      resources: {
        cpu: 2,
        memory: '3Gi'
      },
      metadata: {
        name: 'DeFi Yield Optimization',
        description: 'Find optimal yield farming strategies across DeFi protocols',
        tags: ['fintech', 'defi', 'yield-farming', 'optimization']
      }
    };
  }

  static createBacktestJob(params: any): NosanaJobSpec {
    return {
      image: 'python:3.9-slim',
      cmd: ['python', '/app/backtest_strategy.py'],
      env: {
        STRATEGY_CONFIG: params.strategyConfig || JSON.stringify({
          type: 'mean_reversion',
          lookback: 20,
          threshold: 2.0
        }),
        START_DATE: params.startDate || '2023-01-01',
        END_DATE: params.endDate || '2024-01-01',
        INITIAL_CAPITAL: params.initialCapital || '100000',
        SYMBOLS: params.symbols || 'BTC,ETH,SOL',
        BENCHMARK: params.benchmark || 'BTC'
      },
      resources: {
        cpu: 4,
        memory: '8Gi'
      },
      metadata: {
        name: 'Strategy Backtesting',
        description: 'Backtest trading strategies with historical data',
        tags: ['fintech', 'trading', 'backtesting', 'strategy']
      }
    };
  }

  static createCreditRiskJob(params: any): NosanaJobSpec {
    return {
      image: 'python:3.9-slim',
      cmd: ['python', '/app/credit_risk.py'],
      env: {
        BORROWER_DATA: params.borrowerData || JSON.stringify({
          creditScore: 750,
          income: 80000,
          debtToIncome: 0.3,
          collateralValue: 50000
        }),
        LOAN_AMOUNT: params.loanAmount || '25000',
        LOAN_TERM: params.loanTerm || '36',
        MODEL_TYPE: params.modelType || 'logistic_regression',
        FEATURES: params.features || 'credit_score,income,dti,collateral'
      },
      resources: {
        cpu: 2,
        memory: '4Gi'
      },
      metadata: {
        name: 'Credit Risk Assessment',
        description: 'Assess default probability and loan pricing',
        tags: ['fintech', 'credit-risk', 'lending', 'ml']
      }
    };
  }

  static createGenericComputeJob(params: any): NosanaJobSpec {
    return {
      image: params.image || 'python:3.9-slim',
      cmd: params.cmd || ['python', '/app/compute.py'],
      env: params.env || {
        INPUT_DATA: JSON.stringify(params),
        OUTPUT_FORMAT: 'json'
      },
      resources: {
        cpu: params.cpu || 1,
        memory: params.memory || '2Gi'
      },
      metadata: {
        name: params.name || 'Generic Computation',
        description: params.description || 'Custom compute job',
        tags: params.tags || ['compute', 'generic']
      }
    };
  }

  // Pre-built container images for FinTech computations
  static readonly CONTAINER_IMAGES = {
    PYTHON_FINTECH: 'python:3.9-slim',
    QUANTLIB: 'quantlib/python:latest',
    JUPYTER_SCIPY: 'jupyter/scipy-notebook:latest',
    R_FINANCE: 'rocker/r-ver:4.2.0',
    NODEJS_CRYPTO: 'node:18-alpine'
  };

  // Common resource configurations
  static readonly RESOURCE_PROFILES = {
    LIGHT: { cpu: 1, memory: '1Gi' },
    STANDARD: { cpu: 2, memory: '4Gi' },
    COMPUTE_HEAVY: { cpu: 4, memory: '8Gi' },
    MEMORY_INTENSIVE: { cpu: 2, memory: '16Gi' },
    HIGH_PERFORMANCE: { cpu: 8, memory: '32Gi' }
  };

  // Environment presets for common FinTech scenarios
  static readonly ENV_PRESETS = {
    CRYPTO_PORTFOLIO: {
      MARKET_DATA_SOURCE: 'coingecko',
      BASE_CURRENCY: 'USD',
      UPDATE_FREQUENCY: '1h',
      RISK_FREE_RATE: '0.045'
    },
    
    TRADITIONAL_PORTFOLIO: {
      MARKET_DATA_SOURCE: 'yahoo_finance',
      BASE_CURRENCY: 'USD',
      UPDATE_FREQUENCY: '1d',
      RISK_FREE_RATE: '0.045'
    },
    
    DEFI_ANALYSIS: {
      NETWORK: 'ethereum',
      BLOCK_CONFIRMATIONS: '12',
      GAS_PRICE_STRATEGY: 'medium',
      SLIPPAGE_TOLERANCE: '0.005'
    }
  };
}