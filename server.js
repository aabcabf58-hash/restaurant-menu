require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const pool = require("./config/db");

const app = express();

const PORT = process.env.PORT || 3001;
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes =require("./routes/categoryRoutes");
const itemRoutes = require("./routes/itemRoutes");



// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تشغيل ملفات HTML وCSS وJavaScript
app.use(express.static(path.join(__dirname, "public")));

// إتاحة صور المنتجات
app.use(
  "/uploads",
  express.static(path.join(__dirname, "public", "uploads"))
);

// الصفحة الرئيسية للزبائن
app.get(["/", "/foubijouRama"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "menu.html"));
});
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);



// صفحة إدارة المتجر
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// التأكد أن السيرفر يعمل
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Foubijou Rama shop server is running",
  });
});

// تجربة الاتصال بقاعدة البيانات
app.get("/api/test-database", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS current_time"
    );

    return res.status(200).json({
      success: true,
      message: "Database connected successfully",
      database_time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error(
      "Database test error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// معالجة الروابط غير الموجودة
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// معالجة أخطاء السيرفر
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// تشغيل السيرفر
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});