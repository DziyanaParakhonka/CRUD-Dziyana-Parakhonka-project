import express from "express";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new Database("database.db");

//  DB: sklep odzieżowy 
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    sku       TEXT    NOT NULL UNIQUE,
    price     REAL    NOT NULL CHECK (price >= 0),
    size      TEXT    NOT NULL CHECK (size IN ('XS','S','M','L','XL')),
    color     TEXT,
    quantity  INTEGER NOT NULL CHECK (quantity >= 0),
    brand TEXT,
    category TEXT
  )
`).run();

//  Migracja
ensureColumn("products", "brand", "TEXT");
ensureColumn("products", "category", "TEXT");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  API 
app.get("/api/products", (req, res) => {
    const rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
    res.json(rows);
});

app.get("/api/products/:id", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Nieprawidłowe id." });
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Nie znaleziono." });
    res.json(row);
});

app.post("/api/products", (req, res) => {
    const { name, sku, price, size, color, quantity, brand, category } = req.body;
    if (!name || !sku || price === undefined || !size || quantity === undefined) {
        return res.status(400).json({ error: "Wymagane: name, sku, price, size, quantity." });
    }
    const pr = Number(price);
    const qty = Number(quantity);
    if (Number.isNaN(pr) || pr < 0) return res.status(400).json({ error: "Nieprawidłowa cena." });
    if (!["XS", "S", "M", "L", "XL"].includes(String(size).toUpperCase()))
        return res.status(400).json({ error: "Nieprawidłowy rozmiar." });
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ error: "Nieprawidłowa ilość." });

    try {
        const info = db.prepare(`
      INSERT INTO products (name, sku, price, size, color, quantity, brand, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s(name), skuUp(sku), pr, sizeUp(size), s(color), qty, s(brand), s(category));
        const created = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
        res.status(201).json(created);
    } catch (e) {
        if (String(e.message || "").includes("UNIQUE constraint failed: products.sku")) {
            return res.status(400).json({ error: "SKU musi być unikalne." });
        }
        throw e;
    }
});

app.put("/api/products/:id", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Nieprawidłowe id." });

    const { name, sku, price, size, color, quantity, brand, category } = req.body;
    if (!name || !sku || price === undefined || !size || quantity === undefined) {
        return res.status(400).json({ error: "Wymagane: name, sku, price, size, quantity." });
    }
    const pr = Number(price);
    const qty = Number(quantity);
    if (Number.isNaN(pr) || pr < 0) return res.status(400).json({ error: "Nieprawidłowa cena." });
    if (!["XS", "S", "M", "L", "XL"].includes(String(size).toUpperCase()))
        return res.status(400).json({ error: "Nieprawidłowy rozmiar." });
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ error: "Nieprawidłowa ilość." });

    try {
        const info = db.prepare(`
      UPDATE products
         SET name = ?, sku = ?, price = ?, size = ?, color = ?, quantity = ?, brand = ?, category = ?
       WHERE id = ?
    `).run(s(name), skuUp(sku), pr, sizeUp(size), s(color), qty, s(brand), s(category), id);
        if (info.changes === 0) return res.status(404).json({ error: "Nie znaleziono." });
        const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
        res.json(updated);
    } catch (e) {
        if (String(e.message || "").includes("UNIQUE constraint failed: products.sku")) {
            return res.status(400).json({ error: "SKU musi być unikalne." });
        }
        throw e;
    }
});

app.delete("/api/products/:id", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Nieprawidłowe id." });
    const info = db.prepare("DELETE FROM products WHERE id = ?").run(id);
    if (info.changes === 0) return res.status(404).json({ error: "Nie znaleziono." });
    res.status(204).end();
});

//  helpers 
const s = (v) => (v == null ? null : String(v).trim());
const skuUp = (v) => String(v || "").trim().toUpperCase();
const sizeUp = (v) => ["XS", "S", "M", "L", "XL"].includes(String(v).toUpperCase()) ? String(v).toUpperCase() : "M";

//  static files 
app.use(express.static(path.join(__dirname, "public")));

//  404 (API) 
app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: `Endpoint ${req.originalUrl} nie istnieje.` });
    }
    res.status(404).type("text").send("404");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serwer działa na http://localhost:" + PORT));

