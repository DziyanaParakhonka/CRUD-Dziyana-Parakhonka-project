// EncjaB Svitlana Ivanchenko
import express from "express";
import Database from "better-sqlite3";

const app = express();
const db = new Database("database.db");

// --- DB: sklep odzieżowy ---
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    sku       TEXT    NOT NULL UNIQUE,
    price     REAL    NOT NULL CHECK (price >= 0),
    size      TEXT    NOT NULL CHECK (size IN ('XS','S','M','L','XL')),
    color     TEXT,
    quantity  INTEGER NOT NULL CHECK (quantity >= 0),
    brand     TEXT,
    category  TEXT
  )
`).run();

// Dodano migrację tabeli
ensureColumn("products", "brand", "TEXT");
ensureColumn("products", "category", "TEXT");

app.use(express.urlencoded({ extended: true }));

// --- Widok główny ---
app.get("/", (req, res) => {
    const rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
    let editItem = null;

    if (req.query.edit) {
        const id = Number(req.query.edit);
        if (!Number.isNaN(id)) {
            editItem = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
        }
    }

    const html = `<!doctype html>
  <html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Sklep odzieżowy — CRUD produktów</title>
    <style>
      :root{
        --bg:#0b0f19;
        --card:#111827;
        --muted:#9ca3af;
        --stroke:#1f2937;
        --ring:#3b82f6;
        --good:#10b981;
        --bad:#ef4444;
        --radius:14px;
      }
      *{box-sizing:border-box}
      html,body{height:100%}
      body{
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;
        margin:0; background:linear-gradient(180deg,#0b0f19,#111827 40%,#0b0f19 100%);
        color:#e5e7eb;
      }
      .wrap{max-width:1200px; margin:40px auto; padding:0 24px}
      header{display:flex; align-items:center; justify-content:space-between; margin-bottom:20px}
      h1{margin:0; font-weight:700; letter-spacing:.3px}
      .muted{color:var(--muted); font-size:13px}

      form{
        background:var(--card); border:1px solid var(--stroke); border-radius:var(--radius);
        padding:18px; box-shadow:0 10px 30px rgba(0,0,0,.25); margin-bottom:24px;
        backdrop-filter: blur(6px);
      }
      .fields{
        display:flex; gap:12px; align-items:flex-end; flex-wrap:nowrap;
      }
      .field{flex:1; min-width:0}
      label{display:block; font-size:12px; color:#cbd5e1; margin:0 0 6px 2px; letter-spacing:.2px}
      input,select,textarea{
        width:100%; padding:12px 12px; border:1px solid var(--stroke); border-radius:10px; background:#0f172a; color:#e5e7eb;
        outline:none; transition:border-color .15s, box-shadow .15s;
      }
      input::placeholder{color:#6b7280}
      input:focus,select:focus,textarea:focus{
        border-color:var(--ring); box-shadow:0 0 0 4px rgba(59,130,246,.15);
      }
      .btn, button, a.btn{
        appearance:none; border:0; border-radius:12px;
        padding:10px 14px; background:#2563eb; color:#fff; cursor:pointer;
        display:inline-flex; align-items:center; justify-content:center; text-decoration:none;
        height:42px; font-weight:600; letter-spacing:.2px; transition:transform .05s ease, filter .15s;
      }
      .btn:hover{filter:brightness(1.08)}
      .btn:active{transform:translateY(1px)}
      .btn.secondary{background:#374151}
      .actions{display:flex; gap:8px; justify-content:flex-end}
      .table-wrap{overflow-x:auto}
      table{
        width:100%; border-collapse:separate; border-spacing:0; background:var(--card);
        border:1px solid var(--stroke); border-radius:var(--radius); overflow:hidden; font-size:14px;
        min-width:1200px; box-shadow:0 10px 30px rgba(0,0,0,.25);
      }
      th,td{padding:12px 14px; border-bottom:1px solid #1e293b; vertical-align:middle; text-align:left}
      th{background:#0f172a; font-weight:700; white-space:nowrap; color:#cbd5e1}
      tr:last-child td{border-bottom:none}
      td,th{white-space:nowrap}
      .sku{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:12px; color:#93c5fd}
      .badge{display:inline-block; padding:4px 10px; border-radius:999px; background:#0b1220; border:1px solid #1f2a44; color:#bfdbfe; font-weight:600}
      .tag{display:inline-block; padding:4px 10px; border-radius:999px; background:#0f172a; border:1px solid #243046; color:#c7d2fe; font-weight:600}
      .qty{font-weight:700}
      .qty.ok{color:var(--good)}
      .qty.low{color:#f59e0b}
      .qty.zero{color:var(--bad)}
      .pill{
        display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; border:1px solid #1f2937; background:#0b1220
      }
      .swatch{width:14px; height:14px; border-radius:3px; border:1px solid #111827; display:inline-block}
      @media (max-width:1100px){
        .fields{flex-direction:column}
        .field{width:100%}
      }
      .note{margin-top:8px; color:var(--muted); font-size:12px}
      footer{margin-top:24px; color:var(--muted); font-size:12px}
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <div>
          <h1>Sklep odzieżowy — Produkty</h1>
          <p class="muted">Dodaj lub edytuj produkty. Aby edytować, kliknij «✏️» w wierszu — formularz uzupełni się danymi.</p>
        </div>
      </header>

      <form method="post" action="${editItem ? `/update/${editItem.id}` : "/add"}" autocomplete="off">
        <div class="fields">
          <div class="field">
            <label>Nazwa (name)</label>
            <input name="name" required placeholder="np. T-shirt Basic" value="${editItem ? escapeHtml(editItem.name) : ""}" />
          </div>
          <div class="field">
            <label>SKU</label>
            <input name="sku" required placeholder="np. TS-BASIC-BLK" value="${editItem ? escapeHtml(editItem.sku) : ""}" />
          </div>
          <div class="field">
            <label>Cena (price)</label>
            <input name="price" type="number" step="0.01" min="0" required value="${editItem?.price ?? ""}" />
          </div>
          <div class="field">
            <label>Rozmiar (size)</label>
            <select name="size" required>
              ${["XS", "S", "M", "L", "XL"]
            .map(opt => `<option value="${opt}" ${editItem?.size === opt ? "selected" : ""}>${opt}</option>`)
            .join("")}
            </select>
          </div>
          <div class="field">
            <label>Kolor (color)</label>
            <input name="color" placeholder="np. black" value="${editItem ? escapeHtml(editItem.color ?? "") : ""}" />
          </div>
          <div class="field">
            <label>Stan (quantity in stock)</label>
            <input name="quantity" type="number" min="0" step="1" required value="${editItem?.quantity ?? 0}" />
          </div>

          
          <div class="field">
            <label>Marka (brand)</label>
            <input name="brand" placeholder="np. Acme" value="${editItem ? escapeHtml(editItem.brand ?? "") : ""}" />
          </div>
          <div class="field">
            <label>Kategoria (category)</label>
            <input name="category" placeholder="np. t-shirty" value="${editItem ? escapeHtml(editItem.category ?? "") : ""}" />
          </div>
        </div>

        <div class="note">Wymagane: <strong>name</strong>, <strong>sku</strong>, <strong>price</strong>, <strong>size</strong>, <strong>quantity</strong>. (brand i category — opcjonalne)</div>

        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn" type="submit">${editItem ? "Zapisz zmiany" : "Dodaj produkt"}</button>
          ${editItem ? `<a href="/" class="btn secondary">Anuluj</a>` : ""}
        </div>
        ${editItem ? `<p class="note" style="margin-top:8px">Edycja #${editItem.id}</p>` : ""}
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nazwa</th>
              <th>SKU</th>
              <th>Cena</th>
              <th>Rozmiar</th>
              <th>Kolor</th>
              <th>Stan</th>
              <th>Marka</th>
              <th>Kategoria</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.id}</td>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td class="sku">${escapeHtml(r.sku)}</td>
                <td>${fmtPrice(r.price)}</td>
                <td><span class="badge">${escapeHtml(r.size)}</span></td>
                <td>
                  <span class="pill">
                    <span class="swatch" style="background:${escapeCssColor(r.color)}"></span>
                    ${escapeHtml(r.color ?? "")}
                  </span>
                </td>
                <td class="qty ${qtyClass(r.quantity)}">${r.quantity}</td>
                <td>${r.brand ? `<span class="tag">${escapeHtml(r.brand)}</span>` : ""}</td>
                <td>${r.category ? `<span class="tag">${escapeHtml(r.category)}</span>` : ""}</td>
                <td class="actions">
                  <a class="btn" title="Edytuj" href="/?edit=${r.id}" aria-label="Edytuj">✏️</a>
                  <form method="post" action="/delete/${r.id}" style="display:inline" onsubmit="return confirm('Na pewno usunąć #${r.id}?')">
                    <button class="btn" title="Usuń" aria-label="Usuń">🗑️</button>
                  </form>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </body>
  </html>`;

    res.type("html").send(html);
});

// --- CRUD ---
app.post("/add", (req, res) => {
    const { name, sku, price, size, color, quantity, brand, category } = req.body;
    if (!name || !sku || price === undefined || !size || quantity === undefined) {
        return res.status(400).send("Wymagane pola: name, sku, price, size, quantity.");
    }

    const pr = Number(price);
    const qty = Number(quantity);

    if (Number.isNaN(pr) || pr < 0) return res.status(400).send("Nieprawidłowa cena.");
    if (!isValidSize(size)) return res.status(400).send("Nieprawidłowy rozmiar.");
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).send("Nieprawidłowa ilość.");

    try {
        db.prepare(`
      INSERT INTO products (name, sku, price, size, color, quantity, brand, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            safeStr(name),
            safeSku(sku),
            pr,
            safeSize(size),
            safeStr(color),
            qty,
            safeStr(brand),
            safeStr(category)
        );
    } catch (e) {
        if (String(e.message || "").includes("UNIQUE constraint failed: products.sku")) {
            return res.status(400).send("SKU musi być unikalne.");
        }
        throw e;
    }

    res.redirect("/");
});

app.post("/update/:id", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).send("Nieprawidłowe id.");

    const { name, sku, price, size, color, quantity, brand, category } = req.body;
    if (!name || !sku || price === undefined || !size || quantity === undefined) {
        return res.status(400).send("Wymagane pola: name, sku, price, size, quantity.");
    }

    const pr = Number(price);
    const qty = Number(quantity);

    if (Number.isNaN(pr) || pr < 0) return res.status(400).send("Nieprawidłowa cena.");
    if (!isValidSize(size)) return res.status(400).send("Nieprawidłowy rozmiar.");
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).send("Nieprawidłowa ilość.");

    try {
        db.prepare(`
      UPDATE products
         SET name = ?, sku = ?, price = ?, size = ?, color = ?, quantity = ?, brand = ?, category = ?
       WHERE id = ?
    `).run(
            safeStr(name),
            safeSku(sku),
            pr,
            safeSize(size),
            safeStr(color),
            qty,
            safeStr(brand),
            safeStr(category),
            id
        );
    } catch (e) {
        if (String(e.message || "").includes("UNIQUE constraint failed: products.sku")) {
            return res.status(400).send("SKU musi być unikalne.");
        }
        throw e;
    }

    res.redirect("/");
});

app.post("/delete/:id", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).send("Nieprawidłowe id.");
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.redirect("/");
});

// --- Utils ---
function escapeHtml(str = "") {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
function safeStr(s) { return s == null ? null : String(s).trim(); }
function safeSku(s) { return String(s || "").trim().toUpperCase(); }
function isValidSize(k) { return ["XS", "S", "M", "L", "XL"].includes(String(k).toUpperCase()); }
function safeSize(k) { return isValidSize(k) ? String(k).toUpperCase() : "M"; }
function fmtPrice(n) { const num = Number(n ?? 0); return num.toFixed(2) + " PLN"; }
function escapeCssColor(c = "") {
    const s = String(c).trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s;
    if (/^[a-zA-Z]+$/.test(s)) return s.toLowerCase();
    return "#111827";
}
function qtyClass(q) {
    const n = Number(q) || 0;
    if (n === 0) return "zero";
    if (n <= 5) return "low";
    return "ok";
}
function ensureColumn(table, column, typeSql) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === column)) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`).run();
    }
}

const PORT = process.env.PORT || 3000;

// --- 404 ---
app.use((req, res) => {
    res.status(404).type("html").send(`
    <!doctype html>
    <html lang="pl">
    <head>
      <meta charset="utf-8" />
      <title>404 - Nie znaleziono</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100vh; background: #0b0f19; color: #e5e7eb;
        }
        h1 { font-size: 48px; margin-bottom: 0; }
        p  { color: #94a3b8; margin-top: 8px; }
        a  { margin-top: 16px; color: #60a5fa; text-decoration: none; }
        code{background:#111827; padding:2px 6px; border-radius:6px; border:1px solid #1f2937}
      </style>
    </head>
    <body>
      <h1>404</h1>
      <p>Strona <code>${escapeHtml(req.originalUrl)}</code> nie istnieje.</p>
      <a href="/">← Powrót do listy produktów</a>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log("Serwer działa na http://localhost:" + PORT));

