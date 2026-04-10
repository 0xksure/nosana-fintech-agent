/**
 * Nosana Job Manager - Handles job lifecycle and state management
 */

import { IAgentRuntime, UUID } from '@elizaos/core';
import { EventEmitter } from 'events';
import { NosanaJobSpec, JobContext, JobType, NosanaJobStatus } from '../types';
import { NosanaClient } from '../clients/nosana';

export class NosanaJobManager extends EventEmitter {
  private jobs = new Map<string, JobContext>();
  private client: NosanaClient;
  private runtime: IAgentRuntime;
  private pollInterval = 5000; // 5 seconds
  private maxConcurrentJobs = 10;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
    this.client = new NosanaClient({
      apiKey: process.env.NOSANA_API_KEY,
      rpcEndpoint: process.env.NOSANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
    });
    
    // Start background job monitoring
    this.startBackgroundMonitoring();
  }

  async submitJob(
    jobSpec: NosanaJobSpec, 
    context: { roomId: string; userId: UUID; type: JobType }
  ): Promise<string> {
    // Check concurrent job limit
    const activeJobs = Array.from(this.jobs.values())
      .filter(job => ['pending', 'running'].includes(job.status.status));
    
    if (activeJobs.length >= this.maxConcurrentJobs) {
      throw new Error(`Maximum concurrent jobs limit reached (${this.maxConcurrentJobs})`);
    }

    try {
      // Submit to Nosana network
      const jobId = await this.client.submitJob(jobSpec);
      
      // Create job context
      const jobContext: JobContext = {
        id: jobId,
        roomId: context.roomId,
        userId: context.userId,
        type: context.type,
        params: jobSpec,
        submittedAt: new Date(),
        status: {
          id: jobId,
          status: 'pending'
        }
      };
      
      // Store job context
      this.jobs.set(jobId, jobContext);
      
      // Start monitoring this specific job
      this.startJobMonitoring(jobId);
      
      this.emit('job-submitted', jobId, jobContext);
      
      return jobId;
      
    } catch (error) {
      console.error(`Failed to submit job:`, error);
      throw new Error(`Job submission failed: ${error.message}`);
    }
  }

  async getJobStatus(jobId: string): Promise<NosanaJobStatus> {
    const jobContext = this.jobs.get(jobId);
    
    if (!jobContext) {
      // Try to fetch from Nosana network
      try {
        return await this.client.getJobStatus(jobId);
      } catch (error) {
        throw new Error(`Job ${jobId} not found`);
      }
    }
    
    // Update status from network
    try {
      const networkStatus = await this.client.getJobStatus(jobId);
      jobContext.status = networkStatus;
      this.jobs.set(jobId, jobContext);
      
      return networkStatus;
    } catch (error) {
      console.error(`Failed to get job status for ${jobId}:`, error);
      return jobContext.status;
    }
  }

  async listJobs(roomId: string, limit = 20): Promise<JobContext[]> {
    const roomJobs = Array.from(this.jobs.values())
      .filter(job => job.roomId === roomId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, limit);
    
    return roomJobs;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.client.cancelJob(jobId);
      
      const jobContext = this.jobs.get(jobId);
      if (jobContext) {
        jobContext.status.status = 'failed';
        jobContext.status.error = 'Cancelled by user';
        this.jobs.set(jobId, jobContext);
      }
      
      this.emit('job-cancelled', jobId);
      return true;
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  private async startJobMonitoring(jobId: string): Promise<void> {
    const monitor = async () => {
      try {
        const status = await this.getJobStatus(jobId);
        const jobContext = this.jobs.get(jobId);
        
        if (!jobContext) return;
        
        // Update job context
        jobContext.status = status;
        this.jobs.set(jobId, jobContext);
        
        // Emit status updates
        this.emit('job-status-update', jobId, status);
        
        // Handle completion
        if (status.status === 'completed') {
          await this.handleJobCompletion(jobId, status);
          return; // Stop monitoring
        }
        
        // Handle failure
        if (status.status === 'failed') {
          await this.handleJobFailure(jobId, status);
          return; // Stop monitoring
        }
        
        // Continue monitoring if still running
        if (['pending', 'running'].includes(status.status)) {
          setTimeout(monitor, this.pollInterval);
        }
        
      } catch (error) {
        console.error(`Job monitoring failed for ${jobId}:`, error);
        setTimeout(monitor, this.pollInterval * 2); // Longer retry interval
      }
    };
    
    // Start monitoring with initial delay
    setTimeout(monitor, 1000);
  }

  private async handleJobCompletion(jobId: string, status: NosanaJobStatus): Promise<void> {
    const jobContext = this.jobs.get(jobId);
    
    if (!jobContext) return;
    
    try {
      // Create completion memory
      await this.runtime.messageManager.createMemory({
        userId: this.runtime.agentId,
        content: {
          text: `🎉 Job ${jobId} completed successfully!\n\n📊 ${this.formatJobResult(status.result, jobContext.type)}`,
          action: 'JOB_COMPLETED',
          jobId,
          result: status.result
        },
        roomId: jobContext.roomId,
        embedding: this.runtime.embed(`Job ${jobId} completed with results`)
      });
      
      this.emit('job-completed', jobId, status.result);
      
    } catch (error) {
      console.error(`Failed to handle job completion for ${jobId}:`, error);
    }
  }

  private async handleJobFailure(jobId: string, status: NosanaJobStatus): Promise<void> {
    const jobContext = this.jobs.get(jobId);
    
    if (!jobContext) return;
    
    try {
      // Create failure memory
      await this.runtime.messageManager.createMemory({
        userId: this.runtime.agentId,
        content: {
          text: `❌ Job ${jobId} failed: ${status.error || 'Unknown error'}`,
          action: 'JOB_FAILED',
          jobId,
          error: status.error
        },
        roomId: jobContext.roomId,
        embedding: this.runtime.embed(`Job ${jobId} failed`)
      });
      
      this.emit('job-failed', jobId, status.error);
      
    } catch (error) {
      console.error(`Failed to handle job failure for ${jobId}:`, error);
    }
  }

  private formatJobResult(result: any, jobType: JobType): string {
    if (!result) return 'No results available';
    
    switch (jobType) {
      case 'portfolio_risk':
        return `Risk Metrics:
• VaR (95%): ${result.var95?.toFixed(3) || 'N/A'}
• VaR (99%): ${result.var99?.toFixed(3) || 'N/A'}
• Expected Shortfall: ${result.expectedShortfall95?.toFixed(3) || 'N/A'}
• Portfolio Volatility: ${(result.volatility * 100)?.toFixed(2) || 'N/A'}%`;
        
      case 'options_pricing':
        return `Option Price: $${result.price?.toFixed(2) || 'N/A'}
• Delta: ${result.delta?.toFixed(4) || 'N/A'}
• Gamma: ${result.gamma?.toFixed(4) || 'N/A'}
• Theta: ${result.theta?.toFixed(4) || 'N/A'}
• Vega: ${result.vega?.toFixed(4) || 'N/A'}`;
        
      case 'yield_optimization':
        return `Recommended Strategy:
• Expected Return: ${(result.expectedReturn * 100)?.toFixed(2) || 'N/A'}%
• Risk Score: ${result.riskScore?.toFixed(1) || 'N/A'}/10
• Top Pool: ${result.recommendedPools?.[0]?.protocol || 'N/A'}`;
        
      default:
        return JSON.stringify(result, null, 2);
    }
  }

  private startBackgroundMonitoring(): void {
    // Clean up completed jobs older than 24 hours
    setInterval(() => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      for (const [jobId, job] of this.jobs.entries()) {
        if (job.submittedAt.getTime() < oneDayAgo && 
            ['completed', 'failed'].includes(job.status.status)) {
          this.jobs.delete(jobId);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}