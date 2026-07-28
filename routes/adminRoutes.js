const express = require("express");
const router = express.Router();
const {
  login,addUser
} = require("../controllers/userController");
const {  superAdmin} = require("../utils/verifySuperAdmin.js");




router.post("/login", login);
router.post("/addUser",superAdmin,addUser)


module.exports = router;