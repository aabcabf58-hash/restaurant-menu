const express = require("express");

const {
  addItem,
  getAllItems,
  getAllActiveItems,
  editItem,
  editActiveItem,
  deleteItem,
} = require("../controllers/itemController");

const {  superAdmin} = require("../utils/verifySuperAdmin");

const router = express.Router();

// صفحة الزبائن: بدون توكن
router.get(
  "/getAllActiveItems",
  getAllActiveItems
);

// صفحة الإدارة: مع توكن Super Admin
router.post(
  "/createItem",
  superAdmin,
  addItem
);

router.get(
  "/getAllItems",
  superAdmin,
  getAllItems
);

router.put(
  "/editItem",
  superAdmin,
  editItem
);

router.put(
  "/editActiveItem",
  superAdmin,
  editActiveItem
);

router.delete(
  "/deleteItem/:item_id",
  superAdmin,
  deleteItem
);

module.exports = router;