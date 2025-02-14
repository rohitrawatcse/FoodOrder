const pool = require("../config/db");

const User = {
    findByEmail: async (email) => {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        return result.rows[0];
    },
    createUser: async (name, email, hashedPassword, phone, verificationToken) => {
        return pool.query(
            "INSERT INTO users (name, email, password, phone, email_verification_token) VALUES ($1, $2, $3, $4, $5)",
            [name, email, hashedPassword, phone, verificationToken]
        );
    },
    updateUserToken: async (email, tokenType, tokenValue) => {
        return pool.query(`UPDATE users SET ${tokenType} = $1 WHERE email = $2`, [tokenValue, email]);
    }
};

module.exports = User;
