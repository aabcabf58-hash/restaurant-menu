const bcrypt = require("bcryptjs");

const pool = require("../config/db");
const {  hashPassword} = require("../utils/password");

const {
  generateToken,
} = require("../utils/generateToken");

exports.login = async (req, res) => {
  try {
    const { numberphone, password } = req.body;

    if (!numberphone || !password) {
      return res.status(400).json({
        success: false,
        message:
          "numberphone and password are required",
      });
    }

    const normalizedNumberphone =
      String(numberphone).trim();

    const userResult = await pool.query(
      `
      SELECT
        id,
        numberphone,
        password_hash,
        full_name,
        role,
        is_active
      FROM users
      WHERE numberphone = $1
      LIMIT 1
      `,
      [normalizedNumberphone]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid numberphone or password",
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User account is disabled",
      });
    }

    const passwordIsCorrect = await bcrypt.compare(
      String(password),
      user.password_hash
    );

    if (!passwordIsCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid numberphone or password",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        numberphone: user.numberphone,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




exports.addUser = async (req, res) => {
  try {
    const {
      numberphone,
      password,
      full_name,
      role = "client",
    } = req.body;

    // req.user رح يجي من فحص التوكن
    // if (
    //   !req.user ||
    //   req.user.role !== "super_admin"
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Only super admin can add users",
    //   });
    // }

    if (!numberphone || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message:
          "numberphone, password and full_name are required",
      });
    }

    const allowedRoles = [
      "super_admin",
      "admin",
      "client",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const normalizedNumberphone =
      String(numberphone).trim();

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE numberphone = $1
      LIMIT 1
      `,
      [normalizedNumberphone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Numberphone already exists",
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `
      INSERT INTO users (
        numberphone,
        password_hash,
        full_name,
        role
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        numberphone,
        full_name,
        role,
        is_active,
        created_at
      `,
      [
        normalizedNumberphone,
        passwordHash,
        String(full_name).trim(),
        role,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("addUser error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Numberphone already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};