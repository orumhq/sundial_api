"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const urlLib = require("url");
const fastify = require("fastify");
const axios_1 = require("axios");
const VALID_PHONES = new Set([
    "13018040009",
    "19842068287",
    "15512459377",
    "19362072765",
    "18582210308",
    "13018040009",
    "19842068287",
    "15512459377",
    "19362072765",
]);
const CALL_PATH = "/call";
const PORT = 4830;
const setTimeoutPromise = util.promisify(setTimeout);
async function start() {
    const server = fastify();
    let nextID = 1;
    server.get("/", async () => {
        return `The API server only supports POST requests to ${CALL_PATH}\n`;
    });
    server.post(CALL_PATH, async (request) => {
        const { phone, webhookURL } = request.body;
        if (typeof phone !== "string" || !VALID_PHONES.has(phone)) {
            return { error: "Expected a valid phone" };
        }
        if (typeof webhookURL !== "string" || !isValidURL(webhookURL)) {
            return { error: "Expected a valid webhook URL" };
        }
        const id = nextID;
        nextID++;
        sendWebhooks(webhookURL, { id, statusDelays: makeStatusDelays(phone) });
        return { id };
    });
    await server.listen(PORT);
    console.log(`Listening on localhost:${PORT}`);
}
async function sendWebhooks(webhookURL, call) {
    for (const { status, delay } of call.statusDelays) {
        const prefix = `POST ${webhookURL} (id=${call.id} status=${status})`;
        await setTimeoutPromise(delay);
        let response;
        try {
            response = await axios_1.default.post(webhookURL, { id: call.id, status });
        }
        catch (error) {
            console.log(`${prefix} - ${error}`);
            continue;
        }
        console.log(`${prefix} - received response code=${response.status}`);
    }
}
function makeStatusDelays(phone) {
    switch (phone) {
        case "18582210308":
            return [
                { status: "completed", delay: 0 },
                { status: "ringing", delay: 0 },
            ];
        case "15512459377":
        case "19362072765":
            return [newStatusDelay("ringing"), newStatusDelay("completed")];
        default:
            return [
                newStatusDelay("ringing"),
                newStatusDelay("answered"),
                newStatusDelay("completed"),
            ];
    }
}
function newStatusDelay(status) {
    return { status, delay: Math.random() * 5000 };
}
function isValidURL(url) {
    try {
        // tslint:disable no-unused-expression
        new urlLib.URL(url);
        // tslint:enable no-unused-expression
    }
    catch (error) {
        if (error.name.indexOf("TypeError") !== -1) {
            return false;
        }
        throw error;
    }
    return true;
}
start();
//# sourceMappingURL=server.js.map