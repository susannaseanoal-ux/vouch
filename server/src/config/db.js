import mongoose from "mongoose";

/* Whether the database is currently usable. The API asks before it tries
   to serve anything that needs data. */
export const dbReady = () => mongoose.connection.readyState === 1;

/**
 * Connects to MongoDB, and reports whether it managed to.
 *
 * It does NOT end the process on failure. Running locally, exiting is
 * the clearest thing to do - you see the error and fix your .env. On a
 * host it is the worst thing to do: the container dies, the platform
 * restarts it, it dies again, and every URL returns "application not
 * found" with no clue as to why. The website itself is static files and
 * needs no database at all, so it should still be served while only the
 * data-backed parts report a problem.
 */
export async function connectDb() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "\n[vouch] MONGODB_URI is not set.\n" +
      "      The website will start, but anything that reads or writes\n" +
      "      data will report that the database is unavailable.\n" +
      "      Set MONGODB_URI in your host's environment variables, or in\n" +
      "      server/.env when running locally.\n"
    );
    return false;
  }

  mongoose.connection.on("error", (err) => console.error("[vouch] mongo error:", err.message));
  mongoose.connection.on("disconnected", () => console.warn("[vouch] mongo disconnected"));
  mongoose.connection.on("reconnected", () => console.log("[vouch] mongo reconnected"));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("[vouch] connected to MongoDB");
    return true;
  } catch (err) {
    console.error("\n[vouch] could not reach MongoDB:", err.message);
    console.error("      Check the connection string, the database user, and that");
    console.error("      the server's IP is allowed under Atlas > Network Access.");
    console.error("      The website will still be served; data will not.\n");
    /* Mongoose keeps trying in the background, so a database that comes
       back - a corrected allowlist, say - starts working without a
       redeploy. */
    return false;
  }
}
