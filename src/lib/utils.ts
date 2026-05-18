const encoder = new TextEncoder()

export const basicAuth = (username: string, password: string) => {
  return encoder.encode(`${username}:${password}`).toBase64()
}
