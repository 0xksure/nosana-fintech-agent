/**
 * Nosana FinTech Agent Plugin for ElizaOS
 * 
 * This plugin integrates ElizaOS agents with the Nosana decentralized compute network,
 * specializing in financial computations and portfolio management.
 */

export { nosanaPlugin } from './plugin';
export { NosanaProvider } from './providers/nosana';
export { NosanaJobManager } from './services/jobManager';
export * from './types';
export * from './actions';
export * from './templates';

// Version info
export const version = '1.0.0';
export const name = 'nosana-fintech-agent';