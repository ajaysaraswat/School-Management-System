const pool = require("../config/db");

// Haversine formula to calculate distance
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
  return R * c; // Distance in km
}

// Validate school input
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

// Add a school
exports.addSchool = async (req, res) => {
  try {
    const schoolData = req.body;

    // Validate input
    const validationErrors = validateSchoolInput(schoolData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
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
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// List all schools sorted by distance
exports.listSchools = async (req, res) => {
  try {
    const userLat = parseFloat(req.query.latitude);
    const userLon = parseFloat(req.query.longitude);

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

    const connection = await pool.getConnection();
    const [schools] = await connection.query("SELECT * FROM schools");
    connection.release();

    const schoolsWithDistance = schools.map((school) => ({
      ...school,
      distance: parseFloat(
        calculateDistance(
          userLat,
          userLon,
          school.latitude,
          school.longitude
        ).toFixed(2)
      ),
    }));

    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      count: schoolsWithDistance.length,
      schools: schoolsWithDistance,
    });
  } catch (error) {
    console.error("Error listing schools:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.homepage = async (req, res) => {
  res.json({
    message: "Welcome to the school management system",
  });
};
