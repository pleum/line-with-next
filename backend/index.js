"use strict";
require("dotenv").config();
const fastify = require("fastify")();
const fcors = require("fastify-cors");
const axios = require("axios").default;
const crypto = require("crypto");
const easyDB = require("easydb-io");
const qs = require("qs");

// Initial environment variables.
const LINE_CLIENT_ID = process.env.LINE_CLIENT_ID;
const LINE_SECRET_ID = process.env.LINE_SECRET_ID;
const LINE_REIDRECT_URL = process.env.LINE_REIDRECT_URL;
const SERVER_PORT = process.env.SERVER_PORT;
const EASY_DB_TOKEN = process.env.EASY_DB_TOKEN;
const EASY_DB_DATABASE = process.env.EASY_DB_DATABASE;

const FIVE_MINUTES = 300000;

const BAD_REQUEST = { success: false, message: "bad request" };
const INTERNAL_SERVER_ERROR = {
  success: false,
  message: "internal server error"
};

// Initial database.
const db = easyDB({
  database: EASY_DB_DATABASE,
  token: EASY_DB_TOKEN
});

fastify.register(fcors, { origin: true });

// Generate state for LINE login.
const generateState = () => {
  return crypto.randomBytes(48).toString("hex");
};

// Return LINE login url.
fastify.get("/v1/oauth/line", async (request, reply) => {
  try {
    const state = generateState();
    const now = new Date();
    await db.put(state, { createAt: now });

    // Build OAuth login url.
    const login = new URL("https://access.line.me/oauth2/v2.1/authorize");
    login.searchParams.append("response_type", "code");
    login.searchParams.append("client_id", LINE_CLIENT_ID);
    login.searchParams.append("redirect_uri", LINE_REIDRECT_URL);
    login.searchParams.append("state", state);
    login.searchParams.append("scope", "openid profile");

    return reply.status(200).send({ url: login.href });
  } catch (e) {
    return reply.status(500).send(INTERNAL_SERVER_ERROR);
  } finally {
    return reply.status(400).send(BAD_REQUEST);
  }
});

// Get access token from authorize code.
fastify.post("/v1/oauth/line", async (request, reply) => {
  const { code, state } = request.body;

  // Validate request body.
  if (code == undefined || state == undefined) {
    return reply.status(400).send(BAD_REQUEST);
  }

  try {
    const dbState = await db.get(state);
    if (dbState == undefined) {
      return reply.status(400).send(BAD_REQUEST);
    }

    const now = new Date();
    const stateCreateAt = new Date(dbState.createAt);
    if (now - stateCreateAt > FIVE_MINUTES) {
      await db.delete(dbState);
      return reply.status(400).send(BAD_REQUEST);
    }

    console.log("AUTH_CODE", code);

    // Get access token form LINE.
    const body = qs.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: LINE_REIDRECT_URL,
      client_id: LINE_CLIENT_ID,
      client_secret: LINE_SECRET_ID
    });

    console.log(body)
    const response = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return reply.status(200).send({ success: true, ...response.data });
  } catch (e) {
    console.error(e.message);
    return reply.status(500).send(INTERNAL_SERVER_ERROR);
  } finally {
    return reply.status(400).send(BAD_REQUEST);
  }
});

fastify.listen(SERVER_PORT);
