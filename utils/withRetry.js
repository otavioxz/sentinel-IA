const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn, { retries = 3, baseDelayMs = 1000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error?.status === 503 || error?.status === 429;
      if (!isRetryable || attempt === retries) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

module.exports = { withRetry };
