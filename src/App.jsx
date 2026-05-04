import { useState, useMemo, useEffect, useRef } from "react";

const API = "https://script.google.com/macros/s/AKfycbw-lWULUCM3_-2E9Zue23jNuBnH0PceXDRzSWDE9FAiVTtvz8u75ic7d6Vd0SKHQxP-iQ/exec";

const MAX_PRODUCTOS = 10;
const emptyProducto = () => ({ descripcion: "", valor: "" });
const todayISO = () => new Date().toISOString().split("T")[0];

const initialForm = {
  nombre: "", direccion: "", telefono: "", ciudad: "",
  fechaCompra: todayISO(),
  productos: [emptyProducto()],
};

const formatCLP = (v) => {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return "$0";
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const parseNum = (v) => parseFloat(String(v).replace(/[^0-9.]/g, "")) || 0;
const calcTotal = (prods) => prods.reduce((s, p) => s + parseNum(p.valor), 0);
const sumAbonos = (abonos) => (abonos || []).reduce((s, a) => s + a.monto, 0);

/* ── API helpers ─────────────────────────────────────────────────────────── */
async function apiGet() {
  const r = await fetch(API);
  return r.json();
}
async function apiPost(body) {
  const r = await fetch(API, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return r.json();
}

/* ══════════════════════════════════════════════════════════
   COMPROBANTE
══════════════════════════════════════════════════════════ */
function Comprobante({ cliente, onClose }) {
  const totalAbonado = sumAbonos(cliente.abonos);
  const saldo = Math.max(0, cliente.totalCompra - totalAbonado);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=560,height=820");
    const abonosHTML = cliente.abonos.length > 0
      ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px">
          <thead><tr style="background:#f5f0e8">
            <th style="padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#7a5a1a;font-weight:normal">Fecha</th>
            <th style="padding:5px 8px;text-align:right;font-size:10px;text-transform:uppercase;color:#7a5a1a;font-weight:normal">Monto</th>
          </tr></thead>
          <tbody>${cliente.abonos.map(a => `<tr style="border-bottom:1px solid #f0e8d8"><td style="padding:6px 8px">${fmtDate(a.fecha)}</td><td style="padding:6px 8px;text-align:right;color:#2a7a2a;font-weight:bold">${formatCLP(a.monto)}</td></tr>`).join("")}</tbody>
          <tfoot><tr><td style="padding:7px 8px;font-weight:bold;border-top:1px solid #ccc">Total abonado</td><td style="padding:7px 8px;text-align:right;font-weight:bold;color:#2a7a2a;border-top:1px solid #ccc">${formatCLP(totalAbonado)}</td></tr></tfoot>
        </table>`
      : `<p style="font-size:12px;color:#aaa">Sin abonos registrados</p>`;

    w.document.write(`<html><head><title>Comprobante</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;padding:32px;color:#1a1008}
    .tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a5a1a;margin-bottom:4px}
    h1{font-size:20px;margin-bottom:4px}.num{font-size:11px;color:#aaa;text-align:right;margin-bottom:14px}
    hr{border:none;border-top:1px dashed #ccc;margin:14px 0}.row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}
    .lbl{color:#666}table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;font-size:10px;text-transform:uppercase;color:#7a5a1a;padding:6px 8px;background:#f5f0e8;font-weight:normal}
    td{padding:7px 8px;border-bottom:1px solid #f0e8d8}
    .section{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#5a4020;margin:16px 0 6px}
    .total-line{display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin-top:10px;padding-top:8px;border-top:2px solid #1a1008}
    .saldo-box{margin-top:16px;padding:12px;border:2px solid ${saldo > 0 ? "#b04000" : "#2a7a2a"};border-radius:6px;text-align:center}
    .saldo-lbl{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:${saldo > 0 ? "#b04000" : "#2a7a2a"}}
    .saldo-val{font-size:22px;font-weight:bold;color:${saldo > 0 ? "#b04000" : "#2a7a2a"};margin-top:2px}
    .footer{margin-top:24px;font-size:10px;color:#aaa;text-align:center}</style></head><body>
    <div class="tag">Comprobante de Venta</div><h1>Registro de Compra</h1>
    <div class="num">N° ${String(cliente.id).slice(-6)}</div>
    <div class="row"><span class="lbl">Cliente</span><span><b>${cliente.nombre}</b></span></div>
    <div class="row"><span class="lbl">Ciudad</span><span>${cliente.ciudad}</span></div>
    ${cliente.direccion ? `<div class="row"><span class="lbl">Dirección</span><span>${cliente.direccion}</span></div>` : ""}
    ${cliente.telefono ? `<div class="row"><span class="lbl">Teléfono</span><span>${cliente.telefono}</span></div>` : ""}
    <div class="row"><span class="lbl">Fecha de compra</span><span>${fmtDate(cliente.fechaCompra)}</span></div>
    <hr/><div class="section">Productos</div>
    <table><thead><tr><th>#</th><th>Producto</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>${cliente.productos.map((p, i) => `<tr><td style="color:#bbb">${i + 1}</td><td>${p.descripcion}</td><td style="text-align:right;font-weight:bold">${formatCLP(p.valor)}</td></tr>`).join("")}</tbody></table>
    <div class="total-line"><span>Total Compra</span><span>${formatCLP(cliente.totalCompra)}</span></div>
    <hr/><div class="section">Historial de Abonos</div>${abonosHTML}
    <div class="saldo-box"><div class="saldo-lbl">Saldo Pendiente</div><div class="saldo-val">${saldo > 0 ? formatCLP(saldo) : "✓ PAGADO"}</div></div>
    <div class="footer">Generado el ${new Date().toLocaleDateString("es-CL")} · Solo para uso interno</div>
    </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: "90vw", maxWidth: 500, boxShadow: "0 8px 48px #0006", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#7a5a1a", textTransform: "uppercase", marginBottom: 4 }}>Comprobante de Venta</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, borderBottom: "2px solid #1a1008", paddingBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: "bold" }}>Registro de Compra</div>
          <div style={{ fontSize: 11, color: "#aaa" }}>N° {String(cliente.id).slice(-6)}</div>
        </div>
        {[["Cliente", <b>{cliente.nombre}</b>], ["Ciudad", cliente.ciudad],
          cliente.direccion && ["Dirección", cliente.direccion],
          cliente.telefono && ["Teléfono", cliente.telefono],
          ["Fecha de compra", fmtDate(cliente.fechaCompra)]
        ].filter(Boolean).map(([lbl, val]) => (
          <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: "#666" }}>{lbl}</span><span>{val}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px dashed #ccc", margin: "14px 0" }} />
        <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, color: "#5a4020", marginBottom: 8 }}>Productos</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#f5f0e8" }}>
            {["#", "Producto", "Valor"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: h === "Valor" ? "right" : "left", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#7a5a1a", fontWeight: "normal" }}>{h}</th>)}
          </tr></thead>
          <tbody>{cliente.productos.map((p, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f0e8d8" }}>
              <td style={{ padding: "7px 8px", color: "#bbb" }}>{i + 1}</td>
              <td style={{ padding: "7px 8px" }}>{p.descripcion}</td>
              <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: "bold" }}>{formatCLP(p.valor)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 15, marginTop: 10, paddingTop: 8, borderTop: "2px solid #1a1008" }}>
          <span>Total Compra</span><span>{formatCLP(cliente.totalCompra)}</span>
        </div>
        <div style={{ borderTop: "1px dashed #ccc", margin: "14px 0" }} />
        <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, color: "#5a4020", marginBottom: 8 }}>Historial de Abonos</div>
        {cliente.abonos.length === 0 ? <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Sin abonos registrados</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 8 }}>
            <thead><tr style={{ background: "#f5f0e8" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: "#7a5a1a", fontWeight: "normal" }}>Fecha</th>
              <th style={{ padding: "6px 8px", textAlign: "right", fontSize: 10, textTransform: "uppercase", color: "#7a5a1a", fontWeight: "normal" }}>Monto</th>
            </tr></thead>
            <tbody>{cliente.abonos.map((a, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0e8d8" }}>
                <td style={{ padding: "7px 8px" }}>{fmtDate(a.fecha)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: "bold", color: "#2a7a2a" }}>{formatCLP(a.monto)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{ borderTop: "1px solid #ccc" }}>
              <td style={{ padding: "7px 8px", fontWeight: "bold" }}>Total abonado</td>
              <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: "bold", color: "#2a7a2a" }}>{formatCLP(totalAbonado)}</td>
            </tr></tfoot>
          </table>
        )}
        <div style={{ padding: "12px 16px", border: `2px solid ${saldo > 0 ? "#b04000" : "#2a7a2a"}`, borderRadius: 8, textAlign: "center", marginTop: 6 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: saldo > 0 ? "#b04000" : "#2a7a2a" }}>Saldo Pendiente</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: saldo > 0 ? "#b04000" : "#2a7a2a", marginTop: 2 }}>{saldo > 0 ? formatCLP(saldo) : "✓ PAGADO"}</div>
        </div>
        <div style={{ fontSize: 10, color: "#bbb", textAlign: "center", marginTop: 12 }}>Generado el {new Date().toLocaleDateString("es-CL")} · Solo para uso interno</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ background: "none", border: "1.5px solid #ccc", borderRadius: 7, padding: "9px 18px", cursor: "pointer", fontSize: 13 }}>Cerrar</button>
          <button onClick={handlePrint} style={{ background: "#1a1008", color: "#c8a96e", border: "none", borderRadius: 7, padding: "9px 22px", cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>🖨 Imprimir / PDF</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODAL ABONOS
══════════════════════════════════════════════════════════ */
function ModalAbonos({ cliente, onClose, onUpdate }) {
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const totalAbonado = sumAbonos(cliente.abonos);
  const saldo = Math.max(0, cliente.totalCompra - totalAbonado);

  const handleAgregar = async () => {
    if (!fecha) { setErr("Ingresa una fecha"); return; }
    const m = parseNum(monto);
    if (m <= 0) { setErr("Ingresa un monto válido"); return; }
    if (m > saldo) { setErr(`El monto supera el saldo (${formatCLP(saldo)})`); return; }
    setErr(""); setSaving(true);
    const nuevos = [...cliente.abonos, { fecha, monto: m, id: Date.now() }]
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    await onUpdate(cliente.id, nuevos);
    setMonto(""); setFecha(todayISO()); setSaving(false);
  };

  const handleEliminar = async (abonoId) => {
    setSaving(true);
    const nuevos = cliente.abonos.filter(a => a.id !== abonoId);
    await onUpdate(cliente.id, nuevos);
    setSaving(false);
  };

  const nuevoTotal = sumAbonos(cliente.abonos);
  const nuevoSaldo = Math.max(0, cliente.totalCompra - nuevoTotal);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 250 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: "90vw", maxWidth: 500, boxShadow: "0 8px 48px #0005", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a96e", textTransform: "uppercase", marginBottom: 4 }}>Historial de Pagos</div>
        <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 2 }}>{cliente.nombre}</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Compra del {fmtDate(cliente.fechaCompra)} · Total: {formatCLP(cliente.totalCompra)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "#eafaea", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#2a7a2a", textTransform: "uppercase", letterSpacing: 1 }}>Total Abonado</div>
            <div style={{ fontWeight: "bold", fontSize: 17, color: "#2a7a2a" }}>{formatCLP(nuevoTotal)}</div>
          </div>
          <div style={{ background: nuevoSaldo > 0 ? "#3d1a00" : "#eafaea", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: nuevoSaldo > 0 ? "#c8a96e" : "#2a7a2a", textTransform: "uppercase", letterSpacing: 1 }}>Saldo Pendiente</div>
            <div style={{ fontWeight: "bold", fontSize: 17, color: nuevoSaldo > 0 ? "#f5f0e8" : "#2a7a2a" }}>{nuevoSaldo > 0 ? formatCLP(nuevoSaldo) : "✓ Pagado"}</div>
          </div>
        </div>

        {saving && <div style={{ textAlign: "center", padding: "8px", fontSize: 12, color: "#7a5a1a", marginBottom: 8 }}>⏳ Guardando en Google Sheets…</div>}

        {cliente.abonos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#bbb", fontSize: 13, marginBottom: 16 }}>No hay abonos registrados aún</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
            <thead><tr style={{ background: "#1a1008", color: "#c8a96e" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: "normal" }}>Fecha</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: "normal" }}>Monto</th>
              <th style={{ padding: "8px 10px", width: 36 }} />
            </tr></thead>
            <tbody>{cliente.abonos.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 === 0 ? "#faf7f0" : "#fff", borderBottom: "1px solid #ede4d0" }}>
                <td style={{ padding: "9px 10px" }}>{fmtDate(a.fecha)}</td>
                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: "bold", color: "#2a7a2a" }}>{formatCLP(a.monto)}</td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}>
                  <button onClick={() => handleEliminar(a.id)} style={{ background: "none", border: "none", color: "#d44", cursor: "pointer", fontSize: 15 }}>×</button>
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{ background: "#f5f0e8" }}>
              <td style={{ padding: "8px 10px", fontWeight: "bold" }}>Total</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold", color: "#2a7a2a" }}>{formatCLP(nuevoTotal)}</td>
              <td />
            </tr></tfoot>
          </table>
        )}

        {nuevoSaldo > 0 && (
          <div style={{ background: "#f5f0e8", border: "1.5px solid #d4c5a0", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, color: "#5a4020", marginBottom: 12 }}>+ Registrar nuevo abono</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#7a5a1a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Fecha</label>
                <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setErr(""); }}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #d4c5a0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#7a5a1a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Monto ($)</label>
                <input type="number" min={1} value={monto} onChange={e => { setMonto(e.target.value); setErr(""); }}
                  placeholder="0"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${err ? "#d44" : "#d4c5a0"}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            {err && <div style={{ color: "#d44", fontSize: 11, marginTop: 6 }}>{err}</div>}
            <button onClick={handleAgregar} disabled={saving}
              style={{ marginTop: 12, background: saving ? "#aaa" : "#1a1008", color: "#c8a96e", border: "none", borderRadius: 7, padding: "9px 0", width: "100%", cursor: saving ? "default" : "pointer", fontWeight: "bold", fontSize: 13 }}>
              {saving ? "Guardando…" : "Registrar Abono"}
            </button>
          </div>
        )}
        {nuevoSaldo === 0 && (
          <div style={{ background: "#eafaea", border: "1.5px solid #4caf50", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>✅</div>
            <div style={{ fontWeight: "bold", color: "#2a7a2a", marginTop: 4 }}>Deuda completamente saldada</div>
          </div>
        )}
        <div style={{ textAlign: "right", marginTop: 18 }}>
          <button onClick={onClose} style={{ background: "#1a1008", color: "#c8a96e", border: "none", borderRadius: 7, padding: "9px 22px", cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function RegistroClientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [comprobanteId, setComprobanteId] = useState(null);
  const [abonosId, setAbonosId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* Carga inicial desde Google Sheets */
  useEffect(() => {
    setLoading(true);
    apiGet()
      .then(res => {
        if (res.ok) setClientes(res.clientes);
        else showToast("Error al cargar datos", "err");
      })
      .catch(() => showToast("Sin conexión con Google Sheets", "err"))
      .finally(() => setLoading(false));
  }, []);

  const totalCompra = useMemo(() => calcTotal(form.productos), [form.productos]);

  const handleProductoChange = (i, field, value) => {
    setForm(f => ({ ...f, productos: f.productos.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));
    setErrors(e => ({ ...e, productos: undefined }));
  };
  const addProducto = () => {
    if (form.productos.length >= MAX_PRODUCTOS) return;
    setForm(f => ({ ...f, productos: [...f.productos, emptyProducto()] }));
  };
  const removeProducto = (i) => {
    if (form.productos.length === 1) return;
    setForm(f => ({ ...f, productos: f.productos.filter((_, idx) => idx !== i) }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.ciudad.trim()) e.ciudad = "Requerido";
    if (!form.fechaCompra) e.fechaCompra = "Requerido";
    const validos = form.productos.filter(p => p.descripcion.trim() && parseNum(p.valor) > 0);
    if (validos.length === 0) e.productos = "Agrega al menos un producto con descripción y valor";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const prods = form.productos
      .filter(p => p.descripcion.trim() || parseNum(p.valor) > 0)
      .map(p => ({ descripcion: p.descripcion, valor: parseNum(p.valor) }));
    const total = calcTotal(prods);
    const entry = {
      nombre: form.nombre, direccion: form.direccion,
      telefono: form.telefono, ciudad: form.ciudad,
      fechaCompra: form.fechaCompra,
      productos: prods, totalCompra: total,
      abonos: editId ? (clientes.find(c => c.id === editId)?.abonos ?? []) : [],
      id: editId ?? Date.now(),
      fechaRegistro: editId
        ? (clientes.find(c => c.id === editId)?.fechaRegistro ?? new Date().toLocaleDateString("es-CL"))
        : new Date().toLocaleDateString("es-CL"),
    };
    setSaving(true);
    try {
      const action = editId ? "actualizar" : "guardar";
      const res = await apiPost({ action, cliente: entry });
      if (!res.ok) throw new Error(res.error);
      if (editId) {
        setClientes(cs => cs.map(c => c.id === editId ? entry : c));
      } else {
        setClientes(cs => [...cs, entry]);
      }
      setEditId(null); setForm(initialForm); setModalOpen(false);
      showToast(editId ? "Cliente actualizado ✓" : "Cliente guardado ✓");
    } catch (err) {
      showToast("Error al guardar: " + err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c) => {
    setForm({
      nombre: c.nombre, direccion: c.direccion, telefono: c.telefono, ciudad: c.ciudad,
      fechaCompra: c.fechaCompra || todayISO(),
      productos: c.productos.map(p => ({ descripcion: p.descripcion, valor: String(p.valor) })),
    });
    setEditId(c.id); setErrors({}); setModalOpen(true);
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      const res = await apiPost({ action: "eliminar", id });
      if (!res.ok) throw new Error(res.error);
      setClientes(cs => cs.filter(c => c.id !== id));
      setDeleteId(null);
      showToast("Cliente eliminado");
    } catch (err) {
      showToast("Error al eliminar: " + err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAbonos = async (clienteId, nuevosAbonos) => {
    try {
      const res = await apiPost({ action: "abonar", id: clienteId, abonos: nuevosAbonos });
      if (!res.ok) throw new Error(res.error);
      setClientes(cs => cs.map(c => {
        if (c.id !== clienteId) return c;
        return { ...c, abonos: nuevosAbonos };
      }));
      showToast("Abono guardado ✓");
    } catch (err) {
      showToast("Error al guardar abono: " + err.message, "err");
    }
  };

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.ciudad.toLowerCase().includes(search.toLowerCase())
  );

  const abonoGeneral = clientes.reduce((s, c) => s + sumAbonos(c.abonos), 0);
  const saldoGeneral = clientes.reduce((s, c) => s + Math.max(0, c.totalCompra - sumAbonos(c.abonos)), 0);

  const clienteDetalle = clientes.find(c => c.id === detailId);
  const clienteComprobante = clientes.find(c => c.id === comprobanteId);
  const clienteAbonos = clientes.find(c => c.id === abonosId);

  const inp = (err) => ({
    width: "100%", padding: "8px 11px", borderRadius: 7,
    border: `1.5px solid ${err ? "#d44" : "#d4c5a0"}`,
    fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff",
  });

  return (
    <div style={{ fontFamily: "'Georgia', serif", minHeight: "100vh", background: "#f5f0e8", color: "#1a1008" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "err" ? "#d44" : "#1a1008", color: toast.type === "err" ? "#fff" : "#c8a96e", padding: "12px 22px", borderRadius: 8, fontWeight: "bold", fontSize: 13, zIndex: 999, boxShadow: "0 4px 20px #0004" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#1a1008", padding: "22px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 24px #0004" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#c8a96e", textTransform: "uppercase", marginBottom: 3 }}>Sistema de Registro</div>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#f5f0e8" }}>Libro de Clientes</div>
          <div style={{ fontSize: 10, color: "#c8a96e", marginTop: 2, opacity: 0.7 }}>● Conectado a Google Sheets</div>
        </div>
        <button onClick={() => { setForm(initialForm); setEditId(null); setErrors({}); setModalOpen(true); }}
          style={{ background: "#c8a96e", color: "#1a1008", border: "none", borderRadius: 6, padding: "11px 22px", fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>
          + Nuevo Cliente
        </button>
      </div>

      {/* Resumen */}
      <div style={{ display: "flex", gap: 14, padding: "22px 32px 0", flexWrap: "wrap" }}>
        {[
          { label: "Total Clientes", value: clientes.length, icon: "👥" },
          { label: "Total Abonado", value: formatCLP(abonoGeneral), icon: "✅" },
          { label: "Saldo Pendiente", value: formatCLP(saldoGeneral), icon: "⏳", alert: saldoGeneral > 0 },
        ].map(s => (
          <div key={s.label} style={{ background: s.alert ? "#3d1a00" : "#fff", border: `1.5px solid ${s.alert ? "#c8a96e" : "#e0d5c0"}`, borderRadius: 10, padding: "14px 22px", minWidth: 150, flex: 1 }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 10, color: s.alert ? "#c8a96e" : "#888", textTransform: "uppercase", letterSpacing: 2, marginTop: 3 }}>{s.label}</div>
            <div style={{ fontSize: 19, fontWeight: "bold", color: s.alert ? "#f5f0e8" : "#1a1008", marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Búsqueda */}
      <div style={{ padding: "18px 32px 0" }}>
        <input placeholder="Buscar por nombre o ciudad…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 360, padding: "9px 15px", borderRadius: 8, border: "1.5px solid #d4c5a0", background: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Tabla */}
      <div style={{ padding: "18px 32px 40px", overflowX: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#b0946a", fontSize: 15 }}>
            ⏳ Cargando datos desde Google Sheets…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#b0946a", fontSize: 15 }}>
            {clientes.length === 0 ? "No hay clientes registrados. Agrega el primero." : "Sin resultados para la búsqueda."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px #0001", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1a1008", color: "#c8a96e" }}>
                {["Fecha Compra", "Nombre", "Ciudad", "Teléfono", "Productos", "Abonos", "Saldo", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "12px 13px", textAlign: "left", fontWeight: "normal", letterSpacing: 1, fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const totalAbonado = sumAbonos(c.abonos);
                const saldo = Math.max(0, c.totalCompra - totalAbonado);
                return (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? "#faf7f0" : "#fff", transition: "background .15s" }}
                    onMouseOver={e => e.currentTarget.style.background = "#f0e8d0"}
                    onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? "#faf7f0" : "#fff"}>
                    <td style={{ padding: "10px 13px", color: "#555", whiteSpace: "nowrap", fontWeight: "bold" }}>{fmtDate(c.fechaCompra)}</td>
                    <td style={{ padding: "10px 13px", fontWeight: "bold" }}>{c.nombre}</td>
                    <td style={{ padding: "10px 13px" }}>{c.ciudad}</td>
                    <td style={{ padding: "10px 13px", color: "#666" }}>{c.telefono || "—"}</td>
                    <td style={{ padding: "10px 13px" }}>
                      <button onClick={() => setDetailId(c.id)}
                        style={{ background: "#f5f0e8", border: "1px solid #d4c5a0", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: "#7a5a1a" }}>
                        Ver {c.productos.length} {c.productos.length !== 1 ? "productos" : "producto"}
                      </button>
                    </td>
                    <td style={{ padding: "10px 13px" }}>
                      <button onClick={() => setAbonosId(c.id)}
                        style={{ background: c.abonos.length > 0 ? "#eafaea" : "#f5f0e8", border: `1px solid ${c.abonos.length > 0 ? "#4caf50" : "#d4c5a0"}`, borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: c.abonos.length > 0 ? "#2a7a2a" : "#7a5a1a", fontWeight: c.abonos.length > 0 ? "bold" : "normal" }}>
                        {c.abonos.length > 0 ? `${c.abonos.length} abono${c.abonos.length !== 1 ? "s" : ""} · ${formatCLP(totalAbonado)}` : "+ Abonar"}
                      </button>
                    </td>
                    <td style={{ padding: "10px 13px", fontWeight: "bold", color: saldo > 0 ? "#b04000" : "#2a7a2a", whiteSpace: "nowrap" }}>
                      {saldo > 0 ? formatCLP(saldo) : "✓ Pagado"}
                    </td>
                    <td style={{ padding: "10px 13px", whiteSpace: "nowrap" }}>
                      <button onClick={() => setComprobanteId(c.id)}
                        style={{ background: "#1a1008", border: "none", color: "#c8a96e", borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontSize: 12, marginRight: 5 }} title="Comprobante">🖨</button>
                      <button onClick={() => handleEdit(c)}
                        style={{ background: "none", border: "1px solid #c8a96e", color: "#7a5a1a", borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontSize: 12, marginRight: 5 }}>Editar</button>
                      <button onClick={() => setDeleteId(c.id)}
                        style={{ background: "none", border: "1px solid #d44", color: "#d44", borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontSize: 12 }}>Eliminar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Formulario */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: "95vw", maxWidth: 640, boxShadow: "0 8px 48px #0005", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a96e", textTransform: "uppercase", marginBottom: 4 }}>{editId ? "Editar" : "Nuevo"}</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#1a1008", marginBottom: 20 }}>{editId ? "Actualizar Cliente" : "Registrar Cliente"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, marginBottom: 6 }}>
              {[
                { name: "nombre", label: "Nombre completo", required: true, full: true },
                { name: "ciudad", label: "Ciudad", required: true },
                { name: "telefono", label: "Teléfono" },
                { name: "direccion", label: "Dirección", full: true },
              ].map(({ name, label, required, full }) => (
                <div key={name} style={{ gridColumn: full ? "1 / -1" : undefined }}>
                  <label style={{ display: "block", fontSize: 11, color: "#5a4020", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
                    {label}{required && <span style={{ color: "#c8a96e" }}> *</span>}
                  </label>
                  <input name={name} value={form[name]}
                    onChange={e => { setForm(f => ({ ...f, [name]: e.target.value })); setErrors(er => ({ ...er, [name]: undefined })); }}
                    style={inp(errors[name])} placeholder={`Ingresa ${label.toLowerCase()}…`} />
                  {errors[name] && <div style={{ color: "#d44", fontSize: 11, marginTop: 2 }}>{errors[name]}</div>}
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 11, color: "#5a4020", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
                  Fecha de Compra <span style={{ color: "#c8a96e" }}>*</span>
                </label>
                <input type="date" value={form.fechaCompra}
                  onChange={e => { setForm(f => ({ ...f, fechaCompra: e.target.value })); setErrors(er => ({ ...er, fechaCompra: undefined })); }}
                  style={{ ...inp(errors.fechaCompra), maxWidth: 200 }} />
                {errors.fechaCompra && <div style={{ color: "#d44", fontSize: 11, marginTop: 2 }}>{errors.fechaCompra}</div>}
              </div>
            </div>
            <div style={{ borderTop: "1.5px solid #e8dfc8", margin: "16px 0 12px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: "bold", color: "#5a4020", textTransform: "uppercase", letterSpacing: 1 }}>
                Detalle de Productos <span style={{ color: "#c8a96e" }}>*</span>
              </div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{form.productos.length} / {MAX_PRODUCTOS}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 32px", gap: 8, marginBottom: 5 }}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>Descripción</div>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>Valor ($)</div>
              <div />
            </div>
            {form.productos.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 130px 32px", gap: 8, marginBottom: 7, alignItems: "center" }}>
                <input value={p.descripcion} onChange={e => handleProductoChange(i, "descripcion", e.target.value)}
                  placeholder={`Producto ${i + 1}…`} style={inp(false)} />
                <input type="number" min={0} value={p.valor} onChange={e => handleProductoChange(i, "valor", e.target.value)}
                  placeholder="0" style={inp(false)} />
                <button onClick={() => removeProducto(i)} disabled={form.productos.length === 1}
                  style={{ background: form.productos.length === 1 ? "#f0e8d0" : "#fde8e8", border: "none", borderRadius: 6, width: 32, height: 34, cursor: form.productos.length === 1 ? "default" : "pointer", color: form.productos.length === 1 ? "#ccc" : "#d44", fontSize: 18 }}>×</button>
              </div>
            ))}
            {errors.productos && <div style={{ color: "#d44", fontSize: 11, marginBottom: 6 }}>{errors.productos}</div>}
            {form.productos.length < MAX_PRODUCTOS && (
              <button onClick={addProducto}
                style={{ background: "none", border: "1.5px dashed #c8a96e", color: "#7a5a1a", borderRadius: 7, padding: "7px 0", width: "100%", cursor: "pointer", fontSize: 13, marginBottom: 2 }}>
                + Agregar producto
              </button>
            )}
            <div style={{ background: "#f5f0e8", border: "1px solid #d4c5a0", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
              {form.productos.filter(p => p.descripcion.trim() && parseNum(p.valor) > 0).map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", marginBottom: 4 }}>
                  <span>{p.descripcion}</span><span>{formatCLP(p.valor)}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #d4c5a0", marginTop: 6, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 15 }}>
                <span>Total Compra</span><span>{formatCLP(totalCompra)}</span>
              </div>
            </div>
            <div style={{ background: "#e8f4fd", border: "1px solid #90caf9", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: 12, color: "#1565c0" }}>
              💡 Los abonos se registran desde la tabla principal, en la columna <b>Abonos</b>.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "1.5px solid #ccc", borderRadius: 7, padding: "9px 20px", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={handleSubmit} disabled={saving}
                style={{ background: saving ? "#aaa" : "#1a1008", color: "#c8a96e", border: "none", borderRadius: 7, padding: "9px 24px", cursor: saving ? "default" : "pointer", fontWeight: "bold", fontSize: 14 }}>
                {saving ? "Guardando…" : editId ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Productos */}
      {clienteDetalle && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150 }}
          onClick={e => { if (e.target === e.currentTarget) setDetailId(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: "90vw", maxWidth: 480, boxShadow: "0 8px 48px #0005", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a96e", textTransform: "uppercase", marginBottom: 4 }}>Detalle de compra</div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>{clienteDetalle.nombre}</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 18 }}>{clienteDetalle.ciudad} · {fmtDate(clienteDetalle.fechaCompra)}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f5f0e8" }}>
                {["#", "Producto", "Valor"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: h === "Valor" ? "right" : "left", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#7a5a1a", fontWeight: "normal" }}>{h}</th>)}
              </tr></thead>
              <tbody>{clienteDetalle.productos.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0e8d8" }}>
                  <td style={{ padding: "9px 10px", color: "#bbb" }}>{i + 1}</td>
                  <td style={{ padding: "9px 10px" }}>{p.descripcion}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: "bold" }}>{formatCLP(p.valor)}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{ background: "#1a1008" }}>
                <td colSpan={2} style={{ padding: "10px", color: "#c8a96e", fontWeight: "bold" }}>Total</td>
                <td style={{ padding: "10px", textAlign: "right", color: "#c8a96e", fontWeight: "bold", fontSize: 15 }}>{formatCLP(clienteDetalle.totalCompra)}</td>
              </tr></tfoot>
            </table>
            <div style={{ textAlign: "right", marginTop: 20 }}>
              <button onClick={() => setDetailId(null)} style={{ background: "#1a1008", color: "#c8a96e", border: "none", borderRadius: 7, padding: "9px 22px", cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Abonos */}
      {clienteAbonos && (
        <ModalAbonos cliente={clienteAbonos} onClose={() => setAbonosId(null)} onUpdate={handleUpdateAbonos} />
      )}

      {/* Comprobante */}
      {clienteComprobante && (
        <Comprobante cliente={clienteComprobante} onClose={() => setComprobanteId(null)} />
      )}

      {/* Modal Eliminar */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 340, textAlign: "center", boxShadow: "0 4px 32px #0003" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>¿Eliminar cliente?</div>
            <div style={{ color: "#666", fontSize: 13, marginBottom: 22 }}>Esta acción eliminará también todos sus abonos.</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ background: "none", border: "1.5px solid #ccc", borderRadius: 7, padding: "9px 20px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} disabled={saving}
                style={{ background: "#d44", color: "#fff", border: "none", borderRadius: 7, padding: "9px 20px", cursor: "pointer", fontWeight: "bold" }}>
                {saving ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
