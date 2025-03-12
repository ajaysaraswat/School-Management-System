const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const schoolRoutes = require("./routes/schoolRoutes");
const pool = require("./config/db");

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Use Routes
app.use("/", schoolRoutes);

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL
      )
    `);
    console.log("Database initialized successfully");
    connection.release();
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

// Start server
app.listen(port, async () => {
  await initializeDatabase();
  console.log(`School Management API is running on port ${port}`);
});

module.exports = app;
