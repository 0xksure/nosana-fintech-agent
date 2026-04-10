/**
 * Test setup and global configuration
 */

// Mock environment variables for testing
process.env.NOSANA_API_KEY = 'test_api_key';
process.env.NOSANA_RPC_ENDPOINT = 'https://api.testnet.solana.com';
process.env.ELIZAOS_LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(30000);