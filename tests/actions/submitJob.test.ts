/**
 * Test suite for submitJob action
 * Demonstrates the testing approach and coverage
 */

import { submitJobAction } from '../../src/actions/submitJob';
import { NosanaJobManager } from '../../src/services/jobManager';
import { IAgentRuntime, Memory } from '@elizaos/core';

// Mock the job manager
jest.mock('../../src/services/jobManager');
const mockJobManager = NosanaJobManager as jest.MockedClass<typeof NosanaJobManager>;

describe('submitJobAction', () => {
  let mockRuntime: jest.Mocked<IAgentRuntime>;
  let mockMessage: Memory;
  let mockJobManagerInstance: jest.Mocked<NosanaJobManager>;

  beforeEach(() => {
    // Setup mocks
    mockRuntime = {
      agentId: 'test-agent-id',
      embed: jest.fn().mockReturnValue([0.1, 0.2, 0.3]),
      messageManager: {
        createMemory: jest.fn().mockResolvedValue({ id: 'memory-123' })
      }
    } as any;

    mockMessage = {
      userId: 'user-123',
      roomId: 'room-456',
      content: {
        text: 'Run a portfolio risk analysis for my crypto holdings'
      }
    } as any;

    mockJobManagerInstance = {
      submitJob: jest.fn().mockResolvedValue('job_abc123')
    } as any;

    mockJobManager.mockImplementation(() => mockJobManagerInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate financial computation keywords', async () => {
      const testCases = [
        'run portfolio risk analysis',
        'calculate options pricing', 
        'optimize my yields',
        'backtest trading strategy',
        'compute portfolio volatility'
      ];

      for (const text of testCases) {
        const message = { ...mockMessage, content: { text } };
        const result = await submitJobAction.validate(mockRuntime, message);
        expect(result).toBe(true);
      }
    });

    it('should reject non-financial requests', async () => {
      const testCases = [
        'what is the weather today',
        'hello world',
        'send email to john'
      ];

      for (const text of testCases) {
        const message = { ...mockMessage, content: { text } };
        const result = await submitJobAction.validate(mockRuntime, message);
        expect(result).toBe(false);
      }
    });
  });

  describe('handler', () => {
    it('should submit portfolio risk job successfully', async () => {
      const callback = jest.fn();
      
      const result = await submitJobAction.handler(
        mockRuntime,
        mockMessage,
        {},
        {},
        callback
      );

      expect(result).toBe(true);
      expect(mockJobManagerInstance.submitJob).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'python:3.9-slim',
          cmd: ['python', '/app/portfolio_risk.py']
        }),
        expect.objectContaining({
          roomId: 'room-456',
          userId: 'user-123',
          type: 'portfolio_risk'
        })
      );

      expect(mockRuntime.messageManager.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            text: expect.stringContaining('job_abc123'),
            action: 'JOB_SUBMITTED',
            jobId: 'job_abc123'
          })
        })
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('job_abc123'),
          action: 'JOB_SUBMITTED'
        })
      );
    });

    it('should handle job submission failures', async () => {
      mockJobManagerInstance.submitJob.mockRejectedValue(
        new Error('Insufficient funds')
      );
      
      const callback = jest.fn();
      
      const result = await submitJobAction.handler(
        mockRuntime,
        mockMessage,
        {},
        {},
        callback
      );

      expect(result).toBe(false);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Insufficient funds'),
          action: 'JOB_SUBMISSION_FAILED'
        })
      );
    });

    it('should parse different job types correctly', async () => {
      const testCases = [
        { input: 'price call option', expectedType: 'options_pricing' },
        { input: 'optimize defi yields', expectedType: 'yield_optimization' },
        { input: 'backtest my strategy', expectedType: 'backtest_strategy' },
        { input: 'credit risk analysis', expectedType: 'credit_risk' },
        { input: 'run some computation', expectedType: 'generic_compute' }
      ];

      for (const testCase of testCases) {
        const message = { ...mockMessage, content: { text: testCase.input } };
        
        await submitJobAction.handler(mockRuntime, message, {}, {});
        
        expect(mockJobManagerInstance.submitJob).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: testCase.expectedType
          })
        );
        
        jest.clearAllMocks();
      }
    });
  });

  describe('integration test', () => {
    it('should handle complete job submission workflow', async () => {
      const callback = jest.fn();
      
      // Test the full workflow
      const isValid = await submitJobAction.validate(mockRuntime, mockMessage);
      expect(isValid).toBe(true);
      
      const success = await submitJobAction.handler(
        mockRuntime,
        mockMessage,
        {},
        {},
        callback
      );
      
      expect(success).toBe(true);
      
      // Verify all interactions occurred
      expect(mockJobManagerInstance.submitJob).toHaveBeenCalled();
      expect(mockRuntime.messageManager.createMemory).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
      
      // Verify memory content includes job tracking info
      const memoryCall = mockRuntime.messageManager.createMemory.mock.calls[0][0];
      expect(memoryCall.content).toMatchObject({
        action: 'JOB_SUBMITTED',
        jobId: 'job_abc123',
        jobType: 'portfolio_risk'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle missing callback gracefully', async () => {
      const result = await submitJobAction.handler(
        mockRuntime,
        mockMessage,
        {}
      );
      
      expect(result).toBe(true);
      expect(mockJobManagerInstance.submitJob).toHaveBeenCalled();
    });

    it('should handle job manager initialization errors', async () => {
      mockJobManager.mockImplementation(() => {
        throw new Error('Failed to initialize job manager');
      });
      
      const callback = jest.fn();
      
      const result = await submitJobAction.handler(
        mockRuntime,
        mockMessage,
        {},
        {},
        callback
      );
      
      expect(result).toBe(false);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'JOB_SUBMISSION_FAILED'
        })
      );
    });
  });
});

// Test helper to verify job specifications
describe('job specification generation', () => {
  it('should generate correct portfolio risk job spec', () => {
    const { JobTemplates } = require('../../src/templates/fintech');
    
    const jobSpec = JobTemplates.createJobSpec('portfolio_risk', {
      portfolioData: JSON.stringify([
        { symbol: 'BTC', quantity: 1, price: 50000 }
      ])
    });
    
    expect(jobSpec).toMatchObject({
      image: 'python:3.9-slim',
      cmd: ['python', '/app/portfolio_risk.py'],
      resources: {
        cpu: 2,
        memory: '4Gi'
      },
      metadata: {
        name: 'Portfolio Risk Analysis',
        tags: expect.arrayContaining(['fintech', 'risk-management'])
      }
    });
  });
});