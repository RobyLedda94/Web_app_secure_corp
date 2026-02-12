import express from "express";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// ===== DB POOL =====
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ===== RATE LIMITER (Login + Refresh) =====
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,                   // max 5 tentativi
  message: { message: "Troppi tentativi. Riprova più tardi." },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Troppi tentativi. Riprova più tardi." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== UTIL =====
function generateTokenId() {
  return crypto.randomUUID();
}

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ===== MIDDLEWARE AUTH =====
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Non autorizzato" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token non valido o scaduto" });
  }
}

// ===== TEST DB =====
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS test");
    res.json({ message: "Connessione DB OK", result: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore DB" });
  }
});

// ===== AUTH =====

// POST /api/auth/login
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // VALIDAZIONE MINIMA
    if (!username || !password) {
      return res.status(400).json({ message: "Credenziali non valide" });
    }

    // CERCA UTENTE
    const [rows] = await pool.query(
      "SELECT id, username, password_hash, user_type_id, is_active FROM user WHERE username = ?",
      [username]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Utente disabilitato" });
    }

    // CHECK PASSWORD
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    // CREA TOKEN
    const payload = { id: user.id, username: user.username, role: user.user_type_id };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ ...payload, jti: generateTokenId() });

    // SALVA HASH DEL REFRESH TOKEN NEL DB
    const tokenHash = hashToken(refreshToken);
    const jti = jwt.decode(refreshToken).jti;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 giorni

    await pool.query(
      "INSERT INTO jwt (user_id, jti, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [user.id, jti, tokenHash, expiresAt]
    );

    // RISPOSTA
    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.user_type_id }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Errore server" });
  }
});

// POST /api/auth/refresh
app.post("/api/auth/refresh", refreshLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Token mancante" });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokenHash = hashToken(refreshToken);

    const [rows] = await pool.query(
      "SELECT * FROM jwt WHERE jti = ? AND token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()",
      [payload.jti, tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Token non valido" });
    }

    // ROTAZIONE: revoca token precedente
    await pool.query(
      "UPDATE jwt SET revoked_at = NOW() WHERE jti = ?",
      [payload.jti]
    );

    // CREA NUOVO REFRESH TOKEN
    const newJti = generateTokenId();
    const newRefreshToken = signRefreshToken({ id: payload.id, username: payload.username, role: payload.role, jti: newJti });
    const newHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO jwt (user_id, jti, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [payload.id, newJti, newHash, newExpiresAt]
    );

    const newAccessToken = signAccessToken({ id: payload.id, username: payload.username, role: payload.role });

    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });

  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token non valido o scaduto" });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { id } = req.user;

    const [rows] = await pool.query(
      "SELECT id, username, user_type_id FROM user WHERE id = ?",
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Utente non trovato" });

    return res.json({ user: rows[0] });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Errore server" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Token mancante" });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    await pool.query(
      "UPDATE jwt SET revoked_at = NOW() WHERE jti = ?",
      [payload.jti]
    );

    return res.json({ message: "Logout effettuato" });

  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token non valido" });
  }
});

// ===== START SERVER =====
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server avviato sulla porta ${process.env.PORT || 3000}`);
});
