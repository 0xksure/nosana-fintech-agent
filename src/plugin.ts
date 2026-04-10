/**
 * Main Nosana FinTech Agent Plugin for ElizaOS
 */

import { Plugin } from '@elizaos/core';
import { NosanaProvider } from './providers/nosana';
import { 
  submitJobAction,
  checkJobStatusAction, 
  getNetworkStatsAction,
  listJobsAction 
} from './actions';

export const nosanaPlugin: Plugin = {
  name: 'nosana-fintech-agent',
  description: 'Decentralized compute integration for financial analysis and portfolio management',
  
  actions: [
    submitJobAction,
    checkJobStatusAction,
    getNetworkStatsAction,
    listJobsAction
  ],
  
  providers: [
    NosanaProvider
  ],
  
  evaluators: [],
  
  services: []
};