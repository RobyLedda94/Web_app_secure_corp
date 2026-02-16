import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../config/db.js";


// ===============================
// LOGIN
// ===============================
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username e password richiesti" });
    }

    const [users] = await pool.query(
      `SELECT u.*, ut.code as role
       FROM user u
       JOIN user_type ut ON u.user_type_id = ut.id
       WHERE u.username = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const user = users[0];

    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(403).json({ message: "Account temporaneamente bloccato" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      await pool.query(
        `UPDATE user 
         SET failed_attempts = failed_attempts + 1 
         WHERE id = ?`,
        [user.id]
      );

      return res.status(401).json({ message: "Credenziali non valide" });
    }

    await pool.query(
      `UPDATE user 
       SET failed_attempts = 0, lock_until = NULL 
       WHERE id = ?`,
      [user.id]
    );

    const jti = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        jti: jti
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES }
    );

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.query(
      `INSERT INTO jwt (user_id, jti, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [user.id, jti, tokenHash, expiresAt]
    );

    res.json({
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore interno server" });
  }
};



// ===============================
// REFRESH TOKEN
// ===============================
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token mancante" });
    }

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Refresh token non valido" });
    }

    const { userId, jti } = decoded;

    const [rows] = await pool.query(
      `SELECT * FROM jwt 
       WHERE jti = ? AND user_id = ? AND revoked_at IS NULL`,
      [jti, userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Token revocato o inesistente" });
    }

    const storedToken = rows[0];

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    if (tokenHash !== storedToken.token_hash) {
      return res.status(401).json({ message: "Token compromesso" });
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(401).json({ message: "Refresh token scaduto" });
    }

    // Recupero ruolo aggiornato
    const [userRows] = await pool.query(
      `SELECT ut.code as role
       FROM user u
       JOIN user_type ut ON u.user_type_id = ut.id
       WHERE u.id = ?`,
      [userId]
    );

    const role = userRows[0]?.role;

    const accessToken = jwt.sign(
      {
        userId: userId,
        role: role
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES }
    );

    res.json({ accessToken });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore interno server" });
  }
};



// ===============================
// ME
// ===============================
export const me = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.name, u.lastName, u.is_active, ut.code as role
       FROM user u
       JOIN user_type ut ON u.user_type_id = ut.id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    res.json(rows[0]);

  } catch (error) {
    res.status(500).json({ message: "Errore interno server" });
  }
};



// ===============================
// LOGOUT
// ===============================
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token richiesto" });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // sicurezza: deve appartenere all'utente autenticato
    if (decoded.userId !== req.user.userId) {
      return res.status(403).json({ message: "Non autorizzato" });
    }

    await pool.query(
      `UPDATE jwt SET revoked_at = NOW() WHERE jti = ? AND user_id = ?`,
      [decoded.jti, req.user.userId]
    );

    res.json({ message: "Logout effettuato" });

  } catch {
    res.status(400).json({ message: "Errore logout" });
  }
};
