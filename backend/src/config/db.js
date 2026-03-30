const mongoose = require("mongoose");
const { env } = require("./env");

function normalizeMongoUri(uri) {
  if (typeof uri !== "string") return uri;

  const trimmed = uri.trim();
  if (!trimmed.startsWith("mongodb+srv://")) return trimmed;

  try {
    const u = new URL(trimmed);
    // If user provided no db name (pathname is '/' or empty), default to app db.
    if (!u.pathname || u.pathname === "/") {
      u.pathname = "/ai_interview_coach";
    }

    // Add sensible defaults if no query params were provided.
    if (!u.search || u.search === "") {
      u.search = "?retryWrites=true&w=majority";
    }

    return u.toString();
  } catch {
    return trimmed;
  }
}

function sanitizeMongoUriForLog(uri) {
  if (typeof uri !== "string") return "";
  try {
    const u = new URL(uri);
    const authUser = u.username ? `${u.username}@` : "";
    return `${u.protocol}//${authUser}${u.host}${u.pathname || ""}${u.search || ""}`;
  } catch {
    return uri.replace(/:\/\/.*@/, "://<user>@");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectToDatabase() {
  const maxAttempts = 5;
  const baseDelayMs = 500;

  mongoose.set("strictQuery", true);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const mongoUri = normalizeMongoUri(env.MONGODB_URI);

      if (attempt === 1) {
        // eslint-disable-next-line no-console
        console.log(`[db] connecting to ${sanitizeMongoUriForLog(mongoUri)}`);
      }

      await mongoose.connect(mongoUri, {
        // Mongoose v8 uses sensible defaults; keep options minimal.
        serverSelectionTimeoutMS: 8000,
      });

      // eslint-disable-next-line no-console
      console.log("[db] connected");

      mongoose.connection.on("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("[db] connection error", err);
      });

      return;
    } catch (err) {
      const msg = err?.message || String(err);
      // eslint-disable-next-line no-console
      console.error(`[db] connection attempt ${attempt}/${maxAttempts} failed`, msg);

      if (msg.includes("ECONNREFUSED") && env.MONGODB_URI.includes("127.0.0.1:27017")) {
        // eslint-disable-next-line no-console
        console.error(
          "[db] MongoDB refused the connection at 127.0.0.1:27017. " +
            "Start MongoDB locally (service/mongod) OR update MONGODB_URI in backend/.env to your MongoDB Atlas connection string."
        );
      }
      if (attempt === maxAttempts) throw err;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
}

module.exports = { connectToDatabase };
