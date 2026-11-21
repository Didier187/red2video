import { google } from 'googleapis'
import { promises as fs } from 'fs'
import path from 'path'
import http from 'http'
import { URL } from 'url'
import type { OAuth2Client } from 'google-auth-library'

const TOKENS_PATH = path.join(process.cwd(), '.youtube-tokens.json')
const CLIENT_SECRET_PATH = path.join(
  process.cwd(),
  '.youtube-client-secret.json',
)
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
const REDIRECT_PORT = 3333
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`

interface ClientCredentials {
  client_id: string
  client_secret: string
}

async function loadClientCredentials(): Promise<ClientCredentials> {
  try {
    const content = await fs.readFile(CLIENT_SECRET_PATH, 'utf-8')
    const parsed = JSON.parse(content)
    // Google exports credentials under "installed" or "web" key
    const creds = parsed.installed || parsed.web || parsed
    if (!creds.client_id || !creds.client_secret) {
      throw new Error('Missing client_id or client_secret')
    }
    return { client_id: creds.client_id, client_secret: creds.client_secret }
  } catch (error) {
    throw new Error(
      `Failed to load YouTube client credentials from ${CLIENT_SECRET_PATH}. ` +
        'Download your OAuth 2.0 client secret from Google Cloud Console and save it there. ' +
        `Original error: ${error instanceof Error ? error.message : error}`,
    )
  }
}

/**
 * Get an authenticated OAuth2 client, using stored tokens.
 * Throws if no tokens exist (user must authorize first).
 */
export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const creds = await loadClientCredentials()
  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    REDIRECT_URI,
  )

  let tokensContent: string
  try {
    tokensContent = await fs.readFile(TOKENS_PATH, 'utf-8')
  } catch {
    throw new Error(
      'YouTube not authorized. Complete the authorization flow first via POST /api/youtube-auth',
    )
  }

  const tokens = JSON.parse(tokensContent)
  oauth2Client.setCredentials(tokens)

  // Auto-refresh if expired
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await fs.writeFile(TOKENS_PATH, JSON.stringify(credentials, null, 2))
    oauth2Client.setCredentials(credentials)
  }

  return oauth2Client
}

/**
 * Check if YouTube tokens exist and are loadable.
 */
export async function isYouTubeAuthorized(): Promise<boolean> {
  try {
    await getAuthenticatedClient()
    return true
  } catch {
    return false
  }
}

/**
 * One-time OAuth authorization flow.
 * Starts a local HTTP server, returns the auth URL for the user to open.
 * Waits for the callback, exchanges code for tokens, and saves them.
 */
export async function authorizeYouTube(): Promise<{
  authUrl: string
  waitForCallback: () => Promise<void>
}> {
  const creds = await loadClientCredentials()
  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    REDIRECT_URI,
  )

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  const waitForCallback = () =>
    new Promise<void>((resolve, reject) => {
      // Timeout after 5 minutes; cleared once the server closes so a
      // completed flow doesn't keep a pending timer around.
      const timeout = setTimeout(() => {
        server.close()
        reject(new Error('YouTube authorization timed out after 5 minutes'))
      }, 5 * 60 * 1000)

      const server = http.createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`)
          if (reqUrl.pathname !== '/oauth2callback') {
            res.writeHead(404)
            res.end('Not found')
            return
          }

          const code = reqUrl.searchParams.get('code')
          const error = reqUrl.searchParams.get('error')

          if (error) {
            res.writeHead(400)
            res.end(`Authorization denied: ${error}`)
            server.close()
            reject(new Error(`YouTube authorization denied: ${error}`))
            return
          }

          if (!code) {
            res.writeHead(400)
            res.end('No authorization code received')
            server.close()
            reject(new Error('No authorization code received'))
            return
          }

          const { tokens } = await oauth2Client.getToken(code)
          await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2))

          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(
            '<html><body><h1>YouTube Authorization Successful!</h1>' +
              '<p>You can close this tab and return to the app.</p></body></html>',
          )
          server.close()
          resolve()
        } catch (err) {
          res.writeHead(500)
          res.end('Authorization failed')
          server.close()
          reject(err)
        }
      })

      server.on('close', () => clearTimeout(timeout))
      server.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      server.listen(REDIRECT_PORT, () => {
        console.log(
          `[youtube-auth] Waiting for OAuth callback on port ${REDIRECT_PORT}...`,
        )
      })
    })

  return { authUrl, waitForCallback }
}
