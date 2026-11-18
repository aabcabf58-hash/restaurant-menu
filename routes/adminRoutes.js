const express = require("express");
const router = express.Router();
const {
  login,addUser
} = require("../controllers/userController");
const {  superAdmin} = require("../utils/verifySuperAdmin.js");




const { uploadImage, MAX_IMAGE_BYTES } = require("../controllers/imageController");

const parseImage = express.raw({
  type: 'application/octet-stream',
  limit: MAX_IMAGE_BYTES,
  inflate: false,
});

router.post("/upload-image", superAdmin, (req, res, next) => {
  parseImage(req, res, error => {
    if (!error) return next();
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ success: false, message: 'اختار صورة حجمها 8 MB أو أقل.' });
    }
    return res.status(400).json({ success: false, message: 'تعذّر قراءة ملف الصورة.' });
  });
}, uploadImage);

router.post("/login", login);
router.post("/addUser",superAdmin,addUser)


module.exports = router;