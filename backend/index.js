require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const moment = require("moment");

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// **JWT FUNCTIONS**
const generateAccessToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
const generateRefreshToken = (user) => jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_EXPIRATION });

// **RATE LIMITER (PREVENTS BRUTE-FORCE ATTACKS)**
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Too many login attempts. Try again later." });

// **SIGNUP (WITH EMAIL VERIFICATION)**
app.post("/signup",
    [
        body("name").notEmpty(),
        body("email").isEmail(),
        body("password").isLength({ min: 6 })
    ],
    async (req, res) => {
        const { name, email, password, phone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

        try {
            await pool.query(
                "INSERT INTO users (name, email, password, phone, email_verification_token) VALUES ($1, $2, $3, $4, $5)",
                [name, email, hashedPassword, phone, verificationToken]
            );

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Verify Your Email",
                text: `Click here to verify: http://localhost:5000/verify-email?token=${verificationToken}`
            });

            res.status(201).json({ message: "Signup successful. Verify your email." });
        } catch (err) {
            res.status(400).json({ error: "User already exists" });
        }
    }
);

// **VERIFY EMAIL**
app.get("/verify-email", async (req, res) => {
    const { token } = req.query;
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        await pool.query("UPDATE users SET is_verified = TRUE WHERE email = $1", [decoded.email]);
        res.json({ message: "Email verified successfully" });
    } catch (err) {
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

// **LOGIN (WITH ACCOUNT LOCKOUT & 2FA)**
app.post("/login", loginLimiter, async (req, res) => {
    const { email, password, twoFactorCode } = req.body;
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userResult.rowCount === 0) return res.status(400).json({ error: "User not found" });

    const user = userResult.rows[0];

    if (!user.is_verified) return res.status(400).json({ error: "Email not verified" });

    if (user.account_locked_until && moment().isBefore(user.account_locked_until)) {
        return res.status(403).json({ error: "Account locked. Try again later." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        await pool.query("UPDATE users SET failed_attempts = failed_attempts + 1 WHERE email = $1", [email]);

        if (user.failed_attempts + 1 >= 5) {
            const lockUntil = moment().add(15, "minutes").toISOString();
            await pool.query("UPDATE users SET account_locked_until = $1 WHERE email = $2", [lockUntil, email]);
        }
        return res.status(401).json({ error: "Invalid credentials" });
    }

    await pool.query("UPDATE users SET failed_attempts = 0, account_locked_until = NULL WHERE email = $1", [email]);

    if (user.two_factor_enabled) {
        const verified = speakeasy.totp.verify({ secret: user.two_factor_secret, encoding: "base32", token: twoFactorCode });
        if (!verified) return res.status(400).json({ error: "Invalid 2FA code" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

    res.cookie("refreshToken", refreshToken, { httpOnly: true });
    res.json({ accessToken });
});

// **ENABLE 2FA**
app.post("/enable-2fa", async (req, res) => {
    const { email } = req.body;
    const secret = speakeasy.generateSecret({ name: "MyApp" });

    await pool.query("UPDATE users SET two_factor_secret = $1, two_factor_enabled = TRUE WHERE email = $2", [secret.base32, email]);

    QRCode.toDataURL(secret.otpauth_url, (err, url) => {
        res.json({ message: "Scan QR Code to enable 2FA", qrCode: url });
    });
});

// **FORGOT PASSWORD**
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    const resetToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

    await pool.query("UPDATE users SET password_reset_token = $1 WHERE email = $2", [resetToken, email]);

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        text: `Reset your password: http://localhost:5000/reset-password?token=${resetToken}`
    });

    res.json({ message: "Password reset link sent" });
});
