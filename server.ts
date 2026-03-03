import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("assets.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'staff', -- admin, manager, staff
    full_name TEXT
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id TEXT UNIQUE, -- Barcode/QR identifier
    name TEXT NOT NULL,
    category TEXT, -- fixed, movable
    status TEXT DEFAULT 'available', -- available, in-use, maintenance, retired
    location TEXT,
    purchase_date TEXT,
    purchase_price REAL,
    salvage_value REAL,
    useful_life INTEGER, -- in years
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    maintenance_date TEXT,
    description TEXT,
    cost REAL,
    performed_by TEXT,
    FOREIGN KEY(asset_id) REFERENCES assets(id)
  );

  CREATE TABLE IF NOT EXISTS tracking_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    from_location TEXT,
    to_location TEXT,
    moved_by INTEGER,
    moved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asset_id) REFERENCES assets(id),
    FOREIGN KEY(moved_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed settings
const currencyExists = db.prepare("SELECT * FROM settings WHERE key = ?").get("currency");
if (!currencyExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("currency", "NPR");
}
const currencySymbolExists = db.prepare("SELECT * FROM settings WHERE key = ?").get("currency_symbol");
if (!currencySymbolExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("currency_symbol", "रू");
}

// Seed admin user if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)").run(
    "admin",
    "admin123", // In a real app, hash this
    "admin",
    "System Administrator"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/assets", (req, res) => {
    const assets = db.prepare("SELECT * FROM assets").all();
    res.json(assets);
  });

  app.get("/api/assets/:id", (req, res) => {
    const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(req.params.id);
    res.json(asset);
  });

  app.post("/api/assets", (req, res) => {
    const { tag_id, name, category, status, location, purchase_date, purchase_price, salvage_value, useful_life } = req.body;
    const info = db.prepare(`
      INSERT INTO assets (tag_id, name, category, status, location, purchase_date, purchase_price, salvage_value, useful_life)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(tag_id, name, category, status, location, purchase_date, purchase_price, salvage_value, useful_life);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/assets/:id", (req, res) => {
    const { name, category, status, location, assigned_to } = req.body;
    db.prepare(`
      UPDATE assets SET name = ?, category = ?, status = ?, location = ?, assigned_to = ?
      WHERE id = ?
    `).run(name, category, status, location, assigned_to, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, full_name FROM users").all();
    res.json(users);
  });

  app.get("/api/stats", (req, res) => {
    const totalAssets = db.prepare("SELECT COUNT(*) as count FROM assets").get().count;
    const totalValue = db.prepare("SELECT SUM(purchase_price) as sum FROM assets").get().sum || 0;
    const statusCounts = db.prepare("SELECT status, COUNT(*) as count FROM assets GROUP BY status").all();
    res.json({ totalAssets, totalValue, statusCounts });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings", (req, res) => {
    const { currency, currency_symbol } = req.body;
    if (currency) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("currency", currency);
    if (currency_symbol) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("currency_symbol", currency_symbol);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
