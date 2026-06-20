const encoder = new TextEncoder()

export const basicAuth = (cred: {username: string; password: string}) => {
  return `Basic ${encoder.encode(`${cred.username}:${cred.password}`).toBase64()}`
}
