import { Character, Client, ModelProvider, Plugin, Action } from '@elizaos/core';
import axios from 'axios';
import { ethers } from 'ethers';

// Portfolio tracking interfaces
interface Portfolio {
  totalValue: number;
  positions: Position[];
  performance: PerformanceMetrics;
  lastUpdated: Date;
}

interface Position {
  symbol: string;
  amount: number;
  value: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
  protocol?: string;
  chain?: string;
}

interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  monthlyReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface YieldOpportunity {
  protocol: string;
  pool: string;
  apy: number;
  tvl: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  tokens: string[];
  chain: string;
  url?: string;
}

// Financial data service
class FinancialDataService {
  private coingeckoApiKey: string;
  private defillama: string = 'https://api.llama.fi';
  
  constructor() {
    this.coingeckoApiKey = process.env.COINGECKO_API_KEY || '';
  }

  async getCryptoPrices(symbols: string[]): Promise<{ [key: string]: number }> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: symbols.join(','),
            vs_currencies: 'usd'
          },
          headers: this.coingeckoApiKey ? { 'x-cg-api-key': this.coingeckoApiKey } : {}
        }
      );
      
      const prices: { [key: string]: number } = {};
      for (const [symbol, data] of Object.entries(response.data)) {
        prices[symbol] = (data as any).usd;
      }
      return prices;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      return {};
    }
  }

  async getDeFiYields(): Promise<YieldOpportunity[]> {
    try {
      const response = await axios.get(`${this.defillama}/pools`);
      const pools = response.data.data || [];
      
      return pools
        .filter((pool: any) => pool.apy && pool.apy > 1) // Only pools with >1% APY
        .map((pool: any) => ({
          protocol: pool.project,
          pool: pool.symbol,
          apy: pool.apy,
          tvl: pool.tvlUsd,
          riskLevel: this.assessRiskLevel(pool.apy, pool.tvlUsd),
          tokens: [pool.symbol],
          chain: pool.chain || 'ethereum',
          url: pool.url
        }))
        .sort((a: YieldOpportunity, b: YieldOpportunity) => b.apy - a.apy)
        .slice(0, 20); // Top 20 opportunities
    } catch (error) {
      console.error('Error fetching DeFi yields:', error);
      return [];
    }
  }

  private assessRiskLevel(apy: number, tvl: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (apy > 100) return 'EXTREME';
    if (apy > 50) return 'HIGH';
    if (apy > 20 || tvl < 1000000) return 'MEDIUM';
    return 'LOW';
  }

  async analyzeWalletPortfolio(address: string, chains: string[] = ['ethereum']): Promise<Portfolio | null> {
    try {
      // Mock implementation - in real version would query multiple blockchain RPCs
      // For demo purposes, returning sample data
      const mockPositions: Position[] = [
        {
          symbol: 'ETH',
          amount: 2.5,
          value: 8750,
          costBasis: 7500,
          pnl: 1250,
          pnlPercent: 16.67,
          allocation: 87.5,
          chain: 'ethereum'
        },
        {
          symbol: 'USDC',
          amount: 1250,
          value: 1250,
          costBasis: 1250,
          pnl: 0,
          pnlPercent: 0,
          allocation: 12.5,
          protocol: 'Aave',
          chain: 'ethereum'
        }
      ];

      const totalValue = mockPositions.reduce((sum, pos) => sum + pos.value, 0);
      
      return {
        totalValue,
        positions: mockPositions,
        performance: {
          totalReturn: 1250,
          totalReturnPercent: 14.29,
          monthlyReturn: 3.2,
          volatility: 0.65,
          sharpeRatio: 1.8,
          maxDrawdown: -0.25
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error analyzing wallet:', error);
      return null;
    }
  }
}

// Custom actions for FinanceGPT
const portfolioAnalysisAction: Action = {
  name: 'analyze_portfolio',
  description: 'Analyze user portfolio performance and provide insights',
  parameters: {
    type: 'object',
    properties: {
      walletAddress: {
        type: 'string',
        description: 'Wallet address to analyze'
      },
      timeframe: {
        type: 'string',
        enum: ['1d', '1w', '1m', '3m', '1y'],
        description: 'Analysis timeframe'
      }
    },
    required: ['walletAddress']
  },
  handler: async (params: any) => {
    const financialService = new FinancialDataService();
    const portfolio = await financialService.analyzeWalletPortfolio(params.walletAddress);
    
    if (!portfolio) {
      return 'Unable to analyze portfolio. Please check the wallet address and try again.';
    }

    const analysis = `
📊 **Portfolio Analysis**

**Total Value:** $${portfolio.totalValue.toLocaleString()}
**Total Return:** ${portfolio.performance.totalReturnPercent.toFixed(2)}% ($${portfolio.performance.totalReturn.toLocaleString()})
**Monthly Return:** ${portfolio.performance.monthlyReturn.toFixed(2)}%
**Sharpe Ratio:** ${portfolio.performance.sharpeRatio.toFixed(2)}
**Max Drawdown:** ${(portfolio.performance.maxDrawdown * 100).toFixed(2)}%

**Top Positions:**
${portfolio.positions.map(pos => 
  `• ${pos.symbol}: $${pos.value.toLocaleString()} (${pos.allocation.toFixed(1)}%) - ${pos.pnlPercent > 0 ? '+' : ''}${pos.pnlPercent.toFixed(2)}%`
).join('\n')}

**Risk Assessment:** ${portfolio.performance.volatility < 0.5 ? 'Low' : portfolio.performance.volatility < 1.0 ? 'Medium' : 'High'} volatility portfolio
    `;

    return analysis.trim();
  }
};

const yieldFarmingAction: Action = {
  name: 'find_yield_opportunities',
  description: 'Find the best DeFi yield farming opportunities',
  parameters: {
    type: 'object',
    properties: {
      minApy: {
        type: 'number',
        description: 'Minimum APY percentage',
        default: 5
      },
      riskTolerance: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        description: 'Risk tolerance level',
        default: 'MEDIUM'
      },
      chains: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred blockchain networks'
      }
    }
  },
  handler: async (params: any) => {
    const financialService = new FinancialDataService();
    const opportunities = await financialService.getDeFiYields();
    
    const filtered = opportunities
      .filter(op => op.apy >= (params.minApy || 5))
      .filter(op => {
        const riskTolerance = params.riskTolerance || 'MEDIUM';
        if (riskTolerance === 'LOW') return op.riskLevel === 'LOW';
        if (riskTolerance === 'MEDIUM') return ['LOW', 'MEDIUM'].includes(op.riskLevel);
        return true; // HIGH tolerance accepts all
      })
      .slice(0, 10);

    if (filtered.length === 0) {
      return 'No yield opportunities found matching your criteria. Try lowering the minimum APY or increasing risk tolerance.';
    }

    const analysis = `
🌾 **Top DeFi Yield Opportunities**

${filtered.map((op, i) => 
  `${i + 1}. **${op.protocol} - ${op.pool}**
   APY: ${op.apy.toFixed(2)}% | TVL: $${(op.tvl / 1000000).toFixed(1)}M | Risk: ${op.riskLevel}
   Chain: ${op.chain.charAt(0).toUpperCase() + op.chain.slice(1)}
   ${op.url ? `Link: ${op.url}` : ''}`
).join('\n\n')}

⚠️ **Risk Disclaimer:** High yields often come with higher risks. Always DYOR and never invest more than you can afford to lose.
    `;

    return analysis.trim();
  }
};

// Export the custom plugin
export default {
  name: 'financegpt-plugin',
  description: 'Advanced financial analysis and portfolio management plugin',
  actions: [
    portfolioAnalysisAction,
    yieldFarmingAction
  ]
} as Plugin;