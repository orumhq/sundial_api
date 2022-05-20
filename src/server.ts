import * as util from "util"
import * as urlLib from "url"
import * as fastify from "fastify"
import axios from "axios"

interface Call {
  id: number
  statusDelays: StatusDelay[]
}

interface StatusDelay {
  status: Status
  delay: number
}

type Status = "ringing" | "answered" | "completed"

const VALID_PHONE_REGEX = /^1\d{10}$/

const CALL_PATH = "/call"
const PORT = 4830

const setTimeoutPromise = util.promisify(setTimeout)

async function start(): Promise<void> {
  const server = fastify()

  // starting at an arbitrary number instead of 1 to avoid candidates conflating
  // this ID with an index in to the list of numbers they are asked to dial.
  let nextID = 1234

  server.get("/", async () => {
    return `The API server only supports POST requests to ${CALL_PATH}\n`
  })

  server.post(CALL_PATH, async request => {
    const { phone, webhookURL } = request.body
    if (typeof phone !== "string" || !VALID_PHONE_REGEX.test(phone)) {
      return { error: "Expected a valid phone" }
    }
    if (typeof webhookURL !== "string" || !isValidURL(webhookURL)) {
      return { error: "Expected a valid webhook URL" }
    }

    const id = nextID
    nextID++
    sendWebhooks(webhookURL, { id, statusDelays: makeStatusDelays(phone) })
    return { id }
  })

  await server.listen(PORT)
  console.log(`Listening on localhost:${PORT}`)
}

async function sendWebhooks(webhookURL: string, call: Call): Promise<void> {
  for (const { status, delay } of call.statusDelays) {
    const prefix = `POST ${webhookURL} (id=${call.id} status=${status})`
    await setTimeoutPromise(delay)

    let response
    try {
      response = await axios.post(webhookURL, { id: call.id, status })
    } catch (error) {
      console.log(`${prefix} - ${error}`)
      continue
    }

    console.log(`${prefix} - received response code=${response.status}`)
  }
}

function makeStatusDelays(phone: string): StatusDelay[] {
  switch (phone) {
    case "18582210308":
      return [
        { status: "completed", delay: 0 },
        { status: "ringing", delay: 0 },
      ]

    case "15512459377":
    case "19362072765":
      return [newStatusDelay("ringing"), newStatusDelay("completed")]

    default:
      return [
        newStatusDelay("ringing"),
        newStatusDelay("answered"),
        newStatusDelay("completed"),
      ]
  }
}

function newStatusDelay(status: Status): StatusDelay {
  return { status, delay: Math.random() * 5000 }
}

function isValidURL(url: string): boolean {
  try {
    // tslint:disable no-unused-expression
    new urlLib.URL(url)
    // tslint:enable no-unused-expression
  } catch (error) {
    if (error.name.indexOf("TypeError") !== -1) {
      return false
    }
    throw error
  }
  return true
}

start()
