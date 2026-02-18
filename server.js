import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import pool from "./config/db.js";   // DEFAULT IMPORT

dotenv.config();

const app = express();

// Fix __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== TEST DB =====
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS test");
    res.json({ message: "Connessione DB OK", result: rows });
  } catch (error) {
    console.error("ERRORE COMPLETO DB:", error);
    res.status(500).json({
      message: "Errore DB",
      error: error.message
    });
  }
});

// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/tickets", ticketsRoutes);

// ===== ROOT =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/login.html"));
});

// ===== START =====
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
});