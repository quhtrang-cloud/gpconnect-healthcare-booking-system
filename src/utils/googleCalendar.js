const { google } = require('googleapis')
const pool = require('../config/db')

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || 'Europe/London'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const calendar = google.calendar({
  version: 'v3',
  auth: oauth2Client,
})

function getGoogleAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  })
}

async function getGoogleTokens(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code)

    return tokens
  } catch (error) {
    console.error(
      'Error exchanging code for tokens:',
      error.message
    )

    throw new Error(
      'Failed to exchange authorization code'
    )
  }
}

async function refreshToken(tokens) {
  try {
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available')
    }

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    })

    const { credentials } =
      await oauth2Client.refreshAccessToken()

    const updatedTokens = {
      access_token: credentials.access_token,
      refresh_token: tokens.refresh_token,
    }

    await pool.query(
      `
        UPDATE users
        SET google_tokens = $1
        WHERE google_tokens->>'refresh_token' = $2
      `,
      [
        updatedTokens,
        tokens.refresh_token,
      ]
    )

    return updatedTokens
  } catch (error) {
    console.error(
      'Error refreshing Google token:',
      error.message
    )

    throw new Error(
      'Failed to refresh Google token'
    )
  }
}

async function fetchCalendarEvents(
  accessToken,
  startTime,
  endTime
) {
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(startTime).toISOString(),
    timeMax: new Date(endTime).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  return events.map((event) => ({
    summary: event.summary,
    start:
      event.start?.dateTime ||
      event.start?.date,
    end:
      event.end?.dateTime ||
      event.end?.date,
  }))
}

async function checkGoogleConflicts(
  tokens,
  startTime,
  endTime
) {
  try {
    return await fetchCalendarEvents(
      tokens.access_token,
      startTime,
      endTime
    )
  } catch (error) {
    if (error.code === 401) {
      const updatedTokens =
        await refreshToken(tokens)

      return fetchCalendarEvents(
        updatedTokens.access_token,
        startTime,
        endTime
      )
    }

    console.error(
      'Error fetching Google Calendar events:',
      error.message
    )

    throw new Error(
      `Failed to check Google Calendar conflicts: ${error.message}`
    )
  }
}

function buildEventData(event) {
  return {
    summary: event.summary,
    start: {
      dateTime: new Date(
        event.start
      ).toISOString(),
      timeZone: APP_TIMEZONE,
    },
    end: {
      dateTime: new Date(
        event.end
      ).toISOString(),
      timeZone: APP_TIMEZONE,
    },
  }
}

async function insertCalendarEvent(
  accessToken,
  event
) {
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const response =
    await calendar.events.insert({
      calendarId: 'primary',
      resource: buildEventData(event),
    })

  return response.data
}

async function createGoogleEvent(
  tokens,
  event
) {
  try {
    const createdEvent =
      await insertCalendarEvent(
        tokens.access_token,
        event
      )

    console.log(
      'Google Calendar event created:',
      createdEvent.id
    )

    return createdEvent
  } catch (error) {
    if (error.code === 401) {
      const updatedTokens =
        await refreshToken(tokens)

      const createdEvent =
        await insertCalendarEvent(
          updatedTokens.access_token,
          event
        )

      console.log(
        'Google Calendar event created after token refresh:',
        createdEvent.id
      )

      return createdEvent
    }

    console.error(
      'Error creating Google Calendar event:',
      error.message
    )

    throw new Error(
      `Failed to create Google Calendar event: ${error.message}`
    )
  }
}

module.exports = {
  getGoogleAuthUrl,
  getGoogleTokens,
  checkGoogleConflicts,
  createGoogleEvent,
}