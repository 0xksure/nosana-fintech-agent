import { Action, ActionExample, HandlerCallback } from '@ai16z/eliza/types';
import { ValidatorService } from '../services/validatorService.ts';

export const checkValidatorHealthAction: Action = {
  name: 'CHECK_VALIDATOR_HEALTH',
  similes: ['check validator', 'health check', 'validator status'],
  description: 'Check the health status of Solana validators',
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Check the health of validator HyPyZ5c3Wjz9eJTgPdCCF9T4Yr4RhvGwMhpn4eAJ2d8'
        }
      },
      {
        user: '{{user2}}', 
        content: {
          text: 'Checking validator health...\n\n✅ Validator: HyPyZ5c3Wjz9eJTgPdCCF9T4Yr4RhvGwMhpn4eAJ2d8\n📊 Stake: 50,000 SOL\n⚡ Response Time: 250ms\n✅ Status: Healthy'
        }
      }
    ]
  ] as ActionExample[][],
  handler: async (runtime, message, state, options, callback?: HandlerCallback) => {
    try {
      const validatorService = new ValidatorService();
      
      // Extract validator public key from message
      const text = message.content.text;
      const validatorMatch = text.match(/[A-Za-z0-9]{32,44}/); // Solana pubkey pattern
      
      if (!validatorMatch) {
        callback?.({
          text: 'Please provide a valid Solana validator public key.'
        });
        return;
      }

      const validatorPubkey = validatorMatch[0];
      const health = await validatorService.checkValidatorHealth(validatorPubkey);
      
      const statusEmoji = health.isHealthy ? '✅' : '❌';
      const stakeSOL = (health.stake / 1e9).toFixed(2);
      
      let response = `${statusEmoji} Validator Health Check\n\n`;
      response += `🔑 Validator: ${health.publicKey}\n`;
      response += `📊 Stake: ${stakeSOL} SOL\n`;
      response += `⚡ Response Time: ${health.responseTime}ms\n`;
      response += `📅 Last Updated: ${health.lastUpdated.toISOString()}\n`;
      response += `🏥 Status: ${health.isHealthy ? 'Healthy' : 'Unhealthy'}\n`;
      
      if (health.errors.length > 0) {
        response += `\n⚠️ Issues:\n${health.errors.map(e => `• ${e}`).join('\n')}`;
      }

      callback?.({ text: response });
    } catch (error) {
      callback?.({
        text: `Error checking validator health: ${error.message}`
      });
    }
  }
};