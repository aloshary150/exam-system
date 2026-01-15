const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is NOT defined");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected successfully");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err);
  process.exit(1);
});

module.exports = pool;
