const jwt = require("jsonwebtoken");

const pool = require("../config/db");

exports.superAdmin = async (
  req,
  res,
  next
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Token is required",
      });
    }

    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userResult = await pool.query(
      `
      SELECT
        id,
        numberphone,
        full_name,
        role,
        is_active
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User account is disabled",
      });
    }

    if (user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only super admin can perform this action",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error(
      "verifySuperAdmin error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};