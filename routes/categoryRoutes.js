const express = require("express");

const {
  addCategory,  getAllCategories,  editCategory,
  editCategoryActive,getActiveCategories,deleteCategory
} = require("../controllers/categoryController");

const {
  superAdmin,
} = require("../utils/verifySuperAdmin");

const router = express.Router();

router.get("/getAllCategories", superAdmin, getAllCategories);

router.post("/createCategory",superAdmin,addCategory);

router.put("/editcategory", superAdmin,  editCategory);
router.put("/editActivecategory", superAdmin,  editCategoryActive);

router.get("/getAllCatActive",getActiveCategories);


router.delete("/deleteCategory/:category_id", superAdmin, deleteCategory);

module.exports = router;