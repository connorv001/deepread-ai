import { logger } from '../utils/logger';

/**
 * Circuit Breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit Breaker for AI model calls
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(
    private readonly threshold: number = 5,        // Open after 5 failures
    private readonly timeout: number = 60000,      // Try again after 60s
    private readonly halfOpenSuccesses: number = 2 // Need 2 successes to close
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < (this.nextAttemptTime || 0)) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      // Try transitioning to HALF_OPEN
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      logger.info('Circuit breaker transitioning to HALF_OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccesses) {
        this.state = CircuitState.CLOSED;
        logger.info('Circuit breaker CLOSED - service recovered');
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;
      logger.warn('Circuit breaker reopened to OPEN state');
    }

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;
      logger.error(`Circuit breaker OPEN after ${this.failureCount} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${totalDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

/**
 * Model fallback chain with circuit breakers
 */
export class AIModelFallback {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  // Fallback chain: primary -> secondary -> tertiary
  private readonly fallbackChain = [
    'google/gemini-3-flash:beta',
    'google/gemini-3-pro:beta',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini'
  ];

  getCircuitBreaker(model: string): CircuitBreaker {
    if (!this.circuitBreakers.has(model)) {
      this.circuitBreakers.set(model, new CircuitBreaker());
    }
    return this.circuitBreakers.get(model)!;
  }

  /**
   * Execute AI call with automatic fallback
   */
  async executeWithFallback<T>(
    fn: (model: string) => Promise<T>,
    preferredModel?: string
  ): Promise<{ result: T; modelUsed: string }> {
    // Build model priority list
    const models = preferredModel
      ? [preferredModel, ...this.fallbackChain.filter(m => m !== preferredModel)]
      : this.fallbackChain;

    let lastError: Error | undefined;

    for (const model of models) {
      const breaker = this.getCircuitBreaker(model);

      try {
        logger.info(`Attempting AI call with model: ${model}`);

        const result = await breaker.execute(() =>
          retryWithBackoff(() => fn(model), 2, 500)
        );

        if (model !== models[0]) {
          logger.warn(`Fallback successful with model: ${model}`);
        }

        return { result, modelUsed: model };
      } catch (error) {
        lastError = error as Error;
        logger.error(`Model ${model} failed:`, error);
        // Continue to next model in fallback chain
      }
    }

    throw new Error(
      `All AI models failed. Last error: ${lastError?.message || 'Unknown'}`
    );
  }

  /**
   * Get status of all circuit breakers
   */
  getStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [model, breaker] of this.circuitBreakers.entries()) {
      status[model] = breaker.getState();
    }
    return status;
  }
}

export const aiModelFallback = new AIModelFallback();
