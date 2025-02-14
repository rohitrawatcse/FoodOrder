const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "10m" });
const generateRefreshToken = (user) => jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

module.exports = { generateAccessToken, generateRefreshToken };
