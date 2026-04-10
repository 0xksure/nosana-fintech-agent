/**
 * List Jobs Action
 */

import { 
  Action,
  IAgentRuntime, 
  Memory,
  State,
  HandlerCallback 
} from '@elizaos/core';
import { NosanaJobManager } from '../services/jobManager';

export const listJobsAction: Action = {
  name: 'LIST_JOBS',
  similes: [
    'list jobs',
    'my jobs',
    'show jobs',
    'recent jobs',
    'job history'
  ],
  description: 'List recent Nosana compute jobs for the current user',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    
    return (
      text.includes('list') && text.includes('job') ||
      text.includes('my jobs') ||
      text.includes('recent jobs') ||
      text.includes('job history') ||
      text.includes('show jobs')
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
      const jobs = await jobManager.listJobs(message.roomId, 10); // Last 10 jobs
      
      if (jobs.length === 0) {
        if (callback) {
          callback({
            text: "📋 No jobs found. Use 'run analysis' to start your first computation.",
            action: 'NO_JOBS_FOUND'
          });
        }
        return true;
      }
      
      const jobsList = jobs.map(job => {
        const statusEmoji = getStatusEmoji(job.status.status);
        const timeAgo = formatTimeAgo(job.submittedAt);
        
        return `${statusEmoji} **${job.id}** - ${job.type.replace('_', ' ')} (${timeAgo})`;
      }).join('\n');
      
      const responseText = `📋 **Recent Jobs:**

${jobsList}

💡 Use 'check status job_xxx' to get details on any job.`;
      
      if (callback) {
        callback({
          text: responseText,
          action: 'JOBS_LISTED'
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('List jobs failed:', error);
      
      if (callback) {
        callback({
          text: `❌ Failed to list jobs: ${error.message}`,
          action: 'LIST_JOBS_FAILED'
        });
      }
      
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Show me my recent jobs" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "📋 **Recent Jobs:**\n\n✅ **job_abc123** - portfolio risk (2 hours ago)\n🔄 **job_def456** - options pricing (5 minutes ago)",
          action: "JOBS_LISTED"
        }
      }
    ]
  ]
};

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'running': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    default: return '❓';
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}