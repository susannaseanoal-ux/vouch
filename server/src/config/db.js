import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "\n[vouch] MONGODB_URI is not set.\n" +
      "      Copy server/.env.example to server/.env and put your MongoDB\n" +
      "      Atlas connection string in it, then start again.\n"
    );
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => console.error("[vouch] mongo error:", err.message));
  mongoose.connection.on("disconnected", () => console.warn("[vouch] mongo disconnected"));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("[vouch] connected to MongoDB");
  } catch (err) {
    console.error("\n[vouch] could not reach MongoDB:", err.message);
    console.error("      Check the URI, the database user, and that your IP is allowed in Atlas.\n");
    process.exit(1);
  }
}
