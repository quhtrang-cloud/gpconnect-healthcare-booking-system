const { google } = require('googleapis')
const pool = require('../config/db')

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Europe/London'

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

function getGoogleAuthUrl() {
  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  })
}

async function getGoogleTokens(code) {
  try {
    const { tokens } = await createOAuthClient().getToken(code)
    return tokens
  } catch (error) {
    console.error('Error exchanging Google authorization code:', error.message)
    throw new Error('Failed to exchange authorization code')
  }
}

async function refreshToken(tokens) {
  if (!tokens?.refresh_token) throw new Error('No refresh token available')

  const client = createOAuthClient()
  client.setCredentials({ refresh_token: tokens.refresh_token })
  const { credentials } = await client.refreshAccessToken()
  const updatedTokens = {
    ...tokens,
    ...credentials,
    refresh_token: credentials.refresh_token || tokens.refresh_token,
  }

  await pool.query(
    `UPDATE users SET google_tokens = $1
     WHERE google_tokens->>'refresh_token' = $2`,
    [updatedTokens, tokens.refresh_token]
  )
  return updatedTokens
}

function calendarFor(accessToken) {
  const client = createOAuthClient()
  client.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth: client })
}

async function fetchCalendarEvents(accessToken, startTime, endTime) {
  const response = await calendarFor(accessToken).events.list({
    calendarId: 'primary',
    timeMin: new Date(startTime).toISOString(),
    timeMax: new Date(endTime).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (response.data.items || []).map(event => ({
    summary: event.summary,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
  }))
}

async function checkGoogleConflicts(tokens, startTime, endTime) {
  try {
    return await fetchCalendarEvents(tokens.access_token, startTime, endTime)
  } catch (error) {
    if (error.code === 401) {
      const updatedTokens = await refreshToken(tokens)
      return fetchCalendarEvents(updatedTokens.access_token, startTime, endTime)
    }
    console.error('Error fetching Google Calendar events:', error.message)
    throw new Error('Failed to check Google Calendar conflicts')
  }
}

function buildEventData(event) {
  return {
    summary: event.summary,
    start: { dateTime: new Date(event.start).toISOString(), timeZone: APP_TIMEZONE },
    end: { dateTime: new Date(event.end).toISOString(), timeZone: APP_TIMEZONE },
  }
}

async function insertCalendarEvent(accessToken, event) {
  const response = await calendarFor(accessToken).events.insert({
    calendarId: 'primary',
    resource: buildEventData(event),
  })
  return response.data
}

async function createGoogleEvent(tokens, event) {
  try {
    return await insertCalendarEvent(tokens.access_token, event)
  } catch (error) {
    if (error.code === 401) {
      const updatedTokens = await refreshToken(tokens)
      return insertCalendarEvent(updatedTokens.access_token, event)
    }
    console.error('Error creating Google Calendar event:', error.message)
    throw new Error('Failed to create Google Calendar event')
  }
}

module.exports = {
  getGoogleAuthUrl,
  getGoogleTokens,
  checkGoogleConflicts,
  createGoogleEvent,
}
