const jwt = require("jsonwebtoken");

exports.generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.id,
      numberphone: user.numberphone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};