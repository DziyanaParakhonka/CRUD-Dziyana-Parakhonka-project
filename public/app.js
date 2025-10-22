const $ = (s) => document.querySelector(s);
const rowsTbody = $("#rows");
const form = $("#product-form");
const submitBtn = $("#submitBtn");
const cancelBtn = $("#cancelBtn");
const editHint = $("#editHint");

let editId = null;

// utils (frontend)
const escapeHtml = (str = "") => String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const fmtPrice = (n) => (Number(n ?? 0)).toFixed(2) + " PLN";
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

async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        try { const j = JSON.parse(text); throw new Error(j.error || "Błąd żądania."); }
        catch { throw new Error(text || "Błąd żądania."); }
    }
    return res.status === 204 ? null : res.json();
}

async function loadRows() {
    const list = await fetchJSON("/api/products");
    rowsTbody.innerHTML = list.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td class="sku">${escapeHtml(r.sku)}</td>
      <td>${fmtPrice(r.price)}</td>
      <td><span class="badge">${escapeHtml(r.size)}</span></td>
      <td><span class="pill"><span class="swatch" style="background:${escapeCssColor(r.color)}"></span>${escapeHtml(r.color ?? "")}</span></td>
      <td class="qty ${qtyClass(r.quantity)}">${r.quantity}</td>
      <td class="actions">
        <button class="btn" data-action="edit" data-id="${r.id}" title="Edytuj">✏️</button>
        <button class="btn" data-action="delete" data-id="${r.id}" title="Usuń">🗑️</button>
      </td>
    </tr>
  `).join("");
}

rowsTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;

    if (action === "edit") {
        const item = await fetchJSON(`/api/products/${id}`);
        fillForm(item);
    }
    if (action === "delete") {
        if (!confirm(`Na pewno usunąć #${id}?`)) return;
        await fetchJSON(`/api/products/${id}`, { method: "DELETE" });
        if (editId === id) resetForm();
        await loadRows();
    }
});

function fillForm(item) {
    $("#name").value = item.name ?? "";
    $("#sku").value = item.sku ?? "";
    $("#price").value = item.price ?? "";
    $("#size").value = item.size ?? "M";
    $("#color").value = item.color ?? "";
    $("#quantity").value = item.quantity ?? 0;

    editId = item.id;
    submitBtn.textContent = "Zapisz zmiany";
    cancelBtn.style.display = "";
    editHint.style.display = "";
    editHint.textContent = `Edycja #${item.id}`;
}

function resetForm() {
    form.reset();
    $("#size").value = "M";
    $("#quantity").value = 0;
    editId = null;
    submitBtn.textContent = "Dodaj produkt";
    cancelBtn.style.display = "none";
    editHint.style.display = "none";
}

cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetForm();
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        name: $("#name").value.trim(),
        sku: $("#sku").value.trim(),
        price: $("#price").value,
        size: $("#size").value,
        color: $("#color").value.trim() || null,
        quantity: $("#quantity").value
    };

    if (!payload.name || !payload.sku || payload.price === "" || !payload.size || payload.quantity === "") {
        alert("Wymagane: name, sku, price, size, quantity.");
        return;
    }

    if (editId) {
        await fetchJSON(`/api/products/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } else {
        await fetchJSON(`/api/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    }

    await loadRows();
    resetForm();
});

// init
loadRows().catch(err => alert(err.message));
