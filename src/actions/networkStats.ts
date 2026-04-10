/**
 * Network Statistics Action
 */

import { 
  Action,
  IAgentRuntime, 
  Memory,
  State,
  HandlerCallback 
} from '@elizaos/core';
import { NosanaProvider } from '../providers/nosana';

export const getNetworkStatsAction: Action = {
  name: 'GET_NETWORK_STATS',
  similes: [
    'network stats',
    'nosana status',
    'how many nodes',
    'network health',
    'capacity',
    'utilization'
  ],
  description: 'Get current Nosana network statistics and health metrics',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    
    return (
      text.includes('network') ||
      text.includes('nosana') ||
      text.includes('nodes') ||
      text.includes('capacity') ||
      text.includes('stats')
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
      const provider = new NosanaProvider(runtime);
      const stats = await provider.getNetworkStats();
      
      const statsText = `🌐 **Nosana Network Status**

**Compute Capacity:**
• Active Nodes: ${stats.activeNodes.toLocaleString()}
• Total Capacity: ${stats.totalNodes.toLocaleString()} nodes
• Network Utilization: ${stats.networkUtilization.toFixed(1)}%

**Job Statistics:**
• Total Jobs Processed: ${stats.completedJobs.toLocaleString()}
• Average Job Time: ${formatDuration(stats.averageJobTime)}
• Current Queue: ${(stats.totalJobs - stats.completedJobs).toLocaleString()} pending

**Network Health:** ${getHealthStatus(stats.networkUtilization)}`;
      
      if (callback) {
        callback({
          text: statsText,
          action: 'NETWORK_STATS_RETRIEVED'
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('Network stats retrieval failed:', error);
      
      if (callback) {
        callback({
          text: `❌ Failed to retrieve network statistics: ${error.message}`,
          action: 'NETWORK_STATS_FAILED'
        });
      }
      
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "What's the current Nosana network status?" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "🌐 **Nosana Network Status**\n\n**Compute Capacity:**\n• Active Nodes: 1,234\n• Network Utilization: 67.3%",
          action: "NETWORK_STATS_RETRIEVED"
        }
      }
    ]
  ]
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getHealthStatus(utilization: number): string {
  if (utilization < 50) return '🟢 Excellent';
  if (utilization < 75) return '🟡 Good';
  if (utilization < 90) return '🟠 Busy';
  return '🔴 High Load';
}