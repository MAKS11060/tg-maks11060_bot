export class HTTPError extends Error {
  override name: string = this.constructor.name

  readonly response: Response
  readonly status: number

  constructor(response: Response, message?: string, options?: ErrorOptions) {
    super(message ?? `HTTP ${response.status} ${response.statusText} | ${response.url}`, options)

    this.response = response
    this.status = response.status
  }

  get statusText(): string {
    return this.response.statusText
  }
  get url(): string {
    return this.response.url
  }
}

export async function parseResponse<T>(
  request: Promise<{
    data?: T
    error?: unknown
    response: Response
  }>,
): Promise<{data: T; response: Response}> {
  const {data, error, response} = await request

  if (!response.ok) {
    throw new HTTPError(response, undefined, {cause: error})
  }

  if (data === undefined) {
    throw new HTTPError(
      response,
      'Empty response data',
      {cause: error},
    )
  }

  return {data, response}
}
