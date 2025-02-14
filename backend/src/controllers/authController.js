const User = require("../models/userModel");
const { hashPassword, comparePassword } = require("../utils/hashUtils");
const { generateAccessToken, generateRefreshToken } = require("../utils/tokenUtils");
const { sendEmail } = require("../config/mailer");
const jwt = require("jsonwebtoken");

const signup = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        const hashedPassword = await hashPassword(password);
        const verificationToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

        await User.createUser(name, email, hashedPassword, phone, verificationToken);

        await sendEmail(email, "Verify Your Email", `Click here: http://localhost:5000/verify-email?token=${verificationToken}`);
        res.status(201).json({ message: "Signup successful. Verify your email." });

    } catch (error) {
        res.status(400).json({ error: "User already exists" });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);

    if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.is_verified) return res.status(400).json({ error: "Email not verified" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await User.updateUserToken(email, "refresh_token", refreshToken);

    res.cookie("refreshToken", refreshToken, { httpOnly: true });
    res.json({ accessToken });
};

module.exports = { signup, login };
