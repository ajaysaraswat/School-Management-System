// Import required packages
const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "school_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create tables if they don't exist
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    // Create schools table
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

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  return distance;
}

// Input validation function
function validateSchoolInput(data) {
  const errors = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
    errors.push("Name is required and must be a non-empty string");
  }

  if (
    !data.address ||
    typeof data.address !== "string" ||
    data.address.trim() === ""
  ) {
    errors.push("Address is required and must be a non-empty string");
  }

  if (!data.latitude || isNaN(parseFloat(data.latitude))) {
    errors.push("Latitude is required and must be a valid number");
  } else {
    const lat = parseFloat(data.latitude);
    if (lat < -90 || lat > 90) {
      errors.push("Latitude must be between -90 and 90");
    }
  }

  if (!data.longitude || isNaN(parseFloat(data.longitude))) {
    errors.push("Longitude is required and must be a valid number");
  } else {
    const lon = parseFloat(data.longitude);
    if (lon < -180 || lon > 180) {
      errors.push("Longitude must be between -180 and 180");
    }
  }

  return errors;
}

// ROUTES

// Add School API
app.post("/addSchool", async (req, res) => {
  try {
    const schoolData = req.body;

    // Validate input
    const validationErrors = validateSchoolInput(schoolData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
      });
    }

    // Insert school into database
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)",
      [
        schoolData.name.trim(),
        schoolData.address.trim(),
        parseFloat(schoolData.latitude),
        parseFloat(schoolData.longitude),
      ]
    );

    connection.release();

    res.status(201).json({
      success: true,
      message: "School added successfully",
      schoolId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding school:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// List Schools API
app.get("/listSchools", async (req, res) => {
  try {
    // Get user location
    const userLat = parseFloat(req.query.latitude);
    const userLon = parseFloat(req.query.longitude);

    // Validate location input
    if (
      isNaN(userLat) ||
      isNaN(userLon) ||
      userLat < -90 ||
      userLat > 90 ||
      userLon < -180 ||
      userLon > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude provided",
      });
    }

    // Get all schools
    const connection = await pool.getConnection();
    const [schools] = await connection.query("SELECT * FROM schools");
    connection.release();

    // Calculate distance for each school and sort
    const schoolsWithDistance = schools.map((school) => {
      const distance = calculateDistance(
        userLat,
        userLon,
        school.latitude,
        school.longitude
      );

      return {
        ...school,
        distance: parseFloat(distance.toFixed(2)), // Distance in km, rounded to 2 decimal places
      };
    });

    // Sort by distance
    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      count: schoolsWithDistance.length,
      schools: schoolsWithDistance,
    });
  } catch (error) {
    console.error("Error listing schools:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Start the server
app.listen(port, async () => {
  await initializeDatabase();
  console.log(`School Management API is running on port ${port}`);
});

// Export the app for testing
module.exports = app;
