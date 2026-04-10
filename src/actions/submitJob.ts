/**
 * Submit Job Action - Natural language to compute job translation
 */

import { 
  Action,
  IAgentRuntime, 
  Memory,
  State,
  HandlerCallback 
} from '@elizaos/core';
import { NosanaJobManager } from '../services/jobManager';
import { JobTemplates } from '../templates/fintech';
import { JobType } from '../types';

export const submitJobAction: Action = {
  name: 'SUBMIT_COMPUTE_JOB',
  similes: [
    'run analysis',
    'start calculation', 
    'compute portfolio',
    'analyze risk',
    'price options',
    'optimize yield',
    'backtest strategy'
  ],
  description: 'Submit a financial computation job to the Nosana network',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    
    // Check for financial computation keywords
    const keywords = [
      'risk', 'portfolio', 'options', 'yield', 'backtest',
      'var', 'volatility', 'sharpe', 'analyze', 'compute',
      'calculate', 'optimize'
    ];
    
    return keywords.some(keyword => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const jobManager = new NosanaJobManager(runtime);
      const requestText = message.content.text;
      
      // Parse request and determine job type
      const jobType = parseJobType(requestText);
      const jobSpec = JobTemplates.createJobSpec(jobType, parseParameters(requestText));
      
      // Submit job
      const jobId = await jobManager.submitJob(jobSpec, {
        roomId: message.roomId,
        userId: message.userId,
        type: jobType
      });
      
      // Create memory for job tracking
      await runtime.messageManager.createMemory({
        userId: runtime.agentId,
        content: {
          text: `🚀 Started ${jobType.replace('_', ' ')} job. Job ID: ${jobId}. I'll notify you when it completes.`,
          action: 'JOB_SUBMITTED',
          jobId,
          jobType
        },
        roomId: message.roomId,
        embedding: runtime.embed(
          `Job ${jobId} submitted for ${jobType} analysis`
        )
      });
      
      if (callback) {
        callback({
          text: `🚀 Started ${jobType.replace('_', ' ')} job. Job ID: ${jobId}. I'll notify you when it completes.`,
          action: 'JOB_SUBMITTED'
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('Job submission failed:', error);
      
      if (callback) {
        callback({
          text: `❌ Failed to submit job: ${error.message}`,
          action: 'JOB_SUBMISSION_FAILED'
        });
      }
      
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Run a portfolio risk analysis for my holdings" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "🚀 Started portfolio risk job. Job ID: job_abc123. I'll notify you when it completes.",
          action: "JOB_SUBMITTED"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Calculate Black-Scholes price for a call option" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "🚀 Started options pricing job. Job ID: job_def456. I'll notify you when it completes.",
          action: "JOB_SUBMITTED"
        }
      }
    ]
  ]
};

function parseJobType(text: string): JobType {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('portfolio') && lowerText.includes('risk')) {
    return 'portfolio_risk';
  }
  if (lowerText.includes('option') && (lowerText.includes('pric') || lowerText.includes('black'))) {
    return 'options_pricing';
  }
  if (lowerText.includes('yield') && lowerText.includes('optim')) {
    return 'yield_optimization';
  }
  if (lowerText.includes('backtest') || lowerText.includes('strategy')) {
    return 'backtest_strategy';
  }
  if (lowerText.includes('credit') && lowerText.includes('risk')) {
    return 'credit_risk';
  }
  
  return 'generic_compute';
}

function parseParameters(text: string): any {
  // Extract parameters from natural language
  // This is a simplified version - in production you'd use NLP
  const params: any = {};
  
  // Extract numerical values
  const numbers = text.match(/\d+\.?\d*/g);
  if (numbers) {
    params.numbers = numbers.map(n => parseFloat(n));
  }
  
  // Extract common financial terms
  if (text.includes('call')) params.optionType = 'call';
  if (text.includes('put')) params.optionType = 'put';
  
  return params;
}