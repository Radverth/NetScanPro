import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import pLimit from 'p-limit'
import { getApiKey } from '../store'

const ITGLUE_BASE_URL = 'https://api.itglue.com'
const RATE_LIMIT = 10 // max concurrent requests
const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 1000 // ms

const limiter = pLimit(RATE_LIMIT)

interface RetryableAxiosInstance extends AxiosInstance {
  // Typed wrappers
}

/**
 * Create an Axios instance configured for the IT Glue API.
 * Optionally pass an API key; otherwise reads from electron-store.
 */
export function createClient(apiKey?: string): RetryableAxiosInstance {
  const key = apiKey ?? getApiKey()

  const instance = axios.create({
    baseURL: ITGLUE_BASE_URL,
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/vnd.api+json',
    },
    timeout: 30000,
  })

  // Response interceptor for rate limiting retry
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config as AxiosRequestConfig & { _retryCount?: number }
      if (!config) return Promise.reject(error)

      config._retryCount = config._retryCount ?? 0

      const status = error.response?.status
      const shouldRetry =
        (status === 429 || status === 503 || status === 502) &&
        config._retryCount < MAX_RETRIES

      if (shouldRetry) {
        config._retryCount++

        // Exponential backoff with jitter
        const retryAfter = error.response?.headers?.['retry-after']
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : RETRY_BASE_DELAY * Math.pow(2, config._retryCount - 1) + Math.random() * 500

        await sleep(delay)
        return instance(config)
      }

      return Promise.reject(error)
    },
  )

  return instance as RetryableAxiosInstance
}

/**
 * Rate-limited GET request.
 */
export async function rateLimitedGet<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
): Promise<AxiosResponse<T>> {
  const client = createClient()
  return limiter(() => client.get<T>(url, { params }))
}

/**
 * Rate-limited POST request.
 */
export async function rateLimitedPost<T = unknown>(
  url: string,
  data: unknown,
): Promise<AxiosResponse<T>> {
  const client = createClient()
  return limiter(() => client.post<T>(url, data))
}

/**
 * Rate-limited PATCH request.
 */
export async function rateLimitedPatch<T = unknown>(
  url: string,
  data: unknown,
): Promise<AxiosResponse<T>> {
  const client = createClient()
  return limiter(() => client.patch<T>(url, data))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
