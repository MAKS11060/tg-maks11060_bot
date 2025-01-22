import {exportKeyRawX25519, generateKeyPair} from '@maks11060/crypto'
import {encodeBase64} from '@std/encoding/base64'
import {decodeHex} from '@std/encoding/hex'

// CF
export interface CfApiOptions {
  method: string
  endpoint: string
  body: Record<string, unknown>
  token?: string
}

export interface CfApiResponse {
  result: {
    id: string
    type: 'i'
    name: string
    key: string
    account: {
      id: string
      account_type: 'free' | string
      created: string
      updated: string
      premium_data: number | 0
      quota: number | 0
      warp_plus: boolean
      referral_count: number | 0
      referral_renewal_countdown: number | 0
      role: 'child'
      license: string
      /** 3 months ahead */
      ttl: string
    }
    config: {
      client_id: string
      peers: [
        {
          public_key: string
          endpoint: {
            v4: string
            v6: string
            host: `${string}:${string}`
            ports: number[]
          }
        }
      ]
      interface: {
        addresses: {
          v4: string
          v6: string
        }
      }
      services: {
        http_proxy: string
      }
      metrics: {
        ping: number | 900
        report: number | 900
      }
    }
    token?: string
    warp_enabled: true
    waitlist_enabled: false
    created: string
    updated: string
    tos: string
    place: 0
    locale: string | 'en-US'
    enabled: boolean
    install_id: ''
    fcm_token: ''
    policy: {
      tunnel_protocol: 'masque'
    }
  }
  success: boolean
  errors: any[]
  messages: any[]
}

const api = 'https://api.cloudflareclient.com/v0i1909051800'

const cfApi = async (options: CfApiOptions) => {
  const res = await fetch(`${api}/${options.endpoint}`, {
    method: options.method,
    headers: {
      'user-agent': '',
      'content-type': 'application/json',
      ...(options.token && {authorization: `Bearer ${options.token}`}),
    },
    body: JSON.stringify(options.body),
  })

  if (!res.ok) throw await res.text()
  return (await res.json()) as CfApiResponse
}

// Conf
interface ConfigOptions {
  priv: string
  pubKey: string
  clientIpv4: string
  clientIpv6: string
  host: string
  port: string | number
  preset?: {
    Jc: number
    Jmin: number
    Jmax: number
  }
}

export const presets = {
  default: {
    Jc: 4,
    Jmin: 40,
    Jmax: 70,
  },
  alt: {
    Jc: 120,
    Jmin: 23,
    Jmax: 911,
  },
}

export const makeConfig = (options: ConfigOptions) => {
  return `[Interface]
PrivateKey = ${options.priv}
S1 = 0
S2 = 0
Jc = ${options.preset?.Jc ?? presets.default.Jc}
Jmin = ${options.preset?.Jmin ?? presets.default.Jmin}
Jmax = ${options.preset?.Jmax ?? presets.default.Jmax}
H1 = 1
H2 = 2
H3 = 3
H4 = 4
Address = ${options.clientIpv4}, ${options.clientIpv6}
DNS = 1.1.1.1, 2606:4700:4700::1111, 1.0.0.1, 2606:4700:4700::1001

[Peer]
PublicKey = ${options.pubKey}
AllowedIPs = 0.0.0.0/1, 128.0.0.0/1, ::/1, 8000::/1
Endpoint = ${options.host}:${options.port}
`
}

export const generateWarpConf = async (preset: ConfigOptions['preset'] = presets.default) => {
  const pair = await generateKeyPair('X25519')
  const keys = await exportKeyRawX25519(pair)
  const [priv, pub] = [encodeBase64(decodeHex(keys.private)), encodeBase64(decodeHex(keys.public))]

  // Register
  const response = await cfApi({
    method: 'POST',
    endpoint: 'reg',
    body: {
      install_id: '',
      tos: `${new Date().toISOString()}`,
      key: pub,
      fcm_token: '',
      type: 'ios',
      locale: 'en_US',
    },
  })
  if (!response.success) {
    console.error(response)
    throw response
  }

  // WARP Enable
  const warpResponse = await cfApi({
    method: 'PATCH',
    endpoint: `reg/${response.result.id}`,
    token: response.result.token,
    body: {warp_enabled: true},
  })
  if (!warpResponse.success) {
    console.error(warpResponse)
    throw warpResponse
  }

  const {
    peers: [
      {
        public_key: pubKey,
        endpoint: {host: peerEndpoint},
      },
    ],
    interface: {
      addresses: {v4: clientIpv4, v6: clientIpv6},
    },
  } = warpResponse.result.config
  const [host, port] = peerEndpoint.split(':', 2)

  return makeConfig({
    priv,
    pubKey,
    clientIpv4,
    clientIpv6,
    host,
    port,
    preset,
  })
}
