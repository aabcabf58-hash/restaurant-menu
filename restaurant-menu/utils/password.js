const bcrypt = require("bcryptjs");

exports.hashPassword = async (password) => {
  if (!password) {
    throw new Error("Password is required");
  }

  const normalizedPassword = String(password);

  if (normalizedPassword.length < 6) {
    throw new Error(
      "Password must contain at least 6 characters"
    );
  }

  const saltRounds = 10;

  const passwordHash = await bcrypt.hash(
    normalizedPassword,
    saltRounds
  );

  return passwordHash;
};
