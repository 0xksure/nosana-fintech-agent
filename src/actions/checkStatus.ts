/**
 * Check Job Status Action
 */

import { 
  Action,
  IAgentRuntime, 
  Memory,
  State,
  HandlerCallback 
} from '@elizaos/core';
import { NosanaJobManager } from '../services/jobManager';

export const checkJobStatusAction: Action = {
  name: 'CHECK_JOB_STATUS',
  similes: [
    'check status',
    'job status',
    'how is my job',
    'is it done',
    'check progress',
    'status update'
  ],
  description: 'Check the status of a Nosana compute job',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    
    return (
      text.includes('status') ||
      text.includes('progress') ||
      text.includes('done') ||
      text.includes('finished') ||
      text.includes('complete') ||
      /job[_\s]*[a-z0-9]+/.test(text) // Contains job ID pattern
    );
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
      const text = message.content.text;
      
      // Extract job ID from message
      const jobId = extractJobId(text);
      
      if (!jobId) {
        // No specific job ID, show all recent jobs
        const recentJobs = await jobManager.listJobs(message.roomId);
        
        if (recentJobs.length === 0) {
          if (callback) {
            callback({
              text: "📋 No active jobs found. Use 'run analysis' to start a new computation.",
              action: 'NO_JOBS_FOUND'
            });
          }
          return true;
        }
        
        const jobsText = recentJobs.map(job => 
          `• Job ${job.id}: ${job.status} (${job.type.replace('_', ' ')})`
        ).join('\n');
        
        if (callback) {
          callback({
            text: `📋 Recent jobs:\n${jobsText}`,
            action: 'JOBS_LISTED'
          });
        }
        
        return true;
      }
      
      // Check specific job status
      const status = await jobManager.getJobStatus(jobId);
      
      let statusText = '';
      let emoji = '';
      
      switch (status.status) {
        case 'pending':
          emoji = '⏳';
          statusText = 'waiting for available compute node';
          break;
        case 'running':
          emoji = '🔄';
          statusText = 'processing on the network';
          if (status.progress) {
            statusText += ` (${status.progress}% complete)`;
          }
          break;
        case 'completed':
          emoji = '✅';
          statusText = 'completed successfully';
          if (status.result) {
            statusText += `\n\n📊 Results:\n${formatResult(status.result)}`;
          }
          break;
        case 'failed':
          emoji = '❌';
          statusText = `failed: ${status.error || 'Unknown error'}`;
          break;
      }
      
      if (callback) {
        callback({
          text: `${emoji} Job ${jobId}: ${statusText}`,
          action: 'JOB_STATUS_CHECKED'
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('Status check failed:', error);
      
      if (callback) {
        callback({
          text: `❌ Failed to check job status: ${error.message}`,
          action: 'STATUS_CHECK_FAILED'
        });
      }
      
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Check status of job_abc123" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "✅ Job job_abc123: completed successfully\n\n📊 Results:\nVaR (95%): 2.3%\nVaR (99%): 4.1%",
          action: "JOB_STATUS_CHECKED"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "How is my portfolio analysis going?" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "🔄 Job job_def456: processing on the network (75% complete)",
          action: "JOB_STATUS_CHECKED"
        }
      }
    ]
  ]
};

function extractJobId(text: string): string | null {
  // Look for job ID patterns like job_abc123, job123, etc.
  const jobIdMatch = text.match(/job[_\s]*([a-z0-9]+)/i);
  return jobIdMatch ? `job_${jobIdMatch[1]}` : null;
}

function formatResult(result: any): string {
  if (typeof result === 'object') {
    return Object.entries(result)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
  return String(result);
}