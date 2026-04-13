import { Connection, PublicKey, VoteAccountInfo } from '@solana/web3.js';

export interface ValidatorHealth {
  publicKey: string;
  isHealthy: boolean;
  stake: number;
  responseTime: number;
  lastUpdated: Date;
  errors: string[];
}

export interface ValidatorMetrics {
  totalStake: number;
  activeValidators: number;
  averageResponseTime: number;
  healthyValidators: number;
}

export class ValidatorService {
  private connection: Connection;
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
  private readonly MIN_STAKE_THRESHOLD = 1000000; // 1 SOL in lamports
  
  constructor(rpcEndpoint: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcEndpoint, 'confirmed');
  }

  /**
   * Check the health of a single validator
   */
  async checkValidatorHealth(validatorPublicKey: string): Promise<ValidatorHealth> {
    const startTime = Date.now();
    const errors: string[] = [];
    let isHealthy = false;
    let stake = 0;

    try {
      const publicKey = new PublicKey(validatorPublicKey);
      
      // Get validator account info
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      if (!accountInfo) {
        errors.push('Validator account not found');
      } else {
        // Get vote accounts to check stake
        const voteAccounts = await this.connection.getVoteAccounts();
        const validatorVoteAccount = voteAccounts.current.find(
          account => account.nodePubkey === validatorPublicKey
        );

        if (validatorVoteAccount) {
          stake = validatorVoteAccount.activatedStake;
          isHealthy = stake >= this.MIN_STAKE_THRESHOLD;
          
          if (!isHealthy) {
            errors.push(`Stake below threshold: ${stake} < ${this.MIN_STAKE_THRESHOLD}`);
          }
        } else {
          errors.push('Validator not found in vote accounts');
        }
      }
    } catch (error) {
      errors.push(`Health check failed: ${error.message}`);
    }

    const responseTime = Date.now() - startTime;

    return {
      publicKey: validatorPublicKey,
      isHealthy,
      stake,
      responseTime,
      lastUpdated: new Date(),
      errors
    };
  }

  /**
   * Get overall network metrics
   */
  async getNetworkMetrics(): Promise<ValidatorMetrics> {
    try {
      const voteAccounts = await this.connection.getVoteAccounts();
      
      const totalStake = voteAccounts.current.reduce(
        (sum, account) => sum + account.activatedStake, 0
      );
      
      const activeValidators = voteAccounts.current.length;
      const healthyValidators = voteAccounts.current.filter(
        account => account.activatedStake >= this.MIN_STAKE_THRESHOLD
      ).length;

      return {
        totalStake,
        activeValidators,
        averageResponseTime: 0, // Would need historical data
        healthyValidators
      };
    } catch (error) {
      throw new Error(`Failed to get network metrics: ${error.message}`);
    }
  }
}