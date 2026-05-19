const express = require("express");
const fs = require("fs");
const path = require("path");

const multer = require("multer");

const router = express.Router();

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },

  filename: function (req, file, cb) {

    const ext = path.extname(file.originalname);

    cb(
      null,
      "logo_" + Date.now() + ext
    );
  }
});

const upload = multer({ storage });

const Ticket = require("./models/Ticket");
const Vendor = require("./models/vendor");

const Sorteo = require("./models/Sorteo");
const Loteria = require("./models/Loteria");
const AppConfig = require("./models/AppConfig");

// =============================
// 📁 FILE PATHS
// =============================
const VENDEURS_FILE = path.join(__dirname, "vendeurs.json");
const TICKETS_FILE = path.join(__dirname, "tickets.json");
const SORTEOS_FILE = path.join(__dirname, "sorteos.json");

console.log("ADMIN VENDEURS_FILE =", VENDEURS_FILE);

// =============================
// 🔒 ENSURE FILES EXIST
// =============================
function ensureVendeursFile() {
  if (!fs.existsSync(VENDEURS_FILE)) {
    fs.writeFileSync(VENDEURS_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

function ensureTicketsFile() {
  if (!fs.existsSync(TICKETS_FILE)) {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function ensureSorteosFile() {
  if (!fs.existsSync(SORTEOS_FILE)) {
    fs.writeFileSync(SORTEOS_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

// =============================
// 📖 READ FUNCTIONS
// =============================
function readTicketsArray() {
  try {
    ensureTicketsFile();
    const raw = fs.readFileSync(TICKETS_FILE, "utf8").trim();
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erreur lecture tickets.json :", err);
    return [];
  }
}

function readSorteosObject() {
  try {
    ensureSorteosFile();
    const raw = fs.readFileSync(SORTEOS_FILE, "utf8").trim();
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.error("Erreur lecture sorteos.json :", err);
    return {};
  }
}

// =============================
// ✍️ WRITE FUNCTIONS
// =============================
function writeSorteosObject(data) {
  fs.writeFileSync(SORTEOS_FILE, JSON.stringify(data, null, 2), "utf8");
}

// =============================
// 🔥 CREATE TICKET (FIX TOTAL)
// =============================
router.post("/ticket", async (req, res) => {
  try {
    const {
      sellerId,
      sellerName,
      total,
      tirages,
      jeux,
      channel,
      clientDateLabel,
      clientTimeLabel
    } = req.body;

    const now = new Date();

    // 🔒 sécuriser jeux
    const safeJeux = Array.isArray(jeux) ? jeux : [];

    // 🔥 ID JAMAIS NULL
    const ticketId =
      Date.now().toString() +
      "_" +
      Math.random().toString(36).substring(2, 10);

    const ticket = await Ticket.create({
      id: ticketId,
      vendeur: sellerId,
      vendeurNom: sellerName,

      createdAt: now,

      createdAtLabel:
        clientDateLabel && clientTimeLabel
          ? clientDateLabel + " " + clientTimeLabel
          : now.toLocaleString(),

      dateLabel: clientDateLabel || now.toLocaleDateString(),
      timeLabel: clientTimeLabel || now.toLocaleTimeString(),

      status: "ANATAN",
      premio: 0,

      channel,
      total,
      tirages,
      jeux: safeJeux
    });

    console.log("✅ Ticket créé:", ticket.id);

    res.json({ ok: true, ticket });

  } catch (err) {
    console.error("❌ Erreur création ticket:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =============================
module.exports = router;

function readVendeursObject() {
  try {
    ensureVendeursFile();
    const raw = fs.readFileSync(VENDEURS_FILE, "utf8").trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (err) {
    console.error("Erreur lecture vendeurs.json :", err);
    return {};
  }
}

function writeVendeursObject(data) {
  fs.writeFileSync(VENDEURS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function parseAmount(val) {
  if (val == null || val === "") return 0;
  const num = Number(String(val).replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : 0;
}

function formatAmount(val) {
  const num = parseAmount(val);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function todayFR() {
  return new Date().toLocaleDateString("fr-FR");
}

function normalizeConnection(conn = {}) {
  return {
    id: String(conn.id || ""),
    marca: String(conn.marca || conn.id || "DESCONOCIDO"),
    modelo: String(conn.modelo || conn.id || "WEB"),
    version: String(conn.version || "?"),
    app: String(conn.app || "2.9.32"),
    vinculado: String(conn.vinculado || conn.last || ""),
    last: String(conn.last || ""),
    pin: conn.pin == null ? "" : conn.pin,
    place: String(conn.place || "?"),
    ip: String(conn.ip || ""),
    userAgent: String(conn.userAgent || ""),
    co: conn.co === true,
    on: conn.on === true,
    st: conn.st === true
  };
}

function normalizeVendor(data = {}) {
  const nombre = String(data.nombre || data.nom || "").trim();
  const zona = String(data.zona || data.groupe || "").trim();
  const clave = String(data.clave || data.password || "").trim();

  return {
    nom: nombre,
    nombre,
    groupe: zona,
    zona,
    password: clave,
    clave,
    estatus: String(data.estatus || "Activo"),
    app: String(data.app || "2.9.32"),
    conexion: String(data.conexion || ""),
    apellido: String(data.apellido || ""),
    cedula: String(data.cedula || ""),
    telefono: String(data.telefono || ""),
    direccion: String(data.direccion || ""),
    sexo: String(data.sexo || "-"),

    // Données ventes / balance
    venta: parseAmount(data.venta),
    premiosMonto: parseAmount(data.premiosMonto),
    balance: parseAmount(data.balance),
movimientos: Array.isArray(data.movimientos)
  ? data.movimientos.map((m) => ({
      id: m.id || Date.now(),
      tipo: String(m.tipo || ""),
      monto: parseAmount(m.monto),
      fecha: String(m.fecha || todayFR()),
      hora: String(m.hora || m.heure || m.time || ""),
      comentario: String(m.comentario || "")
    }))
  : [],

    config: data.config || {
      limiteDiario: "0",
      credito: "0",
      deshabilitarLoterias: "",
      deshabilitarJugadas: "",
      mezclaNumeros: "0",
      habilitarCuadre: false,
      ventasWhatsapp: false,
      usarNombreTicket: false,
      deshabilitarDecimales: "0",
      deshabilitarTerminales: "0",
      habilitarPrepago: false,
      activarBono: false,
      bonoTipo: "Mariage"
    },

    comision: data.comision || {
      retener: false,
      general: "0",
      borlette: "0",
      mariage: "0",
      loto3: "0",
      loto4: "0",
      loto5: "0",
      loto5o2: "0",
      loto5o3: "0",
      zona: "0",
      porLoteria: false
    },

    premios: data.premios || {
      habilitar: true,
      loteria: "TODAS",
      applyAll: true,
      borlette: ["", "", ""],
      mariage: ["", "", ""],
      loto3: ["", "", ""],
      loto4: ["", "", ""],
      loto5: ["", "", ""],
      loto5o2: ["", "", ""],
      loto5o3: ["", "", ""]
    },

    limites: data.limites || {
      loteria: "TODAS",
      applyAll: true,
      borlette: "0",
      mariage: "0",
      loto3: "0",
      loto4_l1: "0",
      loto4_l2: "0",
      loto4_l3: "0",
      loto5_l1: "0",
      loto5_l2: "0",
      loto5_l3: "0",
      limitarNumeros: [],
      bloqueoNumeros: [],
      limitarCantidad: {
        borlette: "0",
        mariage: "0",
        loto3: "0",
        loto4: "0",
        loto5: "0",
        loto5o2: "0",
        loto5o3: "0"
      }
    },

    conexiones: Array.isArray(data.conexiones)
      ? data.conexiones.map(normalizeConnection)
      : []
  };
}

function objectToArray(obj) {
  return Object.keys(obj).map((id) => {
    const v = normalizeVendor(obj[id] || {});
    return {
      id,
      ...v
    };
  });
}

function getCommissionRate(vendor) {
  const general =
    parseAmount(vendor?.comision?.general) ||
    parseAmount(vendor?.comision?.zona) ||
    0;
  return general;
}

function getVentaStats(vendor, id) {
  const venta = parseAmount(vendor.venta);
  const premios = parseAmount(vendor.premiosMonto);
  const rate = getCommissionRate(vendor);
  const comision = (venta * rate) / 100;
  const resultado = venta - comision - premios;
  const balance = parseAmount(vendor.balance) + resultado;

  return {
    id,
    nombre: vendor.nombre || vendor.nom || id,
    zona: vendor.zona || vendor.groupe || "",
    venta,
    comision,
    premios,
    resultado,
    balance,
    movimientos: vendor.movimientos || [],
    estatus: vendor.estatus || "Activo"
  };
}

function buildVentasRows(obj) {
  return Object.keys(obj)
    .map((id) => getVentaStats(normalizeVendor(obj[id]), id))
    .filter((row) => row.venta > 0 || row.premios > 0 || row.comision > 0 || row.resultado !== 0)
    .sort((a, b) => b.resultado - a.resultado);
}

function buildBalanceRows(obj) {
  return Object.keys(obj)
    .map((id) => getVentaStats(normalizeVendor(obj[id]), id))
    .sort((a, b) => b.balance - a.balance);
}

router.get("/api/vendors", async (req, res) => {
  try {
    const vendors = await Vendor.find().lean();
    res.json(vendors);
  } catch (err) {
    console.error("Erreur get vendors Mongo:", err);
    res.status(500).json([]);
  }
});

function money(v){
  return Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function clean(v){
  return String(v || "").trim().replace(/\s+/g, "");
}

function pad2(v){
  const s = clean(v);
  if (/^\d$/.test(s)) return "0" + s;
  return s;
}

function payout(config, key, def){
  const val = key.split(".").reduce((o, k) => o && o[k], config);
  const n = Number(val);
  return isNaN(n) ? def : n;
}

function getGainAdmin(j, tirage, config){
  if (!tirage) return 0;

  const type = clean(j.type).toUpperCase();
  const num = clean(j.numero);
  const montant = Number(j.montant || 0);

  const r1 = clean(tirage.r1);
  const r2 = pad2(tirage.r2);
  const r3 = pad2(tirage.r3);
  const r4 = pad2(tirage.r4);

  let pay = 0;

  if(type === "BOR"){
    const played = pad2(num);

    if(played === r2) pay = payout(config, "premios.borlette1", 55);
    else if(played === r3) pay = payout(config, "premios.borlette2", 20);
    else if(played === r4) pay = payout(config, "premios.borlette3", 10);
  }

  else if(type === "MAR"){
    const isGratis =
      j.gratis === true ||
      j.free === true ||
      Number(j.montant || 0) === 0;

    const parts = String(num)
      .replace("-", "x")
      .replace("*", "x")
      .split("x")
      .map(x => pad2(x));

    const played = parts.join("");

    const wins = [
      r2 + r3,
      r2 + r4,
      r3 + r4
    ];

    if(wins.includes(played)){
      if(isGratis){
        return Number(j.payoutGratis || 0);
      }

      pay = payout(config, "premios.mariage", 1000);
      return montant * pay;
    }
  }

  else if(type === "L3"){
    if(num === r1 + r2) pay = payout(config, "premios.loto3", 500);
  }

  else if(type === "L41"){
    if(num === r3 + r4) pay = payout(config, "premios.l41", 5000);
  }

  else if(type === "L42"){
    if(num === r2 + r4) pay = payout(config, "premios.l42", 5000);
  }

  else if(type === "L43"){
    if(num === r2 + r3) pay = payout(config, "premios.l43", 5000);
  }

  else if(type === "L51"){
    if(num === r1 + r2 + r3) pay = payout(config, "premios.l51", 25000);
  }

  else if(type === "L52"){
    if(num === r1 + r2 + r4) pay = payout(config, "premios.l52", 25000);
  }

  else if(type === "L53"){
    if(num === r2.slice(-1) + r3 + r4) pay = payout(config, "premios.l53", 25000);
  }

  return montant * pay;
}

router.get("/api/reportes/ventas", async (req, res) => {
  try {
    const start = String(req.query.start || "").trim();
    const end = String(req.query.end || "").trim();

    const vendorsArr = await Vendor.find().lean();
    const tickets = await Ticket.find().lean();

    const vendeurs = {};
    vendorsArr.forEach(v => {
      const id = String(v.id || "").trim().toUpperCase();
      if (id) vendeurs[id] = v;
    });

    const map = {};

    function ticketDay(t) {
      if (t.dateLabel) {
        const p = String(t.dateLabel).split("/");
        if (p.length === 3) {
          return p[2] + "-" + p[1].padStart(2, "0") + "-" + p[0].padStart(2, "0");
        }
      }

      const d = new Date(t.createdAt || Date.now());
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    }

    for (const t of tickets) {
      const d = ticketDay(t);

      if (start && d < start) continue;
      if (end && d > end) continue;

      const id = String(t.vendeur || "").trim().toUpperCase();
      if (!id) continue;

      const vendor = normalizeVendor(vendeurs[id] || {});
      const status = String(t.status || "").trim().toUpperCase();

      if (!map[id]) {
        map[id] = {
          id,
          nombre: vendor.nombre || vendor.nom || id,
          zona: vendor.zona || vendor.groupe || "",
          venta: 0,
          comision: 0,
          comisionGrupo: 0,
          premios: 0,
          resultado: 0,
          estatus: vendor.estatus || "Activo"
        };
      }

      if (status !== "ANILE") {
        map[id].venta += parseAmount(t.total);
      }

      if (status === "GANYE") {
        const vendorConfig = vendeurs[id] || {};
        let realPremio = 0;

        for (const j of t.jeux || []) {
          const tirage = await Sorteo.findOne({
            date: String(t.dateLabel || "").trim(),
            loteria: {
              $regex: "^" + String(j.loterie || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
              $options: "i"
            }
          }).lean();

          if (tirage) {
            realPremio += getGainAdmin(j, tirage, vendorConfig);
          }
        }

        map[id].premios += realPremio;
      }
    }

    Object.keys(map).forEach(id => {
      const vendor = normalizeVendor(vendeurs[id] || {});

      const rate = parseAmount(
        vendor.comision?.general ??
        vendor.comisionGeneral ??
        vendor.com_general ??
        0
      );

      const rateGrupo = parseAmount(
        vendor.comision?.zona ??
        vendor.comisionZona ??
        vendor.com_zona ??
        0
      );

      map[id].comision = (parseAmount(map[id].venta) * rate) / 100;
      map[id].comisionGrupo = (parseAmount(map[id].venta) * rateGrupo) / 100;

      // RESULTADO PA RETIRE COMISION GRUPO
      map[id].resultado =
        parseAmount(map[id].venta) -
        parseAmount(map[id].comision) -
        parseAmount(map[id].premios);
    });

    const finalRows = Object.values(map).filter(r =>
  parseAmount(r.venta) > 0
);

res.json(finalRows);

  } catch (err) {
    console.error("Erreur ventas:", err);
    res.status(500).json([]);
  }
});

router.get("/api/reportes/balance", async (req, res) => {
  try {
    const date = String(req.query.date || "").trim();

    function toISODate(value) {
      if (!value) return "";
      const s = String(value).trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

      const p = s.split("/");
      if (p.length === 3) {
        return p[2] + "-" + p[1].padStart(2, "0") + "-" + p[0].padStart(2, "0");
      }

      const d = new Date(s);
      if (isNaN(d.getTime())) return "";

      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    }

    function movementEffect(m) {
      const tipo = String(m.tipo || "").toLowerCase();
      const monto = parseAmount(m.monto);
      return tipo === "cobro" ? monto : -monto;
    }

    function ticketDay(t) {
      if (t.dateLabel) return toISODate(t.dateLabel);

      const d = new Date(t.createdAt || Date.now());
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    }

    const selectedDate = date || toISODate(new Date());

    const vendorsArr = await Vendor.find().lean();
    const tickets = await Ticket.find().lean();

    const vendeurs = {};
    vendorsArr.forEach(v => {
      const id = String(v.id || "").trim().toUpperCase();
      if (id) vendeurs[id] = v;
    });

    const map = {};

    Object.keys(vendeurs).forEach((id) => {
      const vendor = normalizeVendor(vendeurs[id] || {});
      const movimientos = Array.isArray(vendor.movimientos) ? vendor.movimientos : [];

      const allMovementsTotal = movimientos.reduce((s, m) => {
        return s + movementEffect(m);
      }, 0);

      const baseBalance = parseAmount(vendor.balance) - allMovementsTotal;

      const movementsUntilDate = movimientos.reduce((s, m) => {
        const d = toISODate(m.fecha);
        if (selectedDate && d && d > selectedDate) return s;
        return s + movementEffect(m);
      }, 0);

      const filteredMovements = movimientos.filter(m => {
        const d = toISODate(m.fecha);
        if (selectedDate && d && d > selectedDate) return false;
        return true;
      });

      map[id] = {
        id,
        nombre: vendor.nombre || vendor.nom || id,
        zona: vendor.zona || vendor.groupe || "",
        balance: baseBalance + movementsUntilDate,
        estatus: vendor.estatus || "Activo",

        collectionsLivrees: filteredMovements
          .filter(m => String(m.tipo || "").toLowerCase() !== "cobro")
          .map(m => ({
            fecha: toISODate(m.fecha),
            monto: parseAmount(m.monto),
            tipo: String(m.tipo || "")
          })),

        paiementsRecus: filteredMovements
          .filter(m => String(m.tipo || "").toLowerCase() === "cobro")
          .map(m => ({
            fecha: toISODate(m.fecha),
            monto: parseAmount(m.monto),
            tipo: String(m.tipo || "")
          }))
      };
    });

    for (const t of tickets) {
      const id = String(t.vendeur || "").trim().toUpperCase();
      if (!id) continue;

      const d = ticketDay(t);
      if (selectedDate && d && d > selectedDate) continue;

      if (!map[id]) {
        map[id] = {
          id,
          nombre: id,
          zona: "",
          balance: 0,
          estatus: "Activo",
          collectionsLivrees: [],
          paiementsRecus: []
        };
      }

      const vendor = normalizeVendor(vendeurs[id] || {});
      const rate = getCommissionRate(vendor);
      const status = String(t.status || "").trim().toUpperCase();

      if (status !== "ANILE") {
        const venta = parseAmount(t.total);
        const comision = (venta * rate) / 100;

        let premios = 0;

        if (status === "GANYE") {
          const vendorConfig = vendeurs[id] || {};

          for (const j of t.jeux || []) {
            const tirage = await Sorteo.findOne({
              date: String(t.dateLabel || "").trim(),
              loteria: {
                $regex: "^" + String(j.loterie || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
                $options: "i"
              }
            }).lean();

            if (tirage) {
              premios += getGainAdmin(j, tirage, vendorConfig);
            }
          }
        }

        map[id].balance += venta - comision - premios;
      }
    }

    res.json(Object.values(map));

  } catch (err) {
    console.error("Erreur balance:", err);
    res.status(500).json([]);
  }
});

router.post("/api/vendors", async (req, res) => {
  try {
    const body = req.body || {};
    const id = String(body.id || "").trim().toUpperCase();

    if (!id) {
      return res.status(400).json({ ok: false, message: "ID obligatoire" });
    }

    const data = normalizeVendor(body);

    if (!data.nombre) {
      return res.status(400).json({ ok: false, message: "Nombre obligatoire" });
    }

    if (!data.clave) {
      return res.status(400).json({ ok: false, message: "Clave obligatoire" });
    }

    const exists = await Vendor.findOne({ id: id });

    if (exists) {
      return res.status(409).json({ ok: false, message: "ID déjà existant" });
    }

    await Vendor.create({
      id: id,
      ...data
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur save vendor Mongo:", err);
    res.status(500).json({ ok: false, message: "Erreur save vendor" });
  }
});

router.put("/api/vendors/:id", async (req, res) => {
  try {
    const oldId = String(req.params.id || "").trim().toUpperCase();
    const body = req.body || {};
    const newId = String(body.id || "").trim().toUpperCase();

    if (!oldId || !newId) {
      return res.status(400).json({ ok: false, message: "ID invalide" });
    }

    const data = normalizeVendor(body);

    if (!data.nombre) {
      return res.status(400).json({ ok: false, message: "Nombre obligatoire" });
    }

    if (!data.clave) {
      return res.status(400).json({ ok: false, message: "Clave obligatoire" });
    }

    const vendor = await Vendor.findOne({ id: oldId });

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendeur introuvable" });
    }

    if (oldId !== newId) {
      const exists = await Vendor.findOne({ id: newId });
      if (exists) {
        return res.status(409).json({ ok: false, message: "Nouvel ID déjà existant" });
      }
    }

    await Vendor.updateOne(
      { id: oldId },
      {
        $set: {
          id: newId,
          ...data
        }
      }
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("Erreur update vendor Mongo:", err);
    res.status(500).json({ ok: false, message: "Erreur update vendor" });
  }
});

router.get("/ventas-document", async (req, res) => {
  try {
    const start = String(req.query.start || "").trim();
    const end = String(req.query.end || "").trim();
    const zonaFilter = String(req.query.zona || "").trim();
    const vendorFilter = String(req.query.vendor || "").trim();
    const comisionFilter = String(req.query.comision || "").trim();

    const type = String(req.query.type || "").trim();

    const query =
      "/api/reportes/ventas?start=" + encodeURIComponent(start) +
      "&end=" + encodeURIComponent(end);

    const vendorsArr = await Vendor.find().lean();
    const tickets = await Ticket.find().lean();

    const vendeurs = {};
    vendorsArr.forEach(v => {
      const id = String(v.id || "").trim().toUpperCase();
      if(id) vendeurs[id] = v;
    });

    function money(v){
      return Number(v || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function toFRDate(iso){
      if(!iso) return "";
      const p = String(iso).split("-");
      if(p.length !== 3) return iso;
      return p[2] + "/" + p[1] + "/" + p[0];
    }

    function ticketDay(t){
      if(t.dateLabel){
        const p = String(t.dateLabel).split("/");
        if(p.length === 3){
          return p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
        }
      }

      const d = new Date(t.createdAt || Date.now());
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2,"0") + "-" +
        String(d.getDate()).padStart(2,"0");
    }

    const map = {};

    for(const t of tickets){
      const d = ticketDay(t);
      if(start && d < start) continue;
      if(end && d > end) continue;

      const id = String(t.vendeur || "").trim().toUpperCase();
      if(!id) continue;

      const vendor = vendeurs[id] || {};
      const zona = String(vendor.zona || vendor.groupe || "").trim();

      if(zonaFilter && zona !== zonaFilter) continue;
      if(vendorFilter && id !== vendorFilter) continue;

      const status = String(t.status || "").trim().toUpperCase();
      if(status === "ANILE") continue;

      const rate = parseAmount(
        vendor?.comision?.general ??
        vendor?.comisionGeneral ??
        vendor?.com_general ??
        0
      );

      const rateGrupo = parseAmount(
        vendor?.comision?.zona ??
        vendor?.comisionZona ??
        vendor?.com_zona ??
        0
      );

      if(comisionFilter && Number(comisionFilter) !== Number(rate)) continue;

      if(!map[id]){
        map[id] = {
          id,
          nombre: vendor.nombre || vendor.nom || t.vendeurNom || id,
          zona,
          venta: 0,
          comisionGrupo: 0,
          comision: 0,
          premios: 0,
          resultado: 0,
          rate,
          rateGrupo
        };
      }

      map[id].venta += parseAmount(t.total);

      if(status === "GANYE"){
        map[id].premios += parseAmount(t.premio);
      }
    }

    const rows = Object.values(map).map(r => {
      r.comisionGrupo = zonaFilter ? (r.venta * r.rateGrupo) / 100 : 0;
      r.comision = (r.venta * r.rate) / 100;
      r.resultado = r.venta - r.comision - r.premios;
      return r;
    }).sort((a,b) => b.resultado - a.resultado);

    let totalVenta = 0;
    let totalComisionGrupo = 0;
    let totalComision = 0;
    let totalPremios = 0;
    let totalResultado = 0;

    const rowsHtml = rows.map((r, i) => {
      totalVenta += r.venta;
      totalComisionGrupo += r.comisionGrupo;
      totalComision += r.comision;
      totalPremios += r.premios;
      totalResultado += r.resultado;

      return `
        <tr>
          <td>${i + 1}) ${r.nombre}</td>
          <td>${money(r.venta)}</td>
          <td>${money(r.comisionGrupo)}</td>
          <td>${money(r.comision)}</td>
          <td>${money(r.premios)}</td>
          <td>${money(r.resultado)}</td>
        </tr>
      `;
    }).join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Rapport Ventas</title>

<style>
body{
  font-family: Arial, Helvetica, sans-serif;
  margin:0;
  background:#f2f2f2;
  color:#000;
}

.paper{
  background:#fff;
  max-width:1200px;
  margin:0 auto;
  padding:45px;
  min-height:100vh;
  box-sizing:border-box;
}

.top-actions{
  display:flex;
  justify-content:flex-end;
  margin-bottom:25px;
}

.top-actions button{
  background:#111;
  color:#fff;
  border:none;
  border-radius:10px;
  padding:14px 22px;
  font-size:16px;
}

h1{
  font-size:38px;
  margin:0 0 18px 0;
}

.info{
  font-size:24px;
  margin-bottom:35px;
  line-height:1.35;
}

table{
  width:100%;
  border-collapse:collapse;
  font-size:22px;
}

th, td{
  border:2px solid #333;
  padding:14px 12px;
}

th{
  background:#dcdcdc;
  text-align:left;
}

td:nth-child(n+2),
th:nth-child(n+2){
  text-align:right;
}

tfoot td{
  font-weight:900;
  background:#eee;
}

@media(max-width:800px){
  .paper{
    padding:22px;
  }

  h1{
    font-size:28px;
  }

  .info{
    font-size:18px;
  }

  table{
    font-size:14px;
  }

  th, td{
    padding:9px 7px;
  }
}

@media print{
  body{
    background:#fff;
  }

  .paper{
    max-width:100%;
    padding:20px;
  }

  .top-actions{
    display:none;
  }
}
</style>
</head>

<body>
<div class="paper">

  <div class="top-actions">
    <button onclick="window.print()">Imprimer / PDF</button>
  </div>

  <h1>NUMBER ONE - Rapport Ventas</h1>

  <div class="info">
    <div><strong>Zone :</strong> ${zonaFilter || "TOUTES"}</div>
    <div><strong>Periode :</strong> ${toFRDate(start)} - ${toFRDate(end)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Vendeur</th>
        <th>Vente</th>
        <th>Comisión Grupo</th>
        <th>Comisión</th>
        <th>Premios</th>
        <th>Resultado</th>
      </tr>
    </thead>

    <tbody>
      ${rowsHtml || `<tr><td colspan="6">Pa gen done pou filtè sa yo</td></tr>`}
    </tbody>

    <tfoot>
      <tr>
        <td>TOTAL</td>
        <td>${money(totalVenta)}</td>
        <td>${money(totalComisionGrupo)}</td>
        <td>${money(totalComision)}</td>
        <td>${money(totalPremios)}</td>
        <td>${money(totalResultado)}</td>
      </tr>
    </tfoot>
  </table>

</div>
</body>
</html>
    `);

  } catch(err){
    console.error("VENTAS DOCUMENT ERROR:", err);
    res.status(500).send("Erreur rapport ventas");
  }
});

router.delete("/api/vendors/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();

    const vendor = await Vendor.findOne({ id });

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendeur introuvable" });
    }

    // ✅ Efase tout tickets vendor sa nèt
    await Ticket.deleteMany({
      $or: [
        { vendeur: id },
        { sellerId: id },
        { vendorId: id }
      ]
    });

    // ✅ Efase vendor a nèt
    await Vendor.deleteOne({ id });

    res.json({ ok: true, message: "Vendeur et tickets supprimés" });

  } catch (err) {
    console.error("Erreur delete vendor:", err);
    res.status(500).json({ ok: false, message: "Erreur delete vendor" });
  }
});

router.post("/api/vendors/:id/connections/:index/unblock", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();
    const index = Number(req.params.index);

    const vendor = await Vendor.findOne({ id });

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendeur introuvable" });
    }

    if (!Array.isArray(vendor.conexiones)) vendor.conexiones = [];

    if (!vendor.conexiones[index]) {
      return res.status(404).json({ ok: false, message: "Connexion introuvable" });
    }

    // ✅ Debloque sèlman, pa efase anyen
    vendor.conexiones[index].co = true;
    vendor.conexiones[index].on = true;
    vendor.conexiones[index].st = true;
    vendor.conexiones[index].last = new Date().toLocaleString("fr-FR");

    vendor.estatus = "Activo";
    vendor.conexion = vendor.conexiones[index].last;

    vendor.markModified("conexiones");
    await vendor.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur déblocage connexion:", err);
    res.status(500).json({ ok: false, message: "Erreur déblocage connexion" });
  }
});

router.delete("/api/vendors/:id/movimientos/:movId", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();
    const movId = Number(req.params.movId);

    const vendor = await Vendor.findOne({ id });
    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendeur introuvable" });
    }

    if (!Array.isArray(vendor.movimientos)) {
      vendor.movimientos = [];
    }

    const index = vendor.movimientos.findIndex(m => Number(m.id) === movId);

    if (index === -1) {
      return res.status(404).json({ ok: false, message: "Transaction introuvable" });
    }

    // 🔥 retire movement
    const removed = vendor.movimientos.splice(index, 1)[0];

    // 🔥 REAJISTE BALANCE
if (removed.tipo === "pago") {
  vendor.balance -= removed.monto;
} else {
  vendor.balance += removed.monto;
}

    await vendor.save();

    res.json({ ok: true, balance: vendor.balance });

  } catch (err) {
    console.error("Erreur delete transaction:", err);
    res.status(500).json({ ok: false });
  }
});

router.delete("/api/vendors/:id/connections/:index", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();
    const index = Number(req.params.index);

    const vendor = await Vendor.findOne({ id });

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendeur introuvable" });
    }

    if (!Array.isArray(vendor.conexiones)) vendor.conexiones = [];

    if (!vendor.conexiones[index]) {
      return res.status(404).json({ ok: false, message: "Connexion introuvable" });
    }

    vendor.conexiones.splice(index, 1);

    if (vendor.conexiones.length === 0) {
      vendor.conexion = "";
      vendor.estatus = "Activo";
    }

    vendor.markModified("conexiones");
    await vendor.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur suppression connexion:", err);
    res.status(500).json({ ok: false, message: "Erreur suppression connexion" });
  }
});

router.post("/api/vendors/:id/balance-action", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();
    const { tipo, monto, fecha, comentario } = req.body;

    const vendor = await Vendor.findOne({ id });

    if (!vendor) {
      return res.status(404).json({ ok: false });
    }

    if (!Array.isArray(vendor.movimientos)) {
      vendor.movimientos = [];
    }

    const now = new Date();

    const movement = {
      id: Date.now(),
      tipo,
      monto: parseAmount(monto),
      fecha: fecha || todayFR(),
      hora: now.getHours().toString().padStart(2,"0") + ":" + now.getMinutes().toString().padStart(2,"0"),
      comentario: comentario || ""
    };

    // 🔥 AJUSTE BALANCE

if (tipo === "pago") {
  vendor.balance = parseAmount(vendor.balance) + movement.monto;
} else if (tipo === "cobro") {
  vendor.balance = parseAmount(vendor.balance) - movement.monto;
} else {
  vendor.balance = parseAmount(vendor.balance) - movement.monto;
}

    vendor.movimientos.push(movement);

    vendor.markModified("movimientos");
    await vendor.save();

    res.json({ ok: true, balance: vendor.balance });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

function writeTicketsArray(data) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(data, null, 2), "utf8");
}

router.get("/api/reportes/tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 }).lean();

    const vendorsArr = await Vendor.find().lean();
    const vendeurs = {};

    vendorsArr.forEach(v => {
      const id = String(v.id || "").trim().toUpperCase();
      if (id) vendeurs[id] = v;
    });

    const cleanTickets = [];

    for (const t of tickets) {
      const realId = t.id || t.ticketId || t.serial || String(t._id || "");
      const vendorId = String(t.vendeur || "").trim().toUpperCase();
      const vendorConfig = vendeurs[vendorId] || {};

      let totalGain = 0;

      const jeux = [];
      for (const j of t.jeux || []) {
        const tirage = await Sorteo.findOne({
          date: String(t.dateLabel || "").trim(),
          loteria: {
            $regex: "^" + String(j.loterie || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
            $options: "i"
          }
        }).lean();

        const gain = tirage ? getGainAdmin(j, tirage, vendorConfig) : 0;
        totalGain += gain;

        jeux.push({
          ...j,
          gain: gain,
          gainLabel: money(gain)
        });
      }

      cleanTickets.push({
        ...t,
        id: realId,
        ticketId: realId,
        serial: realId,
        jeux: jeux,
        premio: totalGain,
        premioLabel: money(totalGain)
      });
    }

    res.json(cleanTickets);

  } catch (err) {
    console.error("Erreur report tickets Mongo:", err.message);
    res.status(500).json([]);
  }
});


router.post("/api/tickets/:id/anile", async (req, res) => {
  try {
    const ticketId = String(req.params.id || "").trim();

    const ticket = await Ticket.findOneAndUpdate(
      { id: ticketId },
      {
        status: "ANILE",
        anilePar: "ADMIN",
        anileAt: new Date().toISOString()
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ ok: false, message: "Ticket introuvable" });
    }

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error("Erreur anile ticket Mongo:", err.message);
    res.status(500).json({ ok: false, message: "Erreur anile ticket" });
  }
});

router.get("/master/ticket/:id", async (req, res) => {
  try {
    const ticketId = String(req.params.id || "").trim();

    const ticket = await Ticket.findOne({
      $or: [
        { id: ticketId },
        { ticketId: ticketId },
        { serial: ticketId }
      ]
    }).lean();

    if (!ticket) {
      return res.send("Ticket introuvable");
    }

    const jeux = Array.isArray(ticket.jeux) ? ticket.jeux : [];

    const dateTime =
      ticket.createdAtLabel ||
      ((ticket.dateLabel || "") +
      (ticket.timeLabel ? " " + ticket.timeLabel : ""));

    const lignes = jeux.map((j) => {
      const gain = Number(j.gain || 0);

      return "<tr>" +
        "<td>" + (j.loterie || "") + "</td>" +
        "<td>" + (j.type || "") + "</td>" +
        "<td>" +
          (j.numero || "") +
          (gain > 0
            ? " <span class='gain'>+" +
              formatAmount(gain) +
              "</span>"
            : "") +
        "</td>" +
        "<td>" + formatAmount(j.montant || j.monto || j.amount || 0) + "</td>" +
      "</tr>";
    }).join("");

    res.send(
      "<html>" +

      "<head>" +
      "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +

      "<style>" +

      "body{" +
      "font-family:Arial;" +
      "background:#1c2037;" +
      "color:white;" +
      "padding:14px" +
      "}" +

      "a,a:visited,a:hover,a:active{" +
      "color:white!important;" +
      "text-decoration:none!important" +
      "}" +

      ".card{" +
      "background:#2a2f4a;" +
      "border-radius:14px;" +
      "padding:16px" +
      "}" +

      "table{" +
      "width:100%;" +
      "border-collapse:collapse;" +
      "margin-top:12px" +
      "}" +

      "th,td{" +
      "padding:10px;" +
      "border-bottom:1px solid #444;" +
      "text-align:left" +
      "}" +

      ".gain{" +
      "background:#00ff66;" +
      "color:#003b12;" +
      "padding:4px 10px;" +
      "border-radius:10px;" +
      "font-weight:900;" +
      "font-size:15px;" +
      "display:inline-block;" +
      "margin-left:6px" +
      "}" +

      ".premio-total{" +
      "color:#00ff66;" +
      "font-weight:900;" +
      "font-size:20px;" +
      "text-shadow:0 0 10px rgba(0,255,102,0.7)" +
      "}" +

      "button{" +
      "width:100%;" +
      "height:48px;" +
      "border:0;" +
      "border-radius:10px;" +
      "margin-top:14px;" +
      "font-size:17px;" +
      "font-weight:700" +
      "}" +

      ".red{" +
      "background:#ff5555;" +
      "color:white" +
      "}" +

      ".gray{" +
      "background:#444b70;" +
      "color:white" +
      "}" +

      "</style>" +
      "</head>" +

      "<body>" +

      "<div class='card'>" +

      "<h2>Ticket " + ticket.id + "</h2>" +

      "<div><b>Vendeur:</b> " +
      (ticket.vendeurNom || ticket.vendeur || "") +
      "</div>" +

      "<div><b>Date:</b> " +
      dateTime +
      "</div>" +

      "<div><b>Total:</b> " +
      formatAmount(ticket.total || 0) +
      "</div>" +

      "<div><b>Total jwe:</b> " +
      jeux.length +
      "</div>" +

      "<div style='margin-top:8px'>" +
      "<b>Premio:</b> " +
      "<span class='premio-total'>" +
      (ticket.premioLabel || formatAmount(ticket.premio || 0)) +
      "</span>" +
      "</div>" +

      "<table>" +

      "<thead>" +
      "<tr>" +
      "<th>Loteria</th>" +
      "<th>Jugada</th>" +
      "<th>Numero</th>" +
      "<th>Monto</th>" +
      "</tr>" +
      "</thead>" +

      "<tbody>" +
      lignes +
      "</tbody>" +

      "</table>" +

      "<form method='POST' action='/master/ticket/" +
      encodeURIComponent(ticket.id) +
      "/anile'>" +

      "<button class='red' type='submit'>" +
      "ANILE TICKET" +
      "</button>" +

      "</form>" +

      "<button class='gray' onclick='window.close()'>" +
      "TOUNEN" +
      "</button>" +

      "</div>" +
      "</body>" +
      "</html>"
    );

  } catch (err) {
    console.error("Erreur master ticket:", err);
    res.send("Erreur serveur");
  }
});

router.post("/master/ticket/:id/anile", async (req, res) => {
  const ticketId = String(req.params.id || "").trim();

  const ticket = await Ticket.findOneAndUpdate(
    { id: ticketId },
    {
      status: "ANILE",
      anilePar: "ADMIN",
      anileAt: new Date().toISOString()
    },
    { new: true }
  );

  if (!ticket) {
    return res.send("Ticket introuvable");
  }

  res.send(`
    <html>
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>

  <body style="font-family:Arial;background:#1c2037;color:white;padding:20px;text-align:center">

    <h2 style="margin-top:100px;font-size:34px;">
      Ticket annulé ✅
    </h2>

   <button
      onclick="
        if (window.opener) {
          window.opener.location.href = '/master/vendors#tickets&reload=' + Date.now();
        }
        window.close();
      "
  style="margin-top:50px;height:65px;width:95%;font-size:22px;border-radius:10px;">
  RETOUNEN
</button>
    </body>
    </html>
  `);
});

function normalizeText(v) {
  return String(v || "").trim().toUpperCase();
}

function isWinningGame(j, result) {
  const type = normalizeText(j.type);
  const played = normalizeText(j.numero).replace(/\s+/g, "");

  const tet = normalizeText(result.r1);
  const lo1 = normalizeText(result.r2);
  const lo2 = normalizeText(result.r3);
  const lo3 = normalizeText(result.r4);

  if (!played) return false;

  if (type === "BOR" || type === "BORLETTE") {
    return [tet, lo1, lo2, lo3].includes(played);
  }

  if (type === "L3" || type === "LOTO3") {
    return (tet + lo1) === played;
  }

  if (type === "MAR" || type === "MARIAGE") {
    const playedParts = played.split("*").map(normalizeText).sort().join("*");

    const combos = [
      [tet, lo1],
      [tet, lo2],
      [tet, lo3],
      [lo1, lo2],
      [lo1, lo3],
      [lo2, lo3]
    ].map(x => x.sort().join("*"));

    return combos.includes(playedParts);
  }

  return false;
}

async function runCheckTickets(date, loteries = []) {

  const tickets = await Ticket.find({
    status: { $ne: "ANILE" },
    dateLabel: String(date || "").trim(),
    tirages: {
      $in: loteries.map(l =>
        String(l || "").trim().toUpperCase()
      )
    }
  });

  let checked = 0;

  for (const ticket of tickets) {

    if (String(ticket.status || "").trim().toUpperCase() === "ANILE") {
      continue;
    }

    let hasResult = false;
    let isWinner = false;
    let totalPremio = 0;

    const vendor = await Vendor.findOne({
      id: String(ticket.vendeur || "").trim().toUpperCase()
    }).lean();

    const vendorConfig = vendor || {};

    for (const jeu of ticket.jeux || []) {

      jeu.gain = 0;

      const loteria = String(jeu.loterie || "").trim().toUpperCase();

      const tirage = await Sorteo.findOne({
        date: String(date || "").trim(),
        loteria: {
          $regex:
            "^" +
            loteria.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
            "$",
          $options: "i"
        }
      }).lean();

      if (!tirage) continue;

      const hasBalls =
        String(tirage.r1 || "").trim() ||
        String(tirage.r2 || "").trim() ||
        String(tirage.r3 || "").trim() ||
        String(tirage.r4 || "").trim();

      if (!hasBalls) continue;

      hasResult = true;

      const gain = getGainAdmin(jeu, tirage, vendorConfig);

      if (gain > 0) {
        jeu.gain = gain;
        isWinner = true;
        totalPremio += gain;
      }
    }

    ticket.status =
      !hasResult
        ? "ANATAN"
        : (isWinner ? "GANYE" : "PEDI");

    ticket.premio = isWinner ? totalPremio : 0;

    ticket.updatedAt = new Date();

    await Ticket.updateOne(
      { _id: ticket._id },
      {
        $set: {
          jeux: ticket.jeux,
          status: ticket.status,
          premio: ticket.premio,
          updatedAt: new Date()
        }
      }
    );

    checked++;
  }

  console.log("✅ Tickets vérifiés:", checked);
}

router.get("/api/sorteos", async (req, res) => {
  try {
    const rows = await Sorteo.find().lean();
    const obj = {};

    rows.forEach(r => {
      const frDate = toFRDate(r.date);
      const isoDate = toISODate(r.date);
      const loteria = String(r.loteria || "").trim().toUpperCase();

      if (!frDate || !loteria) return;

      if (!obj[frDate]) obj[frDate] = {};
      if (!obj[isoDate]) obj[isoDate] = {};

      const data = {
        r1: r.r1 || "",
        r2: r.r2 || "",
        r3: r.r3 || "",
        r4: r.r4 || "",
        updatedAt: r.updatedAt || ""
      };

      obj[frDate][loteria] = data;
      obj[isoDate][loteria] = data;
    });

    res.json(obj);
  } catch (err) {
    console.error("Erreur get sorteos Mongo:", err);
    res.status(500).json({});
  }
});

function toFRDate(value) {
  if (!value) return "";

  const s = String(value).trim();

  // 2026-05-07 -> 07/05/2026
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const p = s.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  return s;
}

function toISODate(value) {
  if (!value) return "";

  const s = String(value).trim();

  // 07/05/2026 -> 2026-05-07
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const p = s.split("/");
    return p[2] + "-" + p[1] + "-" + p[0];
  }

  return s;
}

router.post("/api/sorteos/save", async (req, res) => {
  try {
    const body = req.body || {};
    const rawDate = String(body.date || "").trim();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    function toFRDate(value) {
      if (!value) return "";

      const s = String(value).trim();

      // 2026-05-02 -> 02/05/2026
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const p = s.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
      }

      // si li deja 02/05/2026
      return s;
    }

    const date = toFRDate(rawDate);

    if (!date) {
      return res.status(400).json({ ok: false, message: "Date obligatoire" });
    }

    for (const r of rows) {
      const loteria = String(r.loteria || "").trim().toUpperCase();
      if (!loteria) continue;

      await Sorteo.findOneAndUpdate(
        { date: date, loteria: loteria },
        {
          $set: {
            date: date,
            loteria: loteria,
            r1: String(r.r1 || "").trim(),
            r2: String(r.r2 || "").trim(),
            r3: String(r.r3 || "").trim(),
            r4: String(r.r4 || "").trim()
          }
        },
        { upsert: true, new: true }
      );
    }

await runCheckTickets(
  date,
  rows.map(r => String(r.loteria || "").trim().toUpperCase())
);

    res.json({ ok: true, date: date });

  } catch (err) {
    console.error("Erreur save sorteos Mongo:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});



router.delete("/api/sorteos/:date/:loteria", async (req, res) => {
  try {
    function toFRDate(value) {
      if (!value) return "";

      const s = String(value).trim();

      // 2026-05-02 → 02/05/2026
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const p = s.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
      }

      return s;
    }

    const date = toFRDate(req.params.date);
    const loteria = String(req.params.loteria || "").trim().toUpperCase();

   await Sorteo.deleteOne({ date, loteria });

await runCheckTickets(date, [loteria]);

res.json({ ok: true });


  } catch (err) {
    console.error("Erreur delete sorteos Mongo:", err);
    res.status(500).json({ ok: false, message: "Erreur delete sorteos" });
  }
});

router.get("/api/loterias", async (req, res) => {
  try {
    let rows = await Loteria.find().sort({ closeTime: 1 }).lean();

    if (!rows.length) {
      const defaults = [
        ["TENNESSE MORNING", "TNM", "00:00", "11:55"],
        ["TEXAS MORNING", "TXM", "00:00", "11:55"],
        ["GEORGIA MIDDAY", "GAM", "00:00", "12:25"],
        ["FLORIDA MIDDAY", "FLM", "00:00", "13:25"],
        ["NEW YORK MIDDAY", "NYM", "00:00", "14:25"],
        ["TEXAS EVENING", "TXE", "00:00", "18:25"],
        ["GEORGIA EVENING", "GAE", "00:00", "18:50"],
        ["TENNESSE EVENING", "TNE", "00:00", "19:25"],
        ["FLORIDA EVENING", "FLE", "00:00", "21:30"],
        ["NEW YORK EVENING", "NYE", "00:00", "22:25"],
        ["GEORGIA NIGHT", "GAN", "00:00", "23:15"]
      ];

      await Loteria.insertMany(defaults.map(function(x){
        return {
          name: x[0],
          abrev: x[1],
          openTime: x[2],
          closeTime: x[3],
          closeDays: {
            monday: x[3],
            tuesday: x[3],
            wednesday: x[3],
            thursday: x[3],
            friday: x[3],
            saturday: x[3],
            sunday: x[3]
          },
          estatus: "Activo",
          limite: false,
          pago: true
        };
      }));

      rows = await Loteria.find().sort({ closeTime: 1 }).lean();
    }

    res.json(rows);
  } catch (err) {
    console.error("GET LOTERIAS ERROR:", err);
    res.status(500).json([]);
  }
});

router.post("/api/loterias/:id", async (req, res) => {
  try {
    const closeTime = String(req.body.closeTime || "23:59");

    const data = {
      name: String(req.body.name || "").trim().toUpperCase(),
      abrev: String(req.body.abrev || "").trim().toUpperCase(),
      estatus: String(req.body.estatus || "Activo"),
      openTime: String(req.body.openTime || "00:00"),
      closeTime: closeTime,
      closeDays: req.body.closeDays || {
        monday: closeTime,
        tuesday: closeTime,
        wednesday: closeTime,
        thursday: closeTime,
        friday: closeTime,
        saturday: closeTime,
        sunday: closeTime
      },
      limite: req.body.limite === true,
      pago: req.body.pago !== false
    };

    if (!data.name) {
      return res.status(400).json({ ok:false, message:"Nombre obligatoire" });
    }

    const row = await Loteria.findByIdAndUpdate(
      req.params.id,
      { $set:data },
      { new:true }
    );

    if (!row) {
      return res.status(404).json({ ok:false, message:"Lotería pa jwenn" });
    }

    res.json({ ok:true, loteria:row });
  } catch (err) {
    console.error("SAVE LOTERIA ERROR:", err);
    res.status(500).json({ ok:false, message:"Erreur save lotería" });
  }
});

router.get("/api/app-config", async (req, res) => {

  try {

    let config = await AppConfig.findOne({ key: "main" });

    if (!config) {
      config = await AppConfig.create({
        key: "main"
      });
    }

    res.json({
      ok: true,
      config
    });

  } catch (err) {

    console.error("APP CONFIG GET ERROR:", err);

    res.status(500).json({
      ok: false
    });

  }

});

router.post("/api/app-config", async (req, res) => {

  try {

    let config = await AppConfig.findOne({ key: "main" });

    if (!config) {
      config = await AppConfig.create({
        key: "main"
      });
    }

    config.ticketLogo = String(req.body.ticketLogo || "");

    config.ticketMessage = String(req.body.ticketMessage || "");

    config.mariageGratis = {
  enabled:
    req.body.mariageGratis &&
    req.body.mariageGratis.enabled === true,

  max: 5,
  stepAmount: 50,

  payout: Number(
    req.body.mariageGratis &&
    req.body.mariageGratis.payout
    ? req.body.mariageGratis.payout
    : 1000
  )
};

    await config.save();

    res.json({
      ok: true,
      config
    });

  } catch (err) {

    console.error("APP CONFIG SAVE ERROR:", err);

    res.status(500).json({
      ok: false
    });

  }

});

router.post(
  "/api/upload-logo",
  upload.single("logo"),
  async (req, res) => {

    try {

      const url =
        "/uploads/" + req.file.filename;

      res.json({
        ok: true,
        url
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        ok: false
      });

    }

  }
);

router.get("/master/vendors", async (req, res) => {

  const appConfig =
    await AppConfig.findOne({ key: "main" }).lean()
    || {};

  const logoUrl =
    appConfig.ticketLogo || "";

  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Master Ventas</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{
 font-family:Arial,sans-serif;
 background:linear-gradient(180deg,#20243d 0%, #1c2037 100%);
 color:#d7dcef;
 min-height:100vh;
}
.hidden{display:none !important;}
.login-page{
 min-height:100vh;
 display:flex;
 align-items:center;
 justify-content:center;
 padding:24px;
}
.login-card{
 width:100%;
 max-width:760px;
 background:#313553;
 border-radius:18px;
 padding:34px 28px 26px;
 box-shadow:0 14px 35px rgba(0,0,0,.22);
}
.login-field-label{
 font-size:17px;
 color:#d7dbf1;
 margin-bottom:10px;
}
.login-input{
 width:100%;
 height:56px;
 border:none;
 outline:none;
 border-radius:12px;
 padding:0 16px;
 background:#23263f;
 color:#fff;
 font-size:18px;
 margin-bottom:18px;
}
.login-btn{
 width:100%;
 height:56px;
 border:none;
 border-radius:12px;
 background:linear-gradient(90deg,#6c6cff,#7a5cff);
 color:#fff;
 font-size:19px;
 font-weight:700;
 cursor:pointer;
 margin-top:10px;
}
.menu-overlay{
 position:fixed;
 inset:0;
 background:rgba(0,0,0,.35);
 display:none;
 z-index:999;
}
.menu-overlay.show{display:block;}
.side-menu{
 position:fixed;
 top:0;
 left:-320px;
 width:320px;
 max-width:88vw;
 height:100vh;
 background:#2b2f47;
 color:#c7cde0;
 z-index:1000;
 overflow-y:auto;
 transition:left .25s ease;
 padding:18px 18px 28px;
}
.side-menu.open{left:0;}
.side-menu-header{
 display:flex;
 align-items:center;
 justify-content:space-between;
 margin-bottom:22px;
}
.side-menu-logo-wrap{
 display:flex;
 align-items:center;
 gap:12px;
}
.side-menu-logo-img{
 width:58px;
 height:58px;
 border-radius:6px;
 object-fit:cover;
 background:#fff;
}
.side-menu-logo{
 font-size:18px;
 font-weight:700;
 color:#e4e8f2;
}
.side-menu-close{
 font-size:22px;
 cursor:pointer;
 color:#d5daea;
}
.side-menu-section{
 font-size:12px;
 color:#8f97b2;
 margin:18px 0 8px;
 letter-spacing:1px;
}
.side-menu-item{
 display:flex;
 align-items:center;
 justify-content:space-between;
 padding:14px 12px;
 border-radius:12px;
 cursor:pointer;
 color:#c7cde0;
 margin-bottom:4px;
}
.side-menu-item.active{
 background:linear-gradient(90deg,#6d63ff,#7d73ff);
 color:#fff;
}
.side-menu-item:hover{
 background:rgba(255,255,255,.05);
 color:#eef1f8;
}
.submenu-box{
 display:none;
 padding:4px 0 10px 18px;
}
.submenu-box.open{display:block;}
.submenu-item{
 padding:12px 10px;
 border-radius:10px;
 cursor:pointer;
 color:#bcc4da;
 margin-bottom:4px;
}
.submenu-item.active{
 background:linear-gradient(90deg,#6d63ff,#7d73ff);
 color:#fff;
}
.submenu-item:hover{
 background:rgba(255,255,255,.05);
 color:#eef1f8;
}
.app-page{
 min-height:100vh;
 padding:10px 8px 20px;
}
.topbar{
 display:flex;
 align-items:center;
 justify-content:space-between;
 gap:10px;
 background:#2a2f4a;
 border-radius:12px;
 padding:14px;
 margin-bottom:14px;
}
.top-left,.top-right{
 display:flex;
 align-items:center;
 gap:14px;
}
.icon-btn{
 font-size:26px;
 color:#d5daf8;
 user-select:none;
 cursor:pointer;
}
.clock-pill{
 background:#23343d;
 color:#52d07f;
 padding:9px 15px;
 border-radius:999px;
 font-size:18px;
 font-weight:700;
}
.avatar{
 width:42px;
 height:42px;
 border-radius:50%;
 background:#d9dbe7;
 display:flex;
 align-items:center;
 justify-content:center;
 font-size:20px;
 color:#444;
 position:relative;
}
.avatar::after{
 content:"";
 position:absolute;
 right:-1px;
 bottom:0;
 width:12px;
 height:12px;
 border-radius:50%;
 background:#59d26f;
 border:2px solid #2a2f4a;
}
.page-title{
 font-size:24px;
 font-weight:600;
 color:#d5dbef;
 margin:8px 2px 12px;
}
.filters{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:12px}
.filter-group{margin:0}
.filter-label,.date-range label{
 display:block;
 font-size:13px;
 font-weight:500;
 color:#bcc4de;
 margin:0 0 4px 2px;
}
.filter-input,.filter-select,.date-range input,.field-input,.field-select,.field-textarea{
 width:100%;
 border-radius:12px;
 border:1px solid rgba(255,255,255,.10);
 background:#2a2f4a;
 color:#d3d9ec;
 outline:none;
 box-shadow:none;
}
.filter-input,.filter-select,.date-range input{
 height:48px;
 padding:0 14px;
 font-size:16px;
}
.field-input,.field-select{
 height:52px;
 padding:0 16px;
 font-size:16px;
}
.field-textarea{
 min-height:120px;
 padding:12px 16px;
 font-size:16px;
 resize:vertical;
}
.date-range{display:flex;gap:6px}
.date-range > div{flex:1}
.table-card{
 background:#2a2f4a;
 border-radius:14px;
 overflow:hidden;
 box-shadow:0 6px 20px rgba(0,0,0,.12);
 margin-top:10px;
}
.table-scroll{
 overflow-x:auto;
 overflow-y:hidden;
 -webkit-overflow-scrolling:touch;
}
table{
 width:max-content;
 min-width:100%;
 border-collapse:collapse;
 font-size:14px;
}
thead th{
 background:#4a4f69;
 color:#c8cfe6;
 padding:12px 14px;
 font-size:14px;
 font-weight:600;
 text-align:left;
 white-space:nowrap;
 border-right:1px solid rgba(255,255,255,.08);
}
tbody td{
 padding:12px 14px;
 font-size:14px;
 font-weight:500;
 color:#bcc4de;
 border-top:1px solid rgba(255,255,255,.08);
 border-right:1px solid rgba(255,255,255,.06);
 white-space:nowrap;
 text-align:left;
 vertical-align:middle;
}
tbody tr:nth-child(even){background:#313652;}
.vendor-name{font-weight:600;color:#bcc4de;}
.money{color:#bcc4de;}
.result-ok{
 color:#2fbf71;
 font-weight:700;
 cursor:pointer;
}

.balance-positive{
 color:#2fbf71;
 font-weight:700;
 font-size:20px;
 cursor:pointer;
}

#transactionsPage .balance-positive{
 color:#7b72ff;
}

#ventasTable tfoot td {
  padding: 18px 14px;
  font-weight: 800;
  vertical-align: middle;
}

.result-bad,.balance-negative{
 color:#ff6767;
 font-weight:700;
 cursor:pointer;
}

.balance-negative{
  color:#ff6767;
  font-weight:800;
  font-size:20px !important;
  line-height:1;
  display:inline-block;
  cursor:pointer;
  position:relative;
  left:-7px;
}

.page-block{background:transparent;}
.action-row{
 display:flex;
 align-items:center;
 justify-content:space-between;
 gap:10px;
 margin:8px 0 12px;
}
.action-buttons{
 display:flex;
 gap:10px;
 margin-left:auto;
}
.square-btn{
 width:132px;
 height:72px;
 border-radius:14px;
 border:2px solid #3fc9e8;
 background:transparent;
 color:#3fc9e8;
 font-size:36px;
 line-height:1;
 cursor:pointer;
}
.square-btn.purple{
 border-color:#6d63ff;
 color:#6d63ff;
}
.vendor-filters{
 display:grid;
 grid-template-columns:1fr;
 gap:10px;
 margin-bottom:10px;
}
.clickable-row{cursor:pointer;}
.mini-btn{
 border:none;
 background:transparent;
 color:#7a6dff;
 font-size:22px;
 cursor:pointer;
}
.status-dot{
 font-size:18px;
 margin-right:8px;
}
.green{color:#54d46d;}
.gray{color:#969bb1;}
.editor-top-actions{
 display:flex;
 justify-content:flex-end;
 gap:12px;
 margin:6px 0 12px;
}
.editor-top-btn{
 width:132px;
 height:70px;
 border-radius:14px;
 background:transparent;
 cursor:pointer;
 font-size:18px;
 font-weight:700;
}
.editor-top-btn.back{
 border:2px solid #6d63ff;
 color:#6d63ff;
}
.editor-top-btn.save{
 border:2px solid #3fc9e8;
 color:#3fc9e8;
}
.tabs-scroll{
 overflow-x:auto;
 overflow-y:hidden;
 -webkit-overflow-scrolling:touch;
 margin-bottom:0;
}
.tabs{
 display:flex;
 min-width:max-content;
 background:#2a2f4a;
 border-radius:12px 12px 0 0;
 border-bottom:1px solid rgba(255,255,255,.08);
}
.tab{
 padding:18px 26px;
 font-size:18px;
 color:#d7dcef;
 white-space:nowrap;
 cursor:pointer;
 border-bottom:3px solid transparent;
}
.tab.active{
 color:#7b72ff;
 border-bottom-color:#7b72ff;
 font-weight:600;
}
.editor-card{
 background:#2a2f4a;
 border-radius:0 0 16px 16px;
 padding:18px 0 20px;
 box-shadow:0 6px 20px rgba(0,0,0,.12);
 margin-bottom:24px;
}
.editor-section{
 padding:0 18px;
}
.field-group{
 margin-bottom:18px;
}
.field-label{
 font-size:14px;
 color:#d7dcef;
 margin:0 0 8px 2px;
}
.hint{
 margin-top:6px;
 padding:12px 14px;
 font-size:12px;
 line-height:1.45;
 color:#8c7fff;
 background:#43436f;
 border-radius:0;
}
.switch-row{
 display:flex;
 align-items:center;
 gap:14px;
 margin:12px 0 10px;
}
.switch{
 position:relative;
 width:56px;
 height:32px;
 border-radius:999px;
 background:#424761;
 cursor:pointer;
 flex:0 0 auto;
}
.switch::after{
 content:"";
 position:absolute;
 left:4px;
 top:4px;
 width:24px;
 height:24px;
 border-radius:50%;
 background:#fff;
 transition:.2s;
}
.switch.on{
 background:linear-gradient(90deg,#6d63ff,#7d73ff);
}
.switch.on::after{
 left:28px;
}
.switch-label{
 font-size:17px;
 color:#d7dcef;
}
.triple-grid{
 display:grid;
 grid-template-columns:120px 1fr 1fr 1fr;
 gap:12px;
 align-items:center;
 margin-bottom:12px;
}
.triple-grid .game-name{
 font-size:17px;
 color:#d7dcef;
}
.mini-input{
 width:100%;
 height:52px;
 border-radius:12px;
 border:1px solid rgba(255,255,255,.10);
 background:#2a2f4a;
 color:#d3d9ec;
 padding:0 16px;
 font-size:16px;
 outline:none;
}
.empty-state{
 color:#9ea5cb;
 font-size:15px;
 text-align:center;
 padding:20px;
}
.conn-actions-wrap,.balance-actions-wrap{
 position:static;
 display:inline-block;
}
.conn-menu-btn,.balance-menu-btn{
 border:none;
 background:transparent;
 color:#cfd5f0;
 font-size:24px;
 cursor:pointer;
 line-height:1;
}

.balance-menu{
 display:none;
 position:fixed;
 min-width:180px;
 background:#3a3f5a;
 border-radius:12px;
 box-shadow:0 10px 28px rgba(0,0,0,.28);
 padding:8px 0;
 z-index:99999;
}
 .conn-menu.show,.balance-menu.show{
 display:block;
}
.conn-menu-item,.balance-menu-item{
 padding:12px 16px;
 cursor:pointer;
 font-size:16px;
 color:#e5e9f8;
}
.conn-menu-item:hover,.balance-menu-item:hover{
 background:rgba(255,255,255,.08);
}
.bool-on{
 color:#2fd0ff;
 font-weight:700;
 font-size:24px;
}
.bool-ok{
 color:#54d46d;
 font-weight:700;
 font-size:24px;
}
.bool-off{
 color:#8f96b5;
 font-weight:700;
 font-size:24px;
}
.refresh-row{
 display:flex;
 justify-content:flex-end;
 padding:0 18px 12px;
}
.refresh-btn{
 width:74px;
 height:74px;
 border-radius:50%;
 border:none;
 background:rgba(255,255,255,.05);
 color:#7b72ff;
 font-size:38px;
 cursor:pointer;
}
.modal-overlay{
 position:fixed;
 inset:0;
 background:rgba(0,0,0,.45);
 display:none;
 align-items:center;
 justify-content:center;
 z-index:12000;
 padding:18px;
}
.modal-card{
 width:100%;
 max-width:760px;
 background:#313553;
 border-radius:18px;
 padding:24px;
 position:relative;
}
.modal-close{
 position:absolute;
 top:10px;
 right:14px;
 font-size:34px;
 color:#d7dcef;
 cursor:pointer;
}
.modal-title{
 font-size:20px;
 margin-bottom:16px;
}
.modal-actions{
 display:flex;
 justify-content:flex-end;
 gap:12px;
 margin-top:16px;
}
.modal-btn{
 min-width:150px;
 height:54px;
 border:none;
 border-radius:12px;
 cursor:pointer;
 font-size:18px;
 font-weight:700;
}
.modal-btn.cancel{
 background:#4a4f69;
 color:#d7dcef;
}
.modal-btn.ok{
 background:linear-gradient(90deg,#6c6cff,#7a5cff);
 color:#fff;
}
#tab-conexiones .table-card{overflow:visible;}
#tab-conexiones .table-scroll{
 overflow-x:auto;
 overflow-y:visible;
 -webkit-overflow-scrolling:touch;
}
@media (max-width:700px){
 .square-btn,.editor-top-btn{width:132px;height:70px}
 .triple-grid{grid-template-columns:1fr;}
 .tab{padding:16px 22px;font-size:17px;}
}

.ventas-tools{
  display:flex;
  justify-content:flex-end;
  margin-bottom:14px;
}

.export-dropdown{
  position:relative;
}

.export-btn{
  height:48px;
  min-width:80px;
  border:none;
  border-radius:12px;
  background:#1f2340;
  color:#8f7cff;
  font-size:18px;
  padding:0 16px;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  border:2px solid #6d5dfc;
}

.export-menu{
  position:absolute;
  top:58px;
  right:0;
  width:180px;
  background:#262846;
  border-radius:14px;
  overflow:hidden;
  display:none;
  z-index:9999;
  box-shadow:0 8px 30px rgba(0,0,0,.35);
}

.export-menu button{
  width:100%;
  height:56px;
  border:none;
  background:transparent;
  color:#fff;
  font-size:18px;
  text-align:left;
  padding:0 20px;
}

.export-menu.show{
  display:block;
}

</style>
</head>
<body>

<div class="login-page" id="loginPage">
  <div class="login-card">
    <div class="login-field-label">Username</div>
    <input id="username" type="text" placeholder="Username" class="login-input" />
    <div class="login-field-label">Password</div>
    <input id="password" type="password" placeholder="••••••••" class="login-input" />
    <button class="login-btn" onclick="loginMaster()">Ingresar</button>
  </div>
</div>

<div id="menuOverlay" class="menu-overlay"></div>

<div id="sideMenu" class="side-menu">
  <div class="side-menu-header">

    <div class="side-menu-logo-wrap"
         onclick="openHomeDashboard()"
         style="cursor:pointer;">

      <img class="side-menu-logo-img"
           src="${logoUrl}"
           alt="logo">

      <div class="side-menu-logo">
        NUMBER ONE LOTO 2
      </div>

    </div>

    <div id="menuCloseBtn"
         class="side-menu-close"
         onclick="closeSideMenu()">✕</div>

  </div>

  <div class="side-menu-section">AJUSTES</div>

  <div class="side-menu-item" id="menu-config" onclick="toggleSubmenu('configMenu')">
    <span>Configuración</span><span>></span>
  </div>
  <div id="configMenu" class="submenu-box">
   <div class="submenu-item" onclick="goPage('grupos')">Grupo</div>
  </div>

  <div class="side-menu-item" onclick="openTicketConfigPage()">
  <span>Ticket Config</span>
  <span>></span>
</div>

  <div class="side-menu-item" id="menu-limites" onclick="toggleSubmenu('limitesMenu')">
    <span>Límites</span><span>></span>
  </div>
  <div id="limitesMenu" class="submenu-box">
    <div class="submenu-item" onclick="goPage('limites_ajustes')">Ajustes</div>
    <div class="submenu-item" onclick="openLimitesEstadisticas()">Estadísticas</div>
  </div>

  <div class="side-menu-item" id="menu-loterias" onclick="goPage('loterias')">
  <span>Loterías</span>
</div>
   <div class="side-menu-item" id="menu-vendors" onclick="goPage('vendors')"><span>Vendedores</span></div>
 
 <div class="side-menu-item"
     id="menu-cuenta"
     onclick="openMiCuenta()">
  <span>Mi Cuenta</span>
</div>

  <div class="side-menu-section">MONITOREO</div>
  <div class="side-menu-item" id="menu-tickets" onclick="goPage('tickets')">
  <span>Tickets</span>
</div>
 <div class="side-menu-item" id="menu-sorteos" onclick="goPage('sorteos')">
  <span>Sorteos</span>
</div>

  <div class="side-menu-section">REPORTES</div>
  <div class="side-menu-item" id="menu-venta" onclick="toggleSubmenu('ventaMenu')">
    <span>Venta</span><span>></span>
  </div>
  <div id="ventaMenu" class="submenu-box">
  <div class="submenu-item" id="submenu-ventas" onclick="goPage('ventas')">General</div>
  <div class="submenu-item" id="submenu-ventas-loteria" onclick="openVentasDetalle('loteria')">Lotería</div>
  <div class="submenu-item" id="submenu-ventas-jugada" onclick="openVentasDetalle('jugada')">Jugada</div>
  <div class="submenu-item" id="submenu-ventas-numero" onclick="openVentasDetalle('numero')">Número</div>
  <div class="submenu-item" id="submenu-ventas-grupo" onclick="goPage('grupo')">Grupo</div>
</div>

  <div class="side-menu-section">FLUJO DE EFECTIVO</div>
  <div class="side-menu-item" onclick="goPage('transactions')">
  <span>Transactions</span>
</div>

  <div class="side-menu-item" id="menu-balance" onclick="toggleSubmenu('balanceMenu')">
    <span>Balance</span><span>></span>
  </div>
  <div id="balanceMenu" class="submenu-box">
    <div class="submenu-item" id="submenu-balance-vendor" onclick="goPage('balance_vendor')">Vendedor</div>
  </div>

  <div class="side-menu-section">DESCONECTAR</div>
<div class="side-menu-item" onclick="window.location='/master/vendors'"><span>Salir</span></div>
</div>
<div class="app-page hidden" id="appPage">
  <div class="topbar">
    <div class="top-left">
      <div class="icon-btn" id="menuBtn" onclick="openSideMenu()">☰</div>
      <div class="icon-btn">⌕</div>
    </div>
    <div class="top-right">
      <div class="clock-pill" id="clockBox">13:15</div>
      <div class="icon-btn">☼</div>
      <div class="avatar">👤</div>
    </div>
  </div>

  <div id="ventasPage" class="page-block">
    <div class="page-title">Ventas</div>

      <div class="ventas-tools">

    <div class="export-dropdown">

      <button class="export-btn" onclick="toggleExportMenu(event)">
        <span>📄</span>
        <span>▼</span>
      </button>

      <div class="export-menu" id="exportMenu">
        <button onclick="printVentas()">Imprimer</button>
        <button onclick="downloadPDF()">PDF</button>
        <button onclick="downloadExcel()">Excel</button>
      </div>

    </div>

  </div>

    <div class="filters">
      <div class="filter-group">
        <div class="date-range">
          <div>
            <label>Desde</label>
            <input type="date" id="fechaInicio">
          </div>
          <div>
            <label>Hasta</label>
            <input type="date" id="fechaFin">
          </div>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">Zona</label>
        <select id="ventasZonaFilter" class="filter-select"></select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Vendedor</label>
        <select id="ventasVendorFilter" class="filter-select"></select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Lotería</label>
        <select class="filter-select"><option>-</option></select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Jugada</label>
        <select class="filter-select"><option>-</option></select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Comisión</label>
        <select id="ventasComisionFilter" class="filter-select">
          <option value="">Todas</option>
          <option value="3">3%</option>
          <option value="5">5%</option>
          <option value="8">8%</option>
          <option value="10">10%</option>
        </select>
      </div>
    </div>

    <div class="table-card">
      <div class="table-scroll">
       <table id="ventasTable">
          <thead>
            <tr>
   <th>VENDEDOR</th>
  <th onclick="sortVentasByVenta()" style="cursor:pointer;">
  VENTA<span id="ventaArrow" style="font-size:10px; display:inline-block; line-height:9px; margin-left:2px;">↑<br>↓</span>
</th>
  <th>COMISIÓN GRUPO</th>
  <th>COMISIÓN</th>
  <th>PREMIOS</th>
  <th>RESULTADO</th>
</tr>
          </thead>
          <tbody id="ventasTableBody"></tbody>
          <tfoot id="ventasTableFoot"></tfoot>
        </table>
      </div>
    </div>
  </div>

  <div id="ventasDetallePage" class="page-block hidden"></div>

  <div id="miCuentaPage" class="page-block hidden"></div>

<div id="gruposPage" class="page-block hidden">
  <div class="page-title">Grupos</div>

  <div class="action-row">
    <button class="login-btn" onclick="openNewGrupo()">+ Nuevo Grupo</button>
  </div>

  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>GRUPO</th>
            <th>ESTADO</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="gruposTableBody"></tbody>
      </table>
    </div>
  </div>
</div>

 <div id="limitesAjustesPage" class="page-block hidden">
  <div class="page-title">Configurar Límites</div>

  <div class="action-row">
    <button class="editor-top-btn save" onclick="saveLimitesAjustes()">💾 Guardar</button>
  </div>

  <div class="table-card" style="padding:14px;">
    <div class="field-group">
      <div class="field-label">Límites por Loterías</div>
      <input id="limite_borlette" class="field-input" placeholder="Borlette">
      <input id="limite_mariage" class="field-input" placeholder="Mariage">
      <input id="limite_loto3" class="field-input" placeholder="Loto 3">
      <input id="limite_loto4" class="field-input" placeholder="Loto 4">
      <input id="limite_loto5" class="field-input" placeholder="Loto 5">
    </div>

    <div class="field-group">
      <div class="field-label">Límite por números</div>
      <select id="limNumType" class="field-select">
        <option value="BOR">Borlette</option>
        <option value="MAR">Mariage</option>
        <option value="L3">Loto 3</option>
        <option value="L41">Loto 4</option>
        <option value="L51">Loto 5</option>
      </select>
      <input id="limNumNumero" class="field-input" placeholder="Número ex: 00">
      <input id="limNumMonto" class="field-input" placeholder="Limit ex: 100">
      <button class="login-btn" onclick="addLimiteNumero()">+ Ajouter limite numéro</button>
      <div id="limiteNumerosList"></div>
    </div>

    <div class="field-group">
      <div class="field-label">Bloqueo de números</div>
      <select id="blockNumType" class="field-select">
        <option value="BOR">Borlette</option>
        <option value="MAR">Mariage</option>
        <option value="L3">Loto 3</option>
        <option value="L41">Loto 4</option>
        <option value="L51">Loto 5</option>
      </select>
      <input id="blockNumNumero" class="field-input" placeholder="Número ex: 00">
      <button class="login-btn" onclick="addBloqueoNumero()">+ Bloquer numéro</button>
      <div id="bloqueoNumerosList"></div>
    </div>
  </div>
</div>

  <div id="balanceVendorPage" class="page-block hidden">
    <div class="page-title">Balance Vendedores</div>
<div id="balanceTotalTop" style="font-size:26px;font-weight:800;color:#79d98d;margin:6px 4px 14px;">
  0.00
</div>

    <div class="filters">
      <div class="filter-group">
        <label class="filter-label">Grupo</label>
        <select id="balanceGrupoFilter" class="filter-select"></select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Vendedor</label>
        <select id="balanceVendorFilter" class="filter-select"></select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Fecha</label>
        <input type="date" id="balanceFecha" class="filter-input">
      </div>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>VENDEDOR</th>
              <th>BALANCE</th>
              <th>FECHA</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="balanceTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

 <div id="ticketsPage" class="page-block hidden">
  <div class="page-title">Tickets y Jugadas</div>
<div class="tabs-scroll">
  <div class="tabs tickets-tabs">
    <div class="tab active" onclick="showTicketsTab('tickets')">TICKETS</div>
    <div class="tab" onclick="showTicketsTab('jugadas')">JUGADAS</div>
    <div class="tab" onclick="showTicketsTab('loterias')">LOTERIAS</div>
    <div class="tab" onclick="showTicketsTab('vendedores')">VENDEDORES</div>
  </div>
</div>

<div style="padding:0;">
  <div id="ticketsFilters"></div>
</div>

<div class="table-card">
  <div class="table-scroll">
    <table>
      <thead id="ticketsHead"></thead>
      <tbody id="ticketsBody"></tbody>
    </table>
  </div>
</div>
</div>

<div id="loteriasPage" class="page-block hidden">
  <div class="page-title">Loterías</div>

  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>NOMBRE</th>
            <th>APERTURA</th>
            <th>CIERRE</th>
            <th>LÍMITES</th>
            <th>PAGO</th>
            <th>ESTATUS</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="loteriasTableBody"></tbody>
      </table>
    </div>
  </div>
</div>


<div id="sorteosPage" class="page-block hidden">
  <div class="page-title">Sorteos</div>

  <div class="table-card" style="padding:14px;">
    <div class="field-group">
      <input type="date" id="sorteosDate" class="field-input">
    </div>

    <div id="sorteosRows"></div>


  </div>
</div>

<div id="transactionsPage" class="page-block hidden">
  <div class="page-title">Transactions</div>

  <div class="filters">
    <div class="filter-group">
      <div class="date-range">
        <div>
          <label>Desde</label>
          <input type="date" id="transactionStart">
        </div>
        <div>
          <label>Hasta</label>
          <input type="date" id="transactionEnd">
        </div>
      </div>
    </div>

    <div class="filter-group">
      <label class="filter-label">Grupo</label>
      <select id="transactionGrupoFilter" class="filter-select"></select>
    </div>

    <div class="filter-group">
      <label class="filter-label">Vendedor</label>
      <select id="transactionVendorFilter" class="filter-select"></select>
    </div>
  </div>

  <div class="table-card" style="padding:14px;">
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:20px;font-weight:700;">
      <div class="result-bad">Pagos<br><span id="totalPagos">0.00</span></div>
      <div class="result-ok">Cobros<br><span id="totalCobros">0.00</span></div>
      <div class="balance-positive">Resultado<br><span id="totalResultado">0.00</span></div>
    </div>
  </div>

  <div class="table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>FECHA</th>
            <th>MONTO</th>
            <th>TRANSACCIÓN</th>
            <th>AGENTE</th>
            <th>REALIZADO POR</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="transactionsTableBody"></tbody>
      </table>
    </div>
  </div>
</div>

  <div id="vendorsPage" class="page-block hidden">
    <div class="page-title">Vendedores</div>

    <div class="action-row">
      <div></div>
      <div class="action-buttons">
        <button class="square-btn" onclick="openNewVendor()">+</button>
        <button class="square-btn purple" onclick="loadVendorsFromServer()">↻</button>
      </div>
    </div>

    <div class="vendor-filters">
      <input id="vendorFilterId" class="filter-input" placeholder="ID" />
      <input id="vendorFilterNombre" class="filter-input" placeholder="NOMBRE" />
      <select id="vendorFilterGrupo" class="filter-select"></select>
      <select id="vendorFilterEstado" class="filter-select">
        <option value="">- ESTADO -</option>
        <option value="Activo">Activo</option>
        <option value="Bloqueado">Bloqueado</option>
      </select>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>NOMBRE</th>
              <th>ZONA</th>
              <th>APP</th>
              <th>CONEXIÓN</th>
              <th>LIMIT</th>
              <th>PAGO</th>
              <th>STATUS</th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody id="vendorsTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="vendorEditorPage" class="page-block hidden">
    <div class="page-title">Vendedor</div>

    <div class="editor-top-actions">
      <button class="editor-top-btn back" onclick="backToVendorList()">≪</button>
      <button class="editor-top-btn save" onclick="saveVendor()">💾</button>
    </div>

    <div class="tabs-scroll">
      <div class="tabs" id="vendorTabs">
        <div class="tab active" data-tab="datos" onclick="showVendorTab('datos')">Datos Del Vendedor</div>
        <div class="tab" data-tab="config" onclick="showVendorTab('config')">Configuración</div>
        <div class="tab" data-tab="comision" onclick="showVendorTab('comision')">Comisión</div>
        <div class="tab" data-tab="premios" onclick="showVendorTab('premios')">Pago De Premios</div>
        <div class="tab" data-tab="limites" onclick="showVendorTab('limites')">Límite De Ventas</div>
        <div class="tab" data-tab="conexiones" onclick="showVendorTab('conexiones')">Conexiones</div>
        <div class="tab" data-tab="clonar" onclick="showVendorTab('clonar')">Clonar</div>
      </div>
    </div>

    <div class="editor-card">
      <div class="editor-section vendor-tab-panel" id="tab-datos">
        <div class="field-group">
          <div class="field-label">ID</div>
          <input id="vd_id" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Clave</div>
          <input id="vd_clave" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Nombre</div>
          <input id="vd_nombre" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Apellido</div>
          <input id="vd_apellido" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Cédula</div>
          <input id="vd_cedula" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Teléfono</div>
          <input id="vd_telefono" class="field-input" placeholder="+509 / +1 / +33 ..." />
        </div>
        <div class="field-group">
          <div class="field-label">Dirección</div>
          <input id="vd_direccion" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Estatus</div>
          <select id="vd_estatus" class="field-select">
            <option value="Activo">Activo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>
        </div>
        <div class="field-group">
          <div class="field-label">Sexo</div>
          <select id="vd_sexo" class="field-select">
            <option>-</option>
            <option>Hombre</option>
            <option>Mujer</option>
          </select>
        </div>
        <div class="field-group">
          <div class="field-label">Zona</div>
          <select id="vd_zona" class="field-select"></select>
        </div>
        <div class="field-group">
          <div class="field-label">Venta del día</div>
          <input id="vd_venta" class="field-input" value="0" />
        </div>
        <div class="field-group">
          <div class="field-label">Premios del día</div>
          <input id="vd_premiosMonto" class="field-input" value="0" />
        </div>
        <div class="field-group">
          <div class="field-label">Balance actual</div>
          <input id="vd_balance" class="field-input" value="0" />
        </div>
      </div>

      <div class="editor-section vendor-tab-panel hidden" id="tab-config">
        <div class="field-group">
          <div class="field-label">Límite Diario</div>
          <input id="cfg_limite_diario" class="field-input" value="0" />
        </div>
        <div class="field-group">
          <div class="field-label">Crédito</div>
          <input id="cfg_credito" class="field-input" value="0" />
        </div>
        <div class="field-group">
          <div class="field-label">Deshabilitar Loterías</div>
          <input id="cfg_deshabilitar_loterias" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Deshabilitar Jugadas</div>
          <input id="cfg_deshabilitar_jugadas" class="field-input" />
        </div>
        <div class="field-group">
          <div class="field-label">Mezcla de números</div>
          <input id="cfg_mezcla_numeros" class="field-input" value="0" />
        </div>

        <div class="switch-row"><div id="sw_cuadre" class="switch"></div><div class="switch-label">Habilitar Cuadre</div></div>
        <div class="switch-row"><div id="sw_whatsapp" class="switch"></div><div class="switch-label">Ventas por WhatsApp</div></div>
        <div class="switch-row"><div id="sw_nombre_ticket" class="switch"></div><div class="switch-label">Usar nombre en Ticket</div></div>

<div class="switch-row">
  <div id="sw_mensaje_ticket" class="switch"></div>
  <div class="switch-label">Mensaje personal Ticket</div>
</div>

<textarea
  id="cfg_mensaje_ticket"
  placeholder="Mensaje personnel vendeur..."
  style="
    width:100%;
    min-height:70px;
    margin-top:8px;
    border-radius:10px;
    padding:10px;
    background:#111;
    color:#fff;
    border:1px solid #333;
  "
></textarea>

        <div class="field-group">
          <div class="field-label">Deshabilitar Decimales</div>
          <input id="cfg_decimales" class="field-input" value="0" />
        </div>

        <div class="field-group">
          <div class="field-label">Deshabilitar Terminales</div>
          <input id="cfg_terminales" class="field-input" value="0" />
        </div>

        <div class="switch-row"><div id="sw_prepago" class="switch"></div><div class="switch-label">Habilitar Prepago</div></div>
        <div class="switch-row"><div id="sw_bono" class="switch"></div><div class="switch-label">Activar Bono</div></div>

        <div class="field-group">
          <select id="cfg_bono" class="field-select">
            <option>Mariage</option>
            <option>Borlette</option>
            <option>Loto 3</option>
          </select>
        </div>
      </div>

      <div class="editor-section vendor-tab-panel hidden" id="tab-comision">
        <div class="switch-row" style="justify-content:flex-end;">
          <div id="sw_retener_comision" class="switch"></div>
          <div class="switch-label">Retener Comisión</div>
        </div>

        <div class="field-group">
          <div class="field-label" style="font-weight:700;">Comisión General</div>
          <input id="com_general" class="field-input" value="0" />
        </div>

        <div class="field-group"><div class="field-label">Borlette</div><input id="com_borlette" class="field-input" value="0" /></div>
        <div class="field-group"><div class="field-label">Mariage</div><input id="com_mariage" class="field-input" value="0" /></div>
        <div class="field-group"><div class="field-label">Loto 3</div><input id="com_loto3" class="field-input" value="0" /></div>
        <div class="field-group"><div class="field-label">Loto 4</div><input id="com_loto4" class="field-input" value="0" /></div>
        <div class="field-group"><div class="field-label">Loto 5</div><input id="com_loto5" class="field-input" value="0" /></div>
        <div class="field-group"><div class="field-label">Loto 5 o2</div><input id="com_loto5o2" class="field-input" value="0" /></div>
        <div class="field-group"><div class="field-label">Loto 5 o3</div><input id="com_loto5o3" class="field-input" value="0" /></div>

        <div class="field-group">
          <div class="field-label" style="font-weight:700;">Comisión de Zona</div>
          <input id="com_zona" class="field-input" value="0" />
        </div>

        <div class="switch-row"><div id="sw_comision_loteria" class="switch"></div><div class="switch-label">Comisión por Lotería</div></div>
      </div>

      <div class="editor-section vendor-tab-panel hidden" id="tab-premios">
        <div class="switch-row">
          <div id="sw_premios_habilitar" class="switch on"></div>
          <div class="switch-label">Habilitar</div>
        </div>

        <div class="field-group" style="display:flex;gap:14px;align-items:center;">
          <select id="premios_loteria" class="field-select" style="flex:1;"></select>
          <div class="switch on" id="sw_premios_apply"></div>
        </div>

        <div class="triple-grid">
          <div class="game-name">Borlette</div>
          <input id="prem_borlette_1" class="mini-input" />
          <input id="prem_borlette_2" class="mini-input" />
          <input id="prem_borlette_3" class="mini-input" />
        </div>

        <div class="triple-grid">
          <div class="game-name">Mariage</div>
          <input id="prem_mariage_1" class="mini-input" />
          <input id="prem_mariage_2" class="mini-input" />
          <input id="prem_mariage_3" class="mini-input" />
        </div>

        <div class="triple-grid">
          <div class="game-name">Loto 3</div>
          <input id="prem_l3_1" class="mini-input" />
          <input id="prem_l3_2" class="mini-input" />
          <input id="prem_l3_3" class="mini-input" />
        </div>

        <div class="triple-grid">
          <div class="game-name">Loto 4</div>
          <input id="prem_l4_1" class="mini-input" />
          <input id="prem_l4_2" class="mini-input" />
          <input id="prem_l4_3" class="mini-input" />
        </div>

        <div class="triple-grid">
          <div class="game-name">Loto 5</div>
          <input id="prem_l5_1" class="mini-input" />
          <input id="prem_l5_2" class="mini-input" />
          <input id="prem_l5_3" class="mini-input" />
        </div>
      </div>

      <div class="editor-section vendor-tab-panel hidden" id="tab-limite">
        <div class="field-group">
          <label>Borlette</label>
          <input id="lim_borlette" class="field-input" />
        </div>
        <div class="field-group">
          <label>Mariage</label>
          <input id="lim_mariage" class="field-input" />
        </div>
        <div class="field-group">
          <label>Loto 3</label>
          <input id="lim_l3" class="field-input" />
        </div>
        <div class="field-group">
          <label>Loto 4 (L1, L2, L3)</label>
          <input id="lim_l4_l1" class="field-input" placeholder="L1"/>
          <input id="lim_l4_l2" class="field-input" placeholder="L2"/>
          <input id="lim_l4_l3" class="field-input" placeholder="L3"/>
        </div>
        <div class="field-group">
          <label>Loto 5 (L1, L2, L3)</label>
          <input id="lim_l5_l1" class="field-input" placeholder="L1"/>
          <input id="lim_l5_l2" class="field-input" placeholder="L2"/>
          <input id="lim_l5_l3" class="field-input" placeholder="L3"/>
        </div>
      </div>

      <div class="editor-section vendor-tab-panel hidden" id="tab-conexiones">
        <div class="refresh-row">
          <button class="refresh-btn" onclick="refreshCurrentConexiones()">↻</button>
        </div>

        <div class="table-card">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>MARCA</th>
                  <th>MODELO</th>
                  <th>VERSION</th>
                  <th>APP</th>
                  <th>VINCULADO</th>
                  <th>LAST CONNECTION</th>
                  <th>PIN</th>
                  <th>PLACE</th>
                  <th>CO</th>
                  <th>ON</th>
                  <th>ST</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="conexiones_table"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="editor-section vendor-tab-panel hidden" id="tab-clonar">
        <div style="display:flex;justify-content:center;margin-top:40px;">
          <button class="login-btn" onclick="cloneVendor()">Clonar Vendedor</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="balanceModal" class="modal-overlay">
  <div class="modal-card">
    <div class="modal-close" onclick="closeBalanceModal()">×</div>
    <div class="modal-title" id="balanceModalTitle">Balance</div>

    <div class="field-group">
      <div class="field-label">Vendedor</div>
      <input id="balanceVendorName" class="field-input" readonly />
    </div>

    <div class="field-group">
      <div class="field-label">Balance actual</div>
      <input id="balanceActual" class="field-input" readonly />
    </div>

    <div class="field-group">
      <div class="field-label">Monto</div>
      <input id="balanceMonto" class="field-input" placeholder="0.00" />
    </div>

    <div class="field-group">
      <div class="field-label">Fecha</div>
      <input id="balanceFechaInput" type="date" class="field-input" />
    </div>

    <div class="field-group">
      <div class="field-label">Comentario</div>
      <textarea id="balanceComentario" class="field-textarea"></textarea>
    </div>

    <div class="modal-actions">
      <button class="modal-btn cancel" onclick="closeBalanceModal()">Cerrar</button>
      <button class="modal-btn ok" onclick="submitBalanceAction()">Procesar</button>
    </div>
  </div>
</div>

<script>
let currentPage = "ventas";
let currentVendorIndex = null;
let vendors = [];
let ventasRows = [];
let balanceRows = [];
let currentBalanceAction = "";
let currentBalanceVendorId = "";

let gruposList = [];

async function loadGrupoSelects(){

  try{

    const res = await fetch("/api/grupos");
    const grupos = await res.json();

    const html =
      '<option value="">- GRUPO -</option>' +

      grupos
      .filter(g => g.estatus !== "Bloqueado")
      .map(g =>
        '<option value="' + safe(g.nombre) + '">' +
        safe(g.nombre) +
        '</option>'
      )
      .join("");

    [
      "ventasZonaFilter",
      "vd_zona",
      "balanceGrupoFilter",
      "transactionGrupoFilter"
    ].forEach(id => {

      const select = byId(id);

      if(select){
        select.innerHTML = html;
      }

    });

  }catch(err){
    console.error(err);
  }

}

const loteriasList = [
  "TODAS",

  "TENNESSE MORNING",
  "TEXAS MORNING",

  "GEORGIA MIDDAY",
  "FLORIDA MIDDAY",
  "NEW YORK MIDDAY",

  "TEXAS EVENING",
  "GEORGIA EVENING",
  "TENNESSE EVENING",
  "FLORIDA EVENING",
  "NEW YORK EVENING",

  "GEORGIA NIGHT"
];

function safe(v){
  return v == null ? "" : String(v);
}

function byId(id){
  return document.getElementById(id);
}

function exists(id){
  return !!byId(id);
}

function setValue(id, value){
  const el = byId(id);
  if(el) el.value = safe(value);
}

function getValue(id, fallback = ""){
  const el = byId(id);
  return el ? el.value : fallback;
}

function getSwitchValue(id){
  const el = byId(id);
  return el ? el.classList.contains("on") : false;
}

function setSwitchValue(id,val){
  const el = byId(id);
  if(!el) return;
  if(val){ el.classList.add("on"); }
  else{ el.classList.remove("on"); }
}

function makeOption(value,text){
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = text;
  return opt;
}

function parseAmount(val){
  if(val == null || val === "") return 0;
  const num = Number(String(val).replace(/,/g,"").trim());
  return Number.isFinite(num) ? num : 0;
}

function formatAmount(val){
  const num = parseAmount(val);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return yyyy + "-" + mm + "-" + dd;
}

function updateClock(){
  const d = new Date();
  const h = String(d.getHours()).padStart(2,"0");
  const m = String(d.getMinutes()).padStart(2,"0");
  const box = byId("clockBox");
  if(box) box.textContent = h + ":" + m;
}
setInterval(updateClock,1000);
updateClock();

function resetMenuActive(){
  document.querySelectorAll(".side-menu-item, .submenu-item").forEach(el => {
    el.classList.remove("active");
  });
}

function setMenuActive(page){
  resetMenuActive();

  document.querySelectorAll(".submenu-box").forEach(function(box){
    box.classList.remove("open");
  });

  if(page === "cuenta"){
    if(byId("menu-cuenta")) byId("menu-cuenta").classList.add("active");
  }

  else if(page === "ventas"){
    if(byId("ventaMenu")) byId("ventaMenu").classList.add("open");
  }

  else if(page === "ventas_loteria"){
    if(byId("ventaMenu")) byId("ventaMenu").classList.add("open");
    if(byId("submenu-ventas-loteria")) byId("submenu-ventas-loteria").classList.add("active");
  }

  else if(page === "ventas_jugada"){
    if(byId("ventaMenu")) byId("ventaMenu").classList.add("open");
    if(byId("submenu-ventas-jugada")) byId("submenu-ventas-jugada").classList.add("active");
  }

  else if(page === "ventas_numero"){
    if(byId("ventaMenu")) byId("ventaMenu").classList.add("open");
    if(byId("submenu-ventas-numero")) byId("submenu-ventas-numero").classList.add("active");
  }

  else if(page === "grupo" || page === "ventas_grupo"){
    if(byId("ventaMenu")) byId("ventaMenu").classList.add("open");
    if(byId("submenu-ventas-grupo")) byId("submenu-ventas-grupo").classList.add("active");
  }

  else if(page === "vendors" || page === "editor"){
    if(byId("menu-vendors")) byId("menu-vendors").classList.add("active");
  }

  else if(page === "tickets"){
    if(byId("menu-tickets")) byId("menu-tickets").classList.add("active");
  }

  else if(page === "sorteos"){
    if(byId("menu-sorteos")) byId("menu-sorteos").classList.add("active");
  }

  else if(page === "loterias"){
    if(byId("menu-loterias")) byId("menu-loterias").classList.add("active");
  }

  else if(page === "balance_vendor"){
    if(byId("balanceMenu")) byId("balanceMenu").classList.add("open");
    if(byId("submenu-balance-vendor")) byId("submenu-balance-vendor").classList.add("active");
  }
}


async function loadVendorsFromServer(){
  try{
    const res = await fetch("/api/vendors");
    const data = await res.json();
    vendors = Array.isArray(data) ? data : [];
    renderVendorTable();
    fillVentasVendorSelect();
    fillBalanceVendorSelect();
    fillTransactionFilters();
  }catch(err){
    console.error(err);
    vendors = [];
    renderVendorTable();
  }
}

async function loadVentasReport(){
  try{
    const start = getValue("fechaInicio") || todayISO();
    const end = getValue("fechaFin") || start;

    setValue("fechaInicio", start);
    setValue("fechaFin", end);

    const res = await fetch(
      "/api/reportes/ventas?start=" + encodeURIComponent(start) +
      "&end=" + encodeURIComponent(end)
    );

    const data = await res.json();
    ventasRows = Array.isArray(data) ? data : [];
    renderVentasTable();
  }catch(err){
    console.error(err);
    ventasRows = [];
    renderVentasTable();
  }
}

let ventaSortAsc = false;
let manualVentaSort = false;

function sortVentasByVenta(){
  manualVentaSort = true;
  ventaSortAsc = !ventaSortAsc;
  renderVentasTable();
}

async function loadBalanceReport(){
  try{
    const fecha = getValue("balanceFecha") || todayISO();
    setValue("balanceFecha", fecha);

    const res = await fetch(
      "/api/reportes/balance?date=" + encodeURIComponent(fecha)
    );

    const data = await res.json();
    balanceRows = Array.isArray(data) ? data : [];
    renderBalanceTable();
  }catch(err){
    console.error(err);
    balanceRows = [];
    renderBalanceTable();
  }
}

function openSideMenu(){
  const menu = byId("sideMenu");
  const overlay = byId("menuOverlay");
  if(menu) menu.classList.add("open");
  if(overlay) overlay.classList.add("show");
}

function closeSideMenu(){
  const menu = byId("sideMenu");
  const overlay = byId("menuOverlay");
  if(menu) menu.classList.remove("open");
  if(overlay) overlay.classList.remove("show");
}

function toggleSubmenu(id){
  const box = byId(id);
  if(!box) return;
  box.classList.toggle("open");
}

let ticketsRows = [];
let ticketsTab = "tickets";

async function loadTicketsReport(){
  const res = await fetch("/api/reportes/tickets?reload=" + Date.now());
  const data = await res.json();
  ticketsRows = Array.isArray(data) ? data : [];
  renderTicketsReport();
}

window.addEventListener("focus", function(){
  if (currentPage === "tickets") {
    loadTicketsReport();
  }
});

function showTicketsTab(tab){
  ticketsTab = tab;

  document.querySelectorAll("#ticketsPage .tab").forEach(function(t){
    t.classList.remove("active");
  });

  var tabs = document.querySelectorAll("#ticketsPage .tab");
  if(tab === "tickets" && tabs[0]) tabs[0].classList.add("active");
  if(tab === "jugadas" && tabs[1]) tabs[1].classList.add("active");
  if(tab === "loterias" && tabs[2]) tabs[2].classList.add("active");
  if(tab === "vendedores" && tabs[3]) tabs[3].classList.add("active");

  renderTicketsReport();
}

function getStatusIcon(status) {
  if (!status) return "";

  status = status.toUpperCase();

  if (status.includes("PEDI")) {
    return '<span style="color:#ff4444;font-weight:900;font-size:24px;">✕</span>';
  }

  if (status.includes("ANATAN")) {
    return '<span style="color:#7c4dff;">🕒</span>';
  }

  if (status.includes("ANILE")) {
    return '<span style="color:#999;">🚫</span>';
  }

  if (status.includes("GANYE")) {
    return '<span style="color:#00ff66;font-weight:900;font-size:24px;">✓</span>';
  }

  return status;
}


function renderTicketsReport(){
  var filters = byId("ticketsFilters");
  var head = byId("ticketsHead");
  var body = byId("ticketsBody");
  if(!filters || !head || !body) return;

  var oldId = safe(byId("ticketFilterId") ? byId("ticketFilterId").value : "");
  var oldDate = safe(byId("ticketFilterDate") ? byId("ticketFilterDate").value : "") || todayISO();
  var oldVendor = safe(byId("ticketFilterVendor") ? byId("ticketFilterVendor").value : "");
  var oldStatus = safe(byId("ticketFilterStatus") ? byId("ticketFilterStatus").value : "");

  var vendorOptions = '<option value="">-</option>';
  vendors.forEach(function(v){
    vendorOptions += '<option value="' + safe(v.id) + '">' + safe(v.nombre || v.nom || v.id) + '</option>';
  });

  filters.innerHTML =
    '<label>ID</label>' +
    '<input class="filter-input" id="ticketFilterId" oninput="renderTicketsReport()" value="' + oldId + '">' +

    '<label>Fecha</label>' +
    '<input type="date" class="filter-input" id="ticketFilterDate" onchange="renderTicketsReport()" value="' + oldDate + '">' +

    '<label>Vendedor</label>' +
    '<select class="filter-select" id="ticketFilterVendor" onchange="renderTicketsReport()">' +
      vendorOptions +
    '</select>' +

    '<label>Estatus</label>' +
    '<select class="filter-select" id="ticketFilterStatus" onchange="renderTicketsReport()">' +
      '<option value="">-</option>' +
      '<option value="ANATAN">AN ATAN</option>' +
      '<option value="GANYE">GANYE</option>' +
      '<option value="PEDI">PEDI</option>' +
      '<option value="ANILE">ANILE</option>' +
    '</select>';

  setValue("ticketFilterVendor", oldVendor);
  setValue("ticketFilterStatus", oldStatus);

  var rows = ticketsRows.slice();

  rows = rows.filter(function(t){
    var d;

    if(t.createdAt){
      d = new Date(t.createdAt);
    }else if(t.dateLabel){
      var p = String(t.dateLabel).split("/");
      if(p.length === 3){
        d = new Date(p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0"));
      }else{
        d = new Date();
      }
    }else{
      d = new Date();
    }

    var day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");

    if(oldId && !safe(t.id).toLowerCase().includes(oldId.toLowerCase())) return false;
    if(oldDate && day !== oldDate) return false;
    if(oldVendor && safe(t.vendeur) !== oldVendor) return false;
    if(oldStatus && safe(t.status).toUpperCase() !== oldStatus) return false;

    return true;
  });

  head.innerHTML =
    '<tr>' +
      '<th>ID</th>' +
      '<th>FECHA</th>' +
      '<th>VENDEDOR</th>' +
      '<th>JUGS</th>' +
      '<th>MONTO</th>' +
      '<th>PREMIO</th>' +
      '<th>ESTADO</th>' +
      '<th></th>' +
    '</tr>';

  if(!rows.length){
    body.innerHTML = '<tr><td colspan="8" class="empty-state">Pa gen tickets pou dat sa</td></tr>';
    return;
  }

  body.innerHTML = rows.map(function(t){
    return '<tr>' +
      '<td>🖨 ' + safe(t.id) + '</td>' +
      '<td>' + safe(t.createdAtLabel || t.dateLabel || "") + '</td>' +
      '<td>' + safe(t.vendeurNom || t.vendeur) + '</td>' +
      '<td>' + (Array.isArray(t.jeux) ? t.jeux.length : 0) + '</td>' +
      '<td>' + formatAmount(t.total) + '</td>' +
      '<td>' + (t.premioLabel || formatAmount(t.premio || 0)) + '</td>' +
      '<td style="text-align:center;">' + getStatusIcon(t.status || "ANATAN") + '</td>' +
     '<td><a class="mini-btn" href="/master/ticket/' + encodeURIComponent(t.id) + '" target="_blank">🔍</a></td>' +
    '</tr>';
  }).join("");
}

var sorteosData = {};

async function loadSorteos(){
  try{
    var res = await fetch("/api/sorteos?reload=" + Date.now());
    sorteosData = await res.json();
    renderSorteosPage();
  }catch(err){
    console.error(err);
    sorteosData = {};
    renderSorteosPage();
  }
}

let loteriasAdminRows = [];

async function loadLoteriasAdmin(){
  try{
    const res = await fetch("/api/loterias");
    const data = await res.json();

    loteriasAdminRows = Array.isArray(data) ? data : [];

  }catch(err){
    console.error(err);
    loteriasAdminRows = [];
  }

  renderLoteriasAdmin();
}

function renderLoteriasAdmin(){

  var tbody = byId("loteriasTableBody");

  if(!tbody) return;

  var html = "";

  for(var i = 0; i < loteriasAdminRows.length; i++){

    var l = loteriasAdminRows[i];

    var activo =
      String(l.estatus || "").toLowerCase() === "activo";

    html +=
      '<tr>' +

      '<td>' + safe(l.name || "") + '</td>' +

      '<td>' + safe(l.openTime || "") + '</td>' +

   '<td>' + safe(l.closeTime || "") + '</td>' +

      '<td>' + (l.limite ? 'YES' : '') + '</td>' +

      '<td>' + (l.pago ? 'YES' : '') + '</td>' +

      '<td>' + (activo ? 'YES' : 'NO') + '</td>' +

      '<td>' +
'<span class="mini-btn" data-id="' + l._id + '">Edit</span>' +
'</td>' +

      '</tr>';
  }

  if(!html){
    html =
      '<tr>' +
      '<td colspan="7">Pa gen loterías</td>' +
      '</tr>';
  }

  tbody.innerHTML = html;

var btns = tbody.querySelectorAll(".mini-btn");

for(var b = 0; b < btns.length; b++){

  btns[b].onclick = function(){

    editLoteriaAdmin(this.getAttribute("data-id"));

  };

}

} 

function editLoteriaAdmin(id){

  var row = null;

  for(var i = 0; i < loteriasAdminRows.length; i++){
    if(String(loteriasAdminRows[i]._id) === String(id)){
      row = loteriasAdminRows[i];
      break;
    }
  }

  if(!row){
    alert("Lotería introuvable");
    return;
  }

    var nuevoStatus = prompt(
  "Estatus: Activo ou Bloqueado",
  row.estatus || "Activo"
);

if(nuevoStatus === null) return;

  var days = row.closeDays || {};

  var monday = prompt("Lunes fermeture", days.monday || row.closeTime || "23:59");
  if(monday === null) return;

  var tuesday = prompt("Martes fermeture", days.tuesday || row.closeTime || "23:59");
  if(tuesday === null) return;

  var wednesday = prompt("Miércoles fermeture", days.wednesday || row.closeTime || "23:59");
  if(wednesday === null) return;

  var thursday = prompt("Jueves fermeture", days.thursday || row.closeTime || "23:59");
  if(thursday === null) return;

  var friday = prompt("Viernes fermeture", days.friday || row.closeTime || "23:59");
  if(friday === null) return;

  var saturday = prompt("Sábado fermeture", days.saturday || row.closeTime || "23:59");
  if(saturday === null) return;

  var sunday = prompt("Domingo fermeture", days.sunday || row.closeTime || "23:59");
  if(sunday === null) return;

  fetch("/api/loterias/" + id,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      name: row.name,
      abrev: row.abrev,
      estatus: nuevoStatus,
      openTime: row.openTime,
      closeTime: monday,
      closeDays:{
        monday: monday,
        tuesday: tuesday,
        wednesday: wednesday,
        thursday: thursday,
        friday: friday,
        saturday: saturday,
        sunday: sunday
      },
      limite: row.limite === true,
      pago: row.pago !== false
    })
  })
  .then(function(res){ return res.json(); })
  .then(function(data){
    if(!data.ok){
      alert(data.message || "Erreur modification");
      return;
    }

    alert("Lotería modifiée");
    loadLoteriasAdmin();
  })
  .catch(function(err){
    console.error(err);
    alert("Erreur modification");
  });
}


function renderSorteosPage(){
  var box = byId("sorteosRows");
  var dateInput = byId("sorteosDate");
  if(!box || !dateInput) return;

  function toFRDate(value){
    if(!value) return "";
    var s = String(value).trim();

    if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
      var p = s.split("-");
      return p[2] + "/" + p[1] + "/" + p[0];
    }

    return s;
  }

  var date = dateInput.value || todayISO();
  dateInput.value = date;

  var dateKey = toFRDate(date);
  var saved = sorteosData[dateKey] || sorteosData[date] || {};

  var list = [
    "TENNESSE MORNING",
    "TEXAS MORNING",
    "GEORGIA MIDDAY",
    "FLORIDA MIDDAY",
    "NEW YORK MIDDAY",
    "TEXAS EVENING",
    "GEORGIA EVENING",
    "TENNESSE EVENING",
    "FLORIDA EVENING",
    "NEW YORK EVENING",
    "GEORGIA NIGHT"
  ];

  var html = "";

  list.forEach(function(l){
    var key = String(l).trim().toUpperCase();
    var r = saved[key] || {};

    var hasBalls =
      String(r.r1 || "").trim() ||
      String(r.r2 || "").trim() ||
      String(r.r3 || "").trim() ||
      String(r.r4 || "").trim();

    var btnIcon = hasBalls ? "🗑" : "💾";
    var btnClass = hasBalls ? "sorteos-delete-btn" : "sorteos-save-btn";

    html += ''
      + '<div style="display:grid;grid-template-columns:1.2fr .7fr .7fr .7fr .7fr 52px;gap:8px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.12);">'
      + '<div style="font-size:16px;color:#d7dcef;">' + key + '</div>'
      + '<input class="field-input sorteos-input" data-loteria="' + key + '" data-field="r1" value="' + safe(r.r1 || "") + '" style="text-align:center;font-size:18px;">'
      + '<input class="field-input sorteos-input" data-loteria="' + key + '" data-field="r2" value="' + safe(r.r2 || "") + '" style="text-align:center;font-size:18px;">'
      + '<input class="field-input sorteos-input" data-loteria="' + key + '" data-field="r3" value="' + safe(r.r3 || "") + '" style="text-align:center;font-size:18px;">'
      + '<input class="field-input sorteos-input" data-loteria="' + key + '" data-field="r4" value="' + safe(r.r4 || "") + '" style="text-align:center;font-size:18px;">'
      + '<button class="' + btnClass + '" data-loteria="' + key + '" style="width:48px;height:48px;border:0;border-radius:50%;background:rgba(255,255,255,.05);color:#7b72ff;font-size:24px;">' + btnIcon + '</button>'
      + '</div>';
  });

  box.innerHTML = html;
}

async function saveSorteoLine(loteria){
  var date = getValue("sorteosDate") || todayISO();

  var row = {
    loteria: loteria,
    r1: "",
    r2: "",
    r3: "",
    r4: ""
  };

  document.querySelectorAll('.sorteos-input[data-loteria="' + loteria + '"]').forEach(function(input){
    var field = input.getAttribute("data-field");
    row[field] = String(input.value || "").trim();
  });

  var hasBalls = row.r1 || row.r2 || row.r3 || row.r4;

  if(!hasBalls){
    alert("Mete boul avan ou save");
    return;
  }

  var res = await fetch("/api/sorteos/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: date,
      rows: [row]
    })
  });

  var data = await res.json();

  if(!res.ok){
    alert(data.message || "Erreur save");
    return;
  }

  function toFRDate(value){
  if(!value) return "";
  var s = String(value).trim();

  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    var p = s.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  return s;
}

var dateKey = toFRDate(date);

if(!sorteosData[dateKey]){
  sorteosData[dateKey] = {};
}

sorteosData[dateKey][loteria] = {
  r1: row.r1,
  r2: row.r2,
  r3: row.r3,
  r4: row.r4
};

renderSorteosPage();
}

document.addEventListener("click", function(e){
  var saveBtn = e.target.closest(".sorteos-save-btn");
  if(saveBtn){
    e.preventDefault();
    e.stopPropagation();
    saveSorteoLine(saveBtn.getAttribute("data-loteria"));
    return;
  }

  var deleteBtn = e.target.closest(".sorteos-delete-btn");
  if(deleteBtn){
    e.preventDefault();
    e.stopPropagation();
    deleteSorteo(deleteBtn.getAttribute("data-loteria"));
    return;
  }
});

async function deleteSorteo(loteria){
  var date = getValue("sorteosDate") || todayISO();

  if(!confirm("Ou vle siprime rezilta sa?")) return;

  try{
    var res = await fetch(
      "/api/sorteos/" + encodeURIComponent(date) + "/" + encodeURIComponent(loteria),
      { method:"DELETE" }
    );

    var data = await res.json();

    if(!res.ok){
      alert(data.message || "Erreur delete sorteo");
      return;
    }

    alert("Rezilta supprimée ✔");
    await loadSorteos();

  }catch(err){
    console.error(err);
    alert("Erreur delete sorteo");
  }
}

async function goPage(page){
  currentPage = page;

  const homeDashboardPage = byId("homeDashboardPage");
  if(homeDashboardPage){
    homeDashboardPage.classList.add("hidden");
    homeDashboardPage.style.display = "none";
  }

  const today = todayISO();

  await loadGrupoSelects();

  setValue("fechaInicio", today);
  setValue("fechaFin", today);
  setValue("transactionStart", today);
  setValue("transactionEnd", today);
  setValue("balanceFecha", today);

  const ventasPage = byId("ventasPage");
  const ticketsPage = byId("ticketsPage");
  const gruposPage = byId("gruposPage");
  const vendorsPage = byId("vendorsPage");
  const editorPage = byId("vendorEditorPage");
  const balancePage = byId("balanceVendorPage");
  const transactionsPage = byId("transactionsPage");
  const sorteosPage = byId("sorteosPage");
  const limitesAjustesPage = byId("limitesAjustesPage");

  const loteriasPage = byId("loteriasPage");
if(loteriasPage) loteriasPage.classList.add("hidden");

  if(ventasPage) ventasPage.classList.add("hidden");
  if(ticketsPage) ticketsPage.classList.add("hidden");
  if(gruposPage) gruposPage.classList.add("hidden");
  if(vendorsPage) vendorsPage.classList.add("hidden");
  if(editorPage) editorPage.classList.add("hidden");
  if(balancePage) balancePage.classList.add("hidden");
  if(transactionsPage) transactionsPage.classList.add("hidden");
  if(sorteosPage) sorteosPage.classList.add("hidden");
  if(limitesAjustesPage) limitesAjustesPage.classList.add("hidden");

 if(ventasPage) ventasPage.classList.add("hidden");
  if(ticketsPage) ticketsPage.classList.add("hidden");
  if(gruposPage) gruposPage.classList.add("hidden");
  if(vendorsPage) vendorsPage.classList.add("hidden");
  if(editorPage) editorPage.classList.add("hidden");
  if(balancePage) balancePage.classList.add("hidden");
  if(transactionsPage) transactionsPage.classList.add("hidden");
  if(sorteosPage) sorteosPage.classList.add("hidden");
  if(limitesAjustesPage) limitesAjustesPage.classList.add("hidden");

  if(page === "ventas"){
    showMasterPage("ventasPage");
    loadVentasReport();

  }else if(page === "grupos"){
  if(gruposPage) gruposPage.classList.remove("hidden");
  loadGruposFromServer();

  }else if(page === "limites_ajustes"){
  if(limitesAjustesPage) limitesAjustesPage.classList.remove("hidden");

loadLimitesAjustes();

}else if(page === "loterias"){
  showMasterPage("loteriasPage");
  loadLoteriasAdmin();

  }else if(page === "ventas_loteria"){
    if(ventasPage) ventasPage.classList.remove("hidden");
    loadVentasLoteria();

  }else if(page === "ventas_jugada"){
    if(ventasPage) ventasPage.classList.remove("hidden");
    loadVentasJugada();

  }else if(page === "ventas_numero"){
    if(ventasPage) ventasPage.classList.remove("hidden");
    loadVentasNumero();

  }else if(page === "ventas_grupo"){
    if(ventasPage) ventasPage.classList.remove("hidden");
    loadVentasGrupo();



  }else if(page === "tickets"){
    if(ticketsPage) ticketsPage.classList.remove("hidden");
    loadTicketsReport();

  }else if(page === "sorteos"){
    if(sorteosPage) sorteosPage.classList.remove("hidden");
    setValue("sorteosDate", todayISO());
    loadSorteos();

  }else if(page === "vendors"){
    if(vendorsPage) vendorsPage.classList.remove("hidden");
    renderVendorTable();

  }else if(page === "editor"){
    if(editorPage) editorPage.classList.remove("hidden");

  }else if(page === "balance_vendor"){
    if(balancePage) balancePage.classList.remove("hidden");
    loadBalanceReport();

  }else if(page === "transactions"){
    if(transactionsPage) transactionsPage.classList.remove("hidden");
    renderTransactionsTable();
  }

  setMenuActive(page);
  closeSideMenu();
}

async function openHomeDashboard(){

  hideAllMasterPages();

  await loadTicketsReport();

  let page = byId("homeDashboardPage");

  if(!page){
    page = document.createElement("div");
    page.id = "homeDashboardPage";
    page.className = "page-block";

    const app = byId("appPage");
    if(app) app.appendChild(page);
  }

  page.classList.remove("hidden");
  page.style.display = "block";

  const map = {};
  let totalVenta = 0;
  let totalPremios = 0;
  let totalResultado = 0;

  let evaluados = 0;
  let pendientes = 0;
  let ganadores = 0;

const today = todayISO();

ticketsRows.forEach(function(t){

  let d = "";

  if(t.dateLabel){
    const p = String(t.dateLabel).split("/");
    if(p.length === 3){
      d = p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
    }
  }

  if(!d && t.createdAt){
    const dt = new Date(t.createdAt);
    d =
      dt.getFullYear() + "-" +
      String(dt.getMonth() + 1).padStart(2,"0") + "-" +
      String(dt.getDate()).padStart(2,"0");
  }

  // ✅ pran sèlman tickets jounen an
  if(d !== today) return;

  const status = safe(t.status).toUpperCase();

  if(status === "ANILE") return;

  if(status === "ANATAN") pendientes++;
  else evaluados++;

  if(status === "GANYE") ganadores++;

  (t.jeux || []).forEach(function(j){

    const lot = safe(j.loterie).toUpperCase().trim();

    // ✅ si pa gen loterie, pa montre li
    if(!lot) return;

    const venta = parseAmount(j.montant || j.monto || j.amount || 0);
    const premio = parseAmount(j.gain || 0);

    // ✅ si loterie pa vann jodi a, pa monte
    if(venta <= 0 && premio <= 0) return;

    if(!map[lot]){
      map[lot] = {
        loteria: lot,
        venta: 0,
        premio: 0,
        resultado: 0,
        sorteo: ""
      };
    }

    map[lot].venta += venta;
    map[lot].premio += premio;
    map[lot].resultado += venta - premio;

    totalVenta += venta;
    totalPremios += premio;
    totalResultado += venta - premio;
  });

});

  const totalComision = ventasRows.reduce(function(a,b){
    return a + parseAmount(b.comision);
  },0);

  const rows = Object.values(map).sort(function(a,b){
    return b.venta - a.venta;
  });

  page.innerHTML =
    '<div style="padding:10px 0 28px;">' +

      '<div style="display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:18px;">' +
        homeCard("Ventas", "HTG " + formatAmount(totalVenta), "#00d2ff", "🎟") +
        homeCard("Comisión", "HTG " + formatAmount(totalComision), "#7c4dff", "%") +
        homeCard("Premios", "HTG " + formatAmount(totalPremios), "#ff4d6d", "$") +
        homeCard("Resultados", "HTG " + formatAmount(totalResultado), totalResultado >= 0 ? "#35d07f" : "#ff9f43", "💵") +
      '</div>' +

      '<div class="table-card">' +
        '<div class="table-scroll">' +
     '<table style="min-width:720px;">' +
            '<thead>' +
              '<tr>' +
                '<th>LOTERIA</th>' +
                '<th>VENTA</th>' +
                '<th>PREMIO</th>' +
                '<th>RESULTADO</th>' +
                '<th>SORTEO</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +

              rows.map(function(r){
                const cls = parseAmount(r.resultado) >= 0 ? "result-ok" : "result-bad";

                return '<tr>' +
                  '<td>● ' + safe(r.loteria).slice(0,12) + '...</td>' +
                  '<td>' + formatAmount(r.venta) + '</td>' +
                  '<td>' + formatAmount(r.premio) + '</td>' +
                  '<td class="' + cls + '">' + formatAmount(r.resultado) + '</td>' +
                  '<td style="color:#00d2ff;">' + safe(r.sorteo) + '</td>' +
                '</tr>';
              }).join("") +

            '</tbody>' +
            '<tfoot>' +
  '<tr style="transform:translateX(8px);">' +
                '<td style="transform:translateX(24px);"><b>TOTAL</b></td>' +
                '<td><b>' + formatAmount(totalVenta) + '</b></td>' +
                '<td style="transform:translateX(6px);"><b>' + formatAmount(totalPremios) + '</b></td>' +
                '<td class="' + (totalResultado >= 0 ? "result-ok" : "result-bad") + '"><b>' + formatAmount(totalResultado) + '</b></td>' +
                '<td></td>' +
              '</tr>' +
            '</tfoot>' +
          '</table>' +
        '</div>' +
      '</div>' +

      '<div class="table-card" style="padding:24px;margin-top:18px;">' +
        '<div style="font-size:46px;color:#d7dcef;margin-bottom:22px;">' +
          formatAmount(evaluados + pendientes).replace(".00","") +
        '</div>' +

        statLine("✅", "Tickets evaluados", evaluados) +
        statLine("🕒", "Tickets pendientes", pendientes) +
        statLine("🔴", "Tickets ganadores", ganadores) +
      '</div>' +

    '</div>';

  closeSideMenu();
}

function homeCard(title,value,color,icon){
  return '<div style="' +
    'background:#2a2f4a;' +
    'border-radius:14px;' +
    'padding:20px 22px;' +
    'border-bottom:4px solid '+color+';' +
    'position:relative;' +
  '">' +
    '<div style="font-size:22px;color:#cfd3ff;margin-bottom:8px;">' + title + '</div>' +
    '<div style="font-size:30px;font-weight:800;color:'+color+';">' + value + '</div>' +
    '<div style="' +
      'position:absolute;right:18px;top:18px;' +
      'width:58px;height:58px;border-radius:50%;' +
      'background:rgba(255,255,255,.06);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-size:26px;color:'+color+';' +
    '">' + icon + '</div>' +
  '</div>';
}

function statLine(icon,label,value){
  return '<div style="display:flex;align-items:center;gap:18px;margin:18px 0;">' +
    '<div style="width:64px;height:64px;border-radius:10px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-size:32px;">' + icon + '</div>' +
    '<div>' +
      '<div style="font-size:24px;color:#e0e4f5;">' + label + '</div>' +
      '<div style="font-size:22px;color:#9ea5cb;margin-top:4px;">' + value + '</div>' +
    '</div>' +
  '</div>';
}


function renderTransactionsTable(){

  const tbody = byId("transactionsTableBody");
  if(!tbody) return;

  const start = getValue("transactionStart");
  const end = getValue("transactionEnd");
  const grupoFilter = getValue("transactionGrupoFilter");
  const vendorFilter = getValue("transactionVendorFilter");

  tbody.innerHTML = "";

  let rows = [];
  let totalPagos = 0;
  let totalCobros = 0;

  vendors.forEach(function(v){

    const movimientos = Array.isArray(v.movimientos) ? v.movimientos : [];

    movimientos.forEach(function(m){

      const fecha = safe(m.fecha);
      const tipo = String(m.tipo || "").toLowerCase();
      const monto = parseAmount(m.monto);
      const vendorId = v.id;
      const zona = safe(v.zona || v.groupe);

      if(start && fecha < start) return;
      if(end && fecha > end) return;
      if(grupoFilter && zona !== grupoFilter) return;
      if(vendorFilter && vendorId !== vendorFilter) return;

      if(tipo === "pago") totalPagos += monto;
      else totalCobros += monto;

      rows.push({
  vendorId,
  vendorName: v.nombre || v.nom || vendorId,
  id: m.id,
  tipo: safe(m.tipo).toLowerCase(),
  monto: parseAmount(m.monto),
  fecha,
  comentario: safe(m.comentario),
hora: safe(m.hora || m.heure || m.time || "")
});

    });

  });

  rows.sort(function(a,b){
    return String(b.fecha).localeCompare(String(a.fecha));
  });

  if(!rows.length){
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Pa gen transaction</td></tr>';
  }

  rows.forEach(function(r){

    const cls = r.tipo === "pago" ? "result-bad" : "result-ok";
    const label = r.tipo === "debitar" ? "DEBITAR" : r.tipo.toUpperCase();

    const tr = document.createElement("tr");

    const tdFecha = document.createElement("td");
    tdFecha.textContent = safe(r.fecha);

    const tdMonto = document.createElement("td");
    tdMonto.textContent = formatAmount(r.monto);

    const tdType = document.createElement("td");
    tdType.className = cls;
    tdType.textContent = label;

    const tdVendor = document.createElement("td");
    tdVendor.textContent = safe(r.vendorName);

    const tdBy = document.createElement("td");
    tdBy.textContent = "Admin";

const tdAction = document.createElement("td");

const searchBtn = document.createElement("button");
searchBtn.className = "mini-btn";
searchBtn.innerText = "🔍";
searchBtn.onclick = function(){
  alert(
    "Vendeur: " + safe(r.vendorName) +
    " | Type: " + (r.tipo === "pago" ? "PAGOS" : "COBROS") +
    " | Montant: " + formatAmount(r.monto) +
    " | Date: " + safe(r.fecha) +
    " | Heure: " + safe(r.hora || r.time || "")
  );
};

const btn = document.createElement("button");
btn.className = "mini-btn";
btn.innerText = "🗑";
btn.onclick = function(){
  deleteMovimiento(r.vendorId, r.id);
};

tdAction.appendChild(searchBtn);
tdAction.appendChild(btn);

    tr.appendChild(tdFecha);
    tr.appendChild(tdMonto);
    tr.appendChild(tdType);
    tr.appendChild(tdVendor);
    tr.appendChild(tdBy);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);

  });

  const resultado = totalCobros - totalPagos;

  if(byId("totalPagos")) byId("totalPagos").textContent = formatAmount(totalPagos);
  if(byId("totalCobros")) byId("totalCobros").textContent = formatAmount(totalCobros);
  if(byId("totalResultado")) byId("totalResultado").textContent = formatAmount(resultado);

}

function fillVentasVendorSelect(){
  const el = byId("ventasVendorFilter");
  if(!el) return;
  const current = el.value;
  el.innerHTML = "";
  el.appendChild(makeOption("","- VENDEDOR -"));

  vendors.forEach(v=>{
    el.appendChild(makeOption(v.id, v.nombre || v.nom || v.id));
  });

  if(current) el.value = current;
}

function fillBalanceVendorSelect(){
  const el = byId("balanceVendorFilter");
  if(!el) return;
  const current = el.value;
  el.innerHTML = "";
  el.appendChild(makeOption("","- VENDEDOR -"));

  vendors.forEach(v=>{
    el.appendChild(makeOption(v.id, v.nombre || v.nom || v.id));
  });

  if(current) el.value = current;
}


function fillTransactionFilters(){
  const vendor = byId("transactionVendorFilter");
  if(!vendor) return;

  const old = vendor.value;
  vendor.innerHTML = "";
  vendor.appendChild(makeOption("", "- VENDEDOR -"));

  vendors.forEach(v=>{
    vendor.appendChild(makeOption(v.id, v.nombre || v.nom || v.id));
  });

  vendor.value = old;
}

function loadLoteriasSelects(){
  const ids = ["premios_loteria"];
  ids.forEach(id=>{
    const el = byId(id);
    if(!el) return;
    const current = el.value;
    el.innerHTML = "";
    loteriasList.forEach(l=>{
      el.appendChild(makeOption(l,l === "TODAS" ? "- TODAS -" : l));
    });
    if(current) el.value = current;
  });
}

function renderVendorTable(){
  const tbody = byId("vendorsTableBody");
  if(!tbody) return;

  const idFilter = safe(byId("vendorFilterId")?.value).toLowerCase();
  const nameFilter = safe(byId("vendorFilterNombre")?.value).toLowerCase();
  const grupoFilter = safe(byId("vendorFilterGrupo")?.value);
  const estadoFilter = safe(byId("vendorFilterEstado")?.value);

  const filtered = vendors.filter(v=>{
    const okId = !idFilter || safe(v.id).toLowerCase().includes(idFilter);
    const okName = !nameFilter || safe(v.nombre).toLowerCase().includes(nameFilter);
    const okGrupo = !grupoFilter || safe(v.zona || v.groupe) === grupoFilter;
    const okEstado = !estadoFilter || safe(v.estatus) === estadoFilter;
    return okId && okName && okGrupo && okEstado;
  });

  tbody.innerHTML = "";

  if(!filtered.length){
    tbody.innerHTML = '<tr><td colspan="11" class="empty-state">No hay vendedores</td></tr>';
    return;
  }

  filtered.forEach(v=>{
    const originalIndex = vendors.findIndex(x=>x.id === v.id);
    const hasActive = Array.isArray(v.conexiones) && v.conexiones.some(c => c && c.st === true);
    const statusDot = hasActive
      ? '<span class="status-dot green">●</span>'
      : '<span class="status-dot gray">●</span>';

    tbody.innerHTML += \`
      <tr class="clickable-row" onclick="openVendorByIndex(\${originalIndex})">
        <td>\${statusDot}<strong>\${safe(v.id)}</strong></td>
        <td>\${safe(v.nombre)}</td>
        <td>\${safe(v.zona || v.groupe)}</td>
        <td>\${safe(v.app)}</td>
        <td>\${safe(v.conexion)}</td>
        <td>✓</td>
        <td>✓</td>
        <td>\${safe(v.estatus) === "Activo" ? "✓" : ""}</td>
        <td><button class="mini-btn" onclick="event.stopPropagation();openVendorByIndex(\${originalIndex})">✎</button></td>
        <td><button class="mini-btn" onclick="event.stopPropagation();deleteVendorByIndex(\${originalIndex})">🗑</button></td>
        <td></td>
      </tr>
    \`;
  });
}

function renderVentasTable(){
  const tbody = byId("ventasTableBody");
  const tfoot = byId("ventasTableFoot");
  if(!tbody || !tfoot) return;

  const zonaFilter = getValue("ventasZonaFilter");
  const vendorFilter = getValue("ventasVendorFilter");
  const comFilter = getValue("ventasComisionFilter");

  const rows = ventasRows.filter(r=>{
    const okZona = !zonaFilter || safe(r.zona) === zonaFilter;
    const okVendor = !vendorFilter || safe(r.id) === vendorFilter;
    const rate = vendors.find(v => v.id === r.id)?.comision?.general || "";
    const okCom = !comFilter || String(parseAmount(rate)) === String(parseAmount(comFilter));
    return okZona && okVendor && okCom;
  });

  const positivos = rows
  .filter(r => parseAmount(r.resultado) >= 0)
  .sort((a, b) => parseAmount(b.venta) - parseAmount(a.venta));

const negativos = rows
  .filter(r => parseAmount(r.resultado) < 0)
  .sort((a, b) => parseAmount(b.resultado) - parseAmount(a.resultado));

rows.length = 0;
rows.push(...positivos, ...negativos);

if(manualVentaSort){
  rows.sort(function(a,b){
    return ventaSortAsc
      ? parseAmount(a.venta) - parseAmount(b.venta)
      : parseAmount(b.venta) - parseAmount(a.venta);
  });
}

  tbody.innerHTML = "";
  tfoot.innerHTML = "";

  if(!rows.length){
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Pa gen vant pou moman an</td></tr>';
    return;
  }

  let totalVenta = 0;
  let totalPremios = 0;
  let totalComision = 0;
  let totalComisionGrupo = 0;
  let totalResultado = 0;

  rows.forEach((r, i) => {
    totalVenta += parseAmount(r.venta);
    totalPremios += parseAmount(r.premios);
    totalComision += parseAmount(r.comision);
    totalComisionGrupo += zonaFilter ? parseAmount(r.comisionGrupo || 0) : 0;
    totalResultado += parseAmount(r.resultado);

    const resultado = parseAmount(r.resultado);
    const cls = resultado >= 0 ? "result-ok" : "result-bad";

    tbody.innerHTML +=
    '<tr>' +
    '<td class="vendor-name">' + (i + 1) + ') ' + safe(r.nombre) + '</td>' +
    '<td class="money">' + formatAmount(r.venta) + '</td>' +
    '<td class="money">' + formatAmount(zonaFilter ? (r.comisionGrupo || 0) : 0) + '</td>' +
    '<td class="money">' + formatAmount(r.comision) + '</td>' +
    '<td class="money">' + formatAmount(r.premios) + '</td>' +
    '<td class="' + cls + '">' +
      (resultado < 0 ? '-' : '') + formatAmount(Math.abs(resultado)) +
    '</td>' +
  '</tr>';
  });

  tfoot.innerHTML =
     '<tr>' +
    '<td class="vendor-name"></td>' +
    '<td class="money">' + formatAmount(totalVenta) + '</td>' +
    '<td class="money">' + formatAmount(totalComisionGrupo) + '</td>' +
    '<td class="money">' + formatAmount(totalComision) + '</td>' +
    '<td class="money">' + formatAmount(totalPremios) + '</td>' +
    '<td class="' + (totalResultado >= 0 ? 'result-ok' : 'result-bad') + '">' +
      (totalResultado < 0 ? '-' : '') + formatAmount(Math.abs(totalResultado)) +
    '</td>' +
  '</tr>';
}

function toggleBalanceMenu(id, e){
  if(e) e.stopPropagation();

  const menu = byId("balance_menu_" + id);
  if(!menu) return;

  const wasOpen = menu.classList.contains("show");
  closeAllBalanceMenus();

  if(wasOpen) return;

  const btn = e ? e.currentTarget : null;
  if(!btn) return;

  const rect = btn.getBoundingClientRect();
  const menuWidth = 180;
  const menuHeight = 96;
  const gap = 8;

  let left = rect.left - menuWidth - gap;
  let top = rect.top - 10;

  if(left < 8){
    left = rect.right + gap;
  }

  if(left + menuWidth > window.innerWidth - 8){
    left = window.innerWidth - menuWidth - 8;
  }

  if(top + menuHeight > window.innerHeight - 8){
    top = window.innerHeight - menuHeight - 8;
  }

  if(top < 8){
    top = 8;
  }

  menu.style.left = left + "px";
  menu.style.top = top + "px";
  menu.style.right = "auto";
  menu.style.bottom = "auto";

  menu.classList.add("show");
}

function renderBalanceTable(){
  const tbody = byId("balanceTableBody");
  if(!tbody) return;

  const grupoFilter = getValue("balanceGrupoFilter");
  const vendorFilter = getValue("balanceVendorFilter");
  const fecha = getValue("balanceFecha") || todayISO();

  const rows = balanceRows.filter(r => {
    const id = safe(r.id || r.vendeur);
    const zona = safe(r.zona || r.groupe);

    const okGrupo = !grupoFilter || zona === grupoFilter;
    const okVendor = !vendorFilter || id === vendorFilter;

    return okGrupo && okVendor;
  });

  rows.sort(function(a,b){
  return parseAmount(b.balance) - parseAmount(a.balance);
});

  tbody.innerHTML = "";

  let totalBalance = 0;

  if(!rows.length){
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Pa gen done balance pou moman an</td></tr>';

    const totalTop = byId("balanceTotalTop");
    if(totalTop){
      totalTop.textContent = "0.00";
      totalTop.style.color = "#79d98d";
    }

    return;
  }

  rows.forEach(r => {
    const id = safe(r.id || r.vendeur);
    const nombre = safe(r.nombre || r.nom || id);

    const bal = parseAmount(
      r.balanceFinal !== undefined ? r.balanceFinal :
      r.balance !== undefined ? r.balance :
      r.resultado !== undefined ? r.resultado :
      0
    );

    totalBalance += bal;

    const cls = bal >= 0 ? "balance-positive" : "balance-negative";
    const cleanVal = (bal < 0 ? "-" : "") + formatAmount(Math.abs(bal));

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.className = "vendor-name";
    tdName.textContent = nombre;

    const tdBalance = document.createElement("td");
    tdBalance.className = cls;
    tdBalance.textContent = cleanVal;

    const tdFecha = document.createElement("td");
    tdFecha.textContent = fecha;

    const tdAction = document.createElement("td");

    const wrap = document.createElement("div");
    wrap.className = "balance-actions-wrap";

    const btn = document.createElement("button");
    btn.className = "balance-menu-btn";
    btn.textContent = "⋮";
    btn.onclick = function(e){
      toggleBalanceMenu(id, e);
    };

    const menu = document.createElement("div");
    menu.className = "balance-menu";
    menu.id = "balance_menu_" + id;

    const pago = document.createElement("div");
    pago.className = "balance-menu-item";
    pago.textContent = "Pago";
    pago.onclick = function(){
      openBalanceModal(id, nombre, "pago", bal);
    };

    const debitar = document.createElement("div");
    debitar.className = "balance-menu-item";
    debitar.textContent = "Debitar";
    debitar.onclick = function(){
      openBalanceModal(id, nombre, "debitar", bal);
    };

    menu.appendChild(pago);
    menu.appendChild(debitar);

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    tdAction.appendChild(wrap);

    tr.appendChild(tdName);
    tr.appendChild(tdBalance);
    tr.appendChild(tdFecha);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });

  const totalTop = byId("balanceTotalTop");
  if(totalTop){
    totalTop.textContent =
      (totalBalance < 0 ? "-" : "") + formatAmount(Math.abs(totalBalance));

    totalTop.style.color = totalBalance < 0 ? "#ff6767" : "#79d98d";
  }
}

function blankVendor(){
  return {
    id:"",
    clave:"",
    password:"",
    nombre:"",
    nom:"",
    apellido:"",
    cedula:"",
    telefono:"",
    direccion:"",
    estatus:"Activo",
    sexo:"-",
    zona:"",
    groupe:"",
    venta:0,
    premiosMonto:0,
    balance:0,
    movimientos:[],
    config:{
       limiteDiario:"0",
      credito:"0",
      deshabilitarLoterias:"",
      deshabilitarJugadas:"",
      mezclaNumeros:"0",
      habilitarCuadre:false,
      ventasWhatsapp:false,
      usarNombreTicket:false,
      usarMensajeTicket:false,
mensajeTicket:"",
      deshabilitarDecimales:"0",
      deshabilitarTerminales:"0",
      habilitarPrepago:false,
      activarBono:false,
      bonoTipo:"Mariage"
    },
    comision:{
      retener:false,
      general:"0",
      borlette:"0",
      mariage:"0",
      loto3:"0",
      loto4:"0",
      loto5:"0",
      loto5o2:"0",
      loto5o3:"0",
      zona:"0",
      porLoteria:false
    },
    premios:{
      habilitar:true,
      loteria:"TODAS",
      applyAll:true,
      borlette:["","",""],
      mariage:["","",""],
      loto3:["","",""],
      loto4:["","",""],
      loto5:["","",""],
      loto5o2:["","",""],
      loto5o3:["","",""]
    },
    limites:{
      loteria:"TODAS",
      applyAll:true,
      borlette:"0",
      mariage:"0",
      loto3:"0",
      loto4_l1:"0",
      loto4_l2:"0",
      loto4_l3:"0",
      loto5_l1:"0",
      loto5_l2:"0",
      loto5_l3:"0",
      limitarNumeros:[],
      bloqueoNumeros:[],
      limitarCantidad:{
        borlette:"0",
        mariage:"0",
        loto3:"0",
        loto4:"0",
        loto5:"0",
        loto5o2:"0",
        loto5o3:"0"
      }
    },
    conexiones:[],
    app:"2.9.32",
    conexion:""
  };
}

function openNewVendor(){
  currentVendorIndex = null;
  fillVendorForm(blankVendor());
  goPage("editor");
  showVendorTab("datos");
}

function openVendorByIndex(index){
  currentVendorIndex = index;
  fillVendorForm(vendors[index]);
  goPage("editor");
  showVendorTab("datos");
}

function backToVendorList(){
  goPage("vendors");
}

function fillVendorForm(v){
  const cfg = v.config || {};
  const com = v.comision || {};
  const premios = v.premios || {};
  const limites = v.limites || {};

  setValue("vd_id", v.id);
  setValue("vd_clave", v.clave || v.password);
  setValue("vd_nombre", v.nombre || v.nom);
  setValue("vd_apellido", v.apellido);
  setValue("vd_cedula", v.cedula);
  setValue("vd_telefono", v.telefono);
  setValue("vd_direccion", v.direccion);
  setValue("vd_estatus", v.estatus || "Activo");
  setValue("vd_sexo", v.sexo || "-");
  setValue("vd_zona", v.zona || v.groupe);
  setValue("vd_venta", parseAmount(v.venta));
  setValue("vd_premiosMonto", parseAmount(v.premiosMonto));
  setValue("vd_balance", parseAmount(v.balance));

  setValue("cfg_limite_diario", cfg.limiteDiario || "0");
  setValue("cfg_credito", cfg.credito || "0");
  setValue("cfg_deshabilitar_loterias", cfg.deshabilitarLoterias || "");
  setValue("cfg_deshabilitar_jugadas", cfg.deshabilitarJugadas || "");
  setValue("cfg_mezcla_numeros", cfg.mezclaNumeros || "0");
  setValue("cfg_decimales", cfg.deshabilitarDecimales || "0");
  setValue("cfg_terminales", cfg.deshabilitarTerminales || "0");
  setValue("cfg_bono", cfg.bonoTipo || "Mariage");

    setSwitchValue("sw_cuadre", !!cfg.habilitarCuadre);
  setSwitchValue("sw_whatsapp", !!cfg.ventasWhatsapp);
  setSwitchValue("sw_nombre_ticket", !!cfg.usarNombreTicket);
  setSwitchValue("sw_mensaje_ticket", !!cfg.usarMensajeTicket);
setValue("cfg_mensaje_ticket", cfg.mensajeTicket || "");
  setSwitchValue("sw_prepago", !!cfg.habilitarPrepago);
  setSwitchValue("sw_bono", !!cfg.activarBono);

  setValue("com_general", com.general || "0");
  setValue("com_borlette", com.borlette || "0");
  setValue("com_mariage", com.mariage || "0");
  setValue("com_loto3", com.loto3 || "0");
  setValue("com_loto4", com.loto4 || "0");
  setValue("com_loto5", com.loto5 || "0");
  setValue("com_loto5o2", com.loto5o2 || "0");
  setValue("com_loto5o3", com.loto5o3 || "0");
  setValue("com_zona", com.zona || "0");

  setSwitchValue("sw_retener_comision", !!com.retener);
  setSwitchValue("sw_comision_loteria", !!com.porLoteria);

  setValue("premios_loteria", premios.loteria || "TODAS");
  setSwitchValue("sw_premios_habilitar", premios.habilitar !== false);
  setSwitchValue("sw_premios_apply", premios.applyAll !== false);

  setValue("prem_borlette_1", (premios.borlette || [])[0] || "");
  setValue("prem_borlette_2", (premios.borlette || [])[1] || "");
  setValue("prem_borlette_3", (premios.borlette || [])[2] || "");
  setValue("prem_mariage_1", (premios.mariage || [])[0] || "");
  setValue("prem_mariage_2", (premios.mariage || [])[1] || "");
  setValue("prem_mariage_3", (premios.mariage || [])[2] || "");
  setValue("prem_l3_1", (premios.loto3 || [])[0] || "");
  setValue("prem_l3_2", (premios.loto3 || [])[1] || "");
  setValue("prem_l3_3", (premios.loto3 || [])[2] || "");
  setValue("prem_l4_1", (premios.loto4 || [])[0] || "");
  setValue("prem_l4_2", (premios.loto4 || [])[1] || "");
  setValue("prem_l4_3", (premios.loto4 || [])[2] || "");
  setValue("prem_l5_1", (premios.loto5 || [])[0] || "");
  setValue("prem_l5_2", (premios.loto5 || [])[1] || "");
  setValue("prem_l5_3", (premios.loto5 || [])[2] || "");

  setValue("lim_borlette", limites.borlette || "");
  setValue("lim_mariage", limites.mariage || "");
  setValue("lim_l3", limites.loto3 || "");
  setValue("lim_l4_l1", limites.loto4_l1 || "");
  setValue("lim_l4_l2", limites.loto4_l2 || "");
  setValue("lim_l4_l3", limites.loto4_l3 || "");
  setValue("lim_l5_l1", limites.loto5_l1 || "");
  setValue("lim_l5_l2", limites.loto5_l2 || "");
  setValue("lim_l5_l3", limites.loto5_l3 || "");

  renderConexiones(Array.isArray(v.conexiones) ? v.conexiones : []);
}

function readVendorForm(){
  const current = currentVendorIndex != null ? vendors[currentVendorIndex] : null;

  return {
    id: getValue("vd_id").trim().toUpperCase(),
    clave: getValue("vd_clave").trim(),
    password: getValue("vd_clave").trim(),
    nombre: getValue("vd_nombre").trim(),
    nom: getValue("vd_nombre").trim(),
    apellido: getValue("vd_apellido").trim(),
    cedula: getValue("vd_cedula").trim(),
    telefono: getValue("vd_telefono").trim(),
    direccion: getValue("vd_direccion").trim(),
    estatus: getValue("vd_estatus", "Activo"),
    sexo: getValue("vd_sexo", "-"),
    zona: getValue("vd_zona").trim(),
    groupe: getValue("vd_zona").trim(),
    venta: parseAmount(getValue("vd_venta", "0")),
    premiosMonto: parseAmount(getValue("vd_premiosMonto", "0")),
    balance: parseAmount(getValue("vd_balance", "0")),

    config:{
       limiteDiario: getValue("cfg_limite_diario", "0"),
      credito: getValue("cfg_credito", "0"),
      deshabilitarLoterias: getValue("cfg_deshabilitar_loterias", ""),
      deshabilitarJugadas: getValue("cfg_deshabilitar_jugadas", ""),
      mezclaNumeros: getValue("cfg_mezcla_numeros", "0"),
      habilitarCuadre: getSwitchValue("sw_cuadre"),
      ventasWhatsapp: getSwitchValue("sw_whatsapp"),
      usarNombreTicket: getSwitchValue("sw_nombre_ticket"),
      usarMensajeTicket: getSwitchValue("sw_mensaje_ticket"),
mensajeTicket: getValue("cfg_mensaje_ticket", ""),
      deshabilitarDecimales: getValue("cfg_decimales", "0"),
      deshabilitarTerminales: getValue("cfg_terminales", "0"),
      habilitarPrepago: getSwitchValue("sw_prepago"),
      activarBono: getSwitchValue("sw_bono"),
      bonoTipo: getValue("cfg_bono", "Mariage")
    },

    comision:{
      retener: getSwitchValue("sw_retener_comision"),
      general: getValue("com_general", "0"),
      borlette: getValue("com_borlette", "0"),
      mariage: getValue("com_mariage", "0"),
      loto3: getValue("com_loto3", "0"),
      loto4: getValue("com_loto4", "0"),
      loto5: getValue("com_loto5", "0"),
      loto5o2: getValue("com_loto5o2", "0"),
      loto5o3: getValue("com_loto5o3", "0"),
      zona: getValue("com_zona", "0"),
      porLoteria: getSwitchValue("sw_comision_loteria")
    },

    premios:{
      habilitar: getSwitchValue("sw_premios_habilitar"),
      loteria: getValue("premios_loteria", "TODAS"),
      applyAll: getSwitchValue("sw_premios_apply"),
      borlette:[getValue("prem_borlette_1"), getValue("prem_borlette_2"), getValue("prem_borlette_3")],
      mariage:[getValue("prem_mariage_1"), getValue("prem_mariage_2"), getValue("prem_mariage_3")],
      loto3:[getValue("prem_l3_1"), getValue("prem_l3_2"), getValue("prem_l3_3")],
      loto4:[getValue("prem_l4_1"), getValue("prem_l4_2"), getValue("prem_l4_3")],
      loto5:[getValue("prem_l5_1"), getValue("prem_l5_2"), getValue("prem_l5_3")],
      loto5o2:["","",""],
      loto5o3:["","",""]
    },

    limites:{
      loteria: "TODAS",
      applyAll: true,
      borlette: getValue("lim_borlette", "0"),
      mariage: getValue("lim_mariage", "0"),
      loto3: getValue("lim_l3", "0"),
      loto4_l1: getValue("lim_l4_l1", "0"),
      loto4_l2: getValue("lim_l4_l2", "0"),
      loto4_l3: getValue("lim_l4_l3", "0"),
      loto5_l1: getValue("lim_l5_l1", "0"),
      loto5_l2: getValue("lim_l5_l2", "0"),
      loto5_l3: getValue("lim_l5_l3", "0"),
      limitarNumeros: [],
      bloqueoNumeros: [],
      limitarCantidad:{
        borlette: "0",
        mariage: "0",
        loto3: "0",
        loto4: "0",
        loto5: "0",
        loto5o2: "0",
        loto5o3: "0"
      }
    },

    movimientos: current ? (Array.isArray(current.movimientos) ? current.movimientos : []) : [],
    conexiones: current ? (Array.isArray(current.conexiones) ? current.conexiones : []) : [],
    app: current ? safe(current.app || "2.9.32") : "2.9.32",
    conexion: current ? safe(current.conexion || "") : ""
  };
}

async function saveVendor(){
  const vendor = readVendorForm();

  if(!vendor.id || !vendor.nombre){
    alert("ID y Nombre son obligatorios");
    return;
  }

  if(!vendor.clave){
    alert("Clave obligatoria");
    return;
  }

  try{
    let res;

    if(currentVendorIndex === null){
      res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor)
      });
    }else{
      const oldVendor = vendors[currentVendorIndex];
      res = await fetch("/api/vendors/" + encodeURIComponent(oldVendor.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor)
      });
    }

    const text = await res.text();
    let data = {};

    try{
      data = JSON.parse(text);
    }catch(e){
      alert("Server pa voye JSON. Repons lan: " + text);
      return;
    }

    if(!res.ok){
      alert(data.message || ("Erreur HTTP " + res.status));
      return;
    }

    alert("Vendedor guardado ✔");
    await loadVendorsFromServer();
    await loadVentasReport();
    await loadBalanceReport();
    goPage("vendors");

  }catch(err){
    console.error("Erreur save vendor:", err);
    alert("Erreur save vendor: " + err.message);
  }
}

async function deleteVendorByIndex(index){
  if(!confirm("Eliminar vendedor?")) return;

  try{
    const vendor = vendors[index];
    const res = await fetch("/api/vendors/" + encodeURIComponent(vendor.id), {
      method: "DELETE"
    });

    const data = await res.json();

    if(!res.ok){
      alert(data.message || "Erreur delete");
      return;
    }

    currentVendorIndex = null;
    await loadVendorsFromServer();
    await loadVentasReport();
    await loadBalanceReport();
  }catch(err){
    console.error(err);
    alert("Erreur delete vendor");
  }
}

async function cloneVendor(){
  const vendor = readVendorForm();

  if(!vendor.id){
    alert("Selecciona un vendedor");
    return;
  }

  vendor.id = vendor.id + "_COPY";
  vendor.nombre = vendor.nombre + "_copy";
  vendor.nom = vendor.nombre;
  vendor.password = vendor.clave;
  vendor.groupe = vendor.zona;
  vendor.conexiones = [];
  vendor.conexion = "";
  vendor.movimientos = [];
  vendor.venta = 0;
  vendor.premiosMonto = 0;

  try{
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendor)
    });

    const data = await res.json();

    if(!res.ok){
      alert(data.message || "Erreur clone");
      return;
    }

    alert("Copiar vendedor ✔");
    await loadVendorsFromServer();
    await loadVentasReport();
    await loadBalanceReport();
    goPage("vendors");
  }catch(err){
    console.error(err);
    alert("Erreur clone vendor");
  }
}

function boolIcon(v, clsOn){
  return v ? '<span class="' + clsOn + '">●</span>' : '<span class="bool-off">⊘</span>';
}

function closeAllConnMenus(){
  document.querySelectorAll(".conn-menu").forEach(el => el.classList.remove("show"));
}

function closeAllBalanceMenus(){
  document.querySelectorAll(".balance-menu").forEach(el => el.classList.remove("show"));
}

function toggleConnMenu(i){
  const menu = byId("conn_menu_" + i);
  if(!menu) return;
  const show = !menu.classList.contains("show");
  closeAllConnMenus();
  if(show) menu.classList.add("show");
}

function renderConexiones(rows){
  const tbody = byId("conexiones_table");
  if(!tbody) return;

  tbody.innerHTML = "";

  if(!rows || !rows.length){
    tbody.innerHTML = '<tr><td colspan="12" class="empty-state">No hay conexiones</td></tr>';
    return;
  }

  rows.forEach((c,i)=>{
    const isBlocked = !c.st;
    const actionLabel = isBlocked ? "Aceptar" : "Bloquear";
    const actionFn = isBlocked ? \`unblockConn(\${i})\` : \`blockConn(\${i})\`;

    tbody.innerHTML += \`
      <tr>
        <td>\${safe(c.marca)}</td>
        <td>\${safe(c.modelo)}</td>
        <td>\${safe(c.version)}</td>
        <td>\${safe(c.app)}</td>
        <td>\${safe(c.vinculado)}</td>
        <td>\${safe(c.last)}</td>
        <td>\${safe(c.pin)}</td>
        <td>\${safe(c.place)}</td>
        <td>\${boolIcon(c.co, "bool-on")}</td>
        <td>\${boolIcon(c.on, "bool-on")}</td>
        <td>\${boolIcon(c.st, "bool-ok")}</td>
        <td>
          <div class="conn-actions-wrap">
            <button class="conn-menu-btn" onclick="toggleConnMenu(\${i});event.stopPropagation();">⋮</button>
            <div class="conn-menu" id="conn_menu_\${i}">
              <div class="conn-menu-item" onclick="\${actionFn}">\${actionLabel}</div>
              <div class="conn-menu-item" onclick="deleteConn(\${i})">Eliminar</div>
              <div class="conn-menu-item" onclick="pinConn(\${i})">PIN</div>
            </div>
          </div>
        </td>
      </tr>
    \`;
  });
}

async function refreshCurrentConexiones(){
  if(currentVendorIndex == null) return;
  await loadVendorsFromServer();
  const current = vendors[currentVendorIndex];
  if(current){
    renderConexiones(current.conexiones || []);
  }
}

async function blockConn(i){
  if(currentVendorIndex == null) return;
  const vendor = vendors[currentVendorIndex];
  if(!vendor) return;

  try{
    const res = await fetch("/api/vendors/" + encodeURIComponent(vendor.id) + "/connections/" + i + "/block", {
      method: "POST"
    });

    const data = await res.json();
    if(!res.ok){
      alert(data.message || "Erreur blocage");
      return;
    }

    closeAllConnMenus();
    await loadVendorsFromServer();
    const idx = vendors.findIndex(v => v.id === vendor.id);
    if(idx >= 0){
      currentVendorIndex = idx;
      fillVendorForm(vendors[idx]);
    }
    alert("Connexion bloquée");
  }catch(err){
    console.error(err);
    alert("Erreur blocage connexion");
  }
}

async function unblockConn(i){
  if(currentVendorIndex == null) return;
  const vendor = vendors[currentVendorIndex];
  if(!vendor) return;

  try{
    const res = await fetch("/api/vendors/" + encodeURIComponent(vendor.id) + "/connections/" + i + "/unblock", {
      method: "POST"
    });

    const data = await res.json();
    if(!res.ok){
      alert(data.message || "Erreur déblocage");
      return;
    }

    closeAllConnMenus();
    await loadVendorsFromServer();
    const idx = vendors.findIndex(v => v.id === vendor.id);
    if(idx >= 0){
      currentVendorIndex = idx;
      fillVendorForm(vendors[idx]);
    }
    alert("Connexion activée");
  }catch(err){
    console.error(err);
    alert("Erreur déblocage connexion");
  }
}

async function deleteConn(i){
  if(currentVendorIndex == null) return;
  const vendor = vendors[currentVendorIndex];
  if(!vendor) return;

  try{
    const res = await fetch("/api/vendors/" + encodeURIComponent(vendor.id) + "/connections/" + i, {
      method: "DELETE"
    });

    const data = await res.json();
    if(!res.ok){
      alert(data.message || "Erreur suppression connexion");
      return;
    }

    closeAllConnMenus();
    await loadVendorsFromServer();
    const idx = vendors.findIndex(v => v.id === vendor.id);
    if(idx >= 0){
      currentVendorIndex = idx;
      fillVendorForm(vendors[idx]);
    }
    alert("Connexion supprimée");
  }catch(err){
    console.error(err);
    alert("Erreur suppression connexion");
  }
}

function pinConn(i){
  const vendor = currentVendorIndex != null ? vendors[currentVendorIndex] : null;
  const conn = vendor && Array.isArray(vendor.conexiones) ? vendor.conexiones[i] : null;
  if(!conn){
    alert("PIN introuvable");
    return;
  }
  closeAllConnMenus();
  alert("PIN conexión: " + safe(conn.pin));
}

function openBalanceModal(vendorId, vendorName, tipo, currentBalance){
  currentBalanceVendorId = vendorId;
  currentBalanceAction = tipo;

  closeAllBalanceMenus();
  byId("balanceModal").style.display = "flex";
  byId("balanceModalTitle").textContent =
    tipo === "cobro" ? "Realizar Cobro" :
    tipo === "pago" ? "Realizar Pago" :
    "Debitar";

  setValue("balanceVendorName", vendorName);
  setValue("balanceActual", formatAmount(currentBalance));
  setValue("balanceMonto", "");
  setValue("balanceFechaInput", todayISO());
  setValue("balanceComentario", "");
}

function closeBalanceModal(){
  currentBalanceVendorId = "";
  currentBalanceAction = "";
  byId("balanceModal").style.display = "none";
}

async function submitBalanceAction(){
  if(!currentBalanceVendorId || !currentBalanceAction) return;

  const monto = parseAmount(getValue("balanceMonto"));
  const fecha = getValue("balanceFechaInput");
  const comentario = getValue("balanceComentario");

  if(monto <= 0){
    alert("Monto invalide");
    return;
  }

  try{
    const res = await fetch("/api/vendors/" + encodeURIComponent(currentBalanceVendorId) + "/balance-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: currentBalanceAction,
        monto,
        fecha,
        comentario
      })
    });

    const data = await res.json();

    if(!res.ok){
      alert(data.message || "Erreur balance");
      return;
    }

    closeBalanceModal();
    await loadVendorsFromServer();
    await loadVentasReport();
    await loadBalanceReport();
    alert("Balance mis à jour");
  }catch(err){
    console.error(err);
    alert("Erreur balance");
  }
}

function showVendorTab(tabName){
  document.querySelectorAll(".tab").forEach(tab=>{
    tab.classList.remove("active");
    if(tab.dataset.tab === tabName){
      tab.classList.add("active");
    }
  });

  document.querySelectorAll(".vendor-tab-panel").forEach(panel=>{
    panel.classList.add("hidden");
  });

  const map = {
    datos: "tab-datos",
    config: "tab-config",
    comision: "tab-comision",
    premios: "tab-premios",
    limites: "tab-limite",
    conexiones: "tab-conexiones",
    clonar: "tab-clonar"
  };

  const panel = byId(map[tabName] || ("tab-" + tabName));
  if(panel) panel.classList.remove("hidden");
}

function bindSwitches(){
  document.querySelectorAll(".switch").forEach(sw=>{
    if(sw.dataset.bound === "1") return;
    sw.dataset.bound = "1";
    sw.addEventListener("click",function(){
      sw.classList.toggle("on");
    });
  });
}

document.addEventListener("click", function(e){
  if(!e.target.closest(".conn-actions-wrap")){
    closeAllConnMenus();
  }
  if(!e.target.closest(".balance-actions-wrap")){
    closeAllBalanceMenus();
  }
});

document.addEventListener("DOMContentLoaded", function(){
const transactionGrupoFilter = byId("transactionGrupoFilter");
const transactionVendorFilter = byId("transactionVendorFilter");
const transactionStart = byId("transactionStart");
const transactionEnd = byId("transactionEnd");

const sorteosDate = byId("sorteosDate");
if(sorteosDate) sorteosDate.addEventListener("change", loadSorteos);

if(transactionGrupoFilter) transactionGrupoFilter.addEventListener("change", renderTransactionsTable);
if(transactionVendorFilter) transactionVendorFilter.addEventListener("change", renderTransactionsTable);
if(transactionStart) transactionStart.addEventListener("change", renderTransactionsTable);
if(transactionEnd) transactionEnd.addEventListener("change", renderTransactionsTable);

if(transactionStart && !transactionStart.value) transactionStart.value = todayISO();
if(transactionEnd && !transactionEnd.value) transactionEnd.value = todayISO();

const fechaInicio = byId("fechaInicio");
const fechaFin = byId("fechaFin");

if(fechaInicio && !fechaInicio.value) fechaInicio.value = todayISO();
if(fechaFin && !fechaFin.value) fechaFin.value = todayISO();

if(fechaInicio) fechaInicio.addEventListener("change", loadVentasReport);
if(fechaFin) fechaFin.addEventListener("change", loadVentasReport);

  const menuBtn = byId("menuBtn");
  const menuCloseBtn = byId("menuCloseBtn");
  const overlay = byId("menuOverlay");

  if(menuBtn) menuBtn.addEventListener("click", openSideMenu);
  if(menuCloseBtn) menuCloseBtn.addEventListener("click", closeSideMenu);
  if(overlay) overlay.addEventListener("click", closeSideMenu);

  const idFilter = byId("vendorFilterId");
  const nombreFilter = byId("vendorFilterNombre");
  const grupoFilter = byId("vendorFilterGrupo");
  const estadoFilter = byId("vendorFilterEstado");

  if(idFilter) idFilter.addEventListener("input", renderVendorTable);
  if(nombreFilter) nombreFilter.addEventListener("input", renderVendorTable);
  if(grupoFilter) grupoFilter.addEventListener("change", renderVendorTable);
  if(estadoFilter) estadoFilter.addEventListener("change", renderVendorTable);

  const ventasZonaFilter = byId("ventasZonaFilter");
  const ventasVendorFilter = byId("ventasVendorFilter");
  const ventasComisionFilter = byId("ventasComisionFilter");

  if(ventasZonaFilter) ventasZonaFilter.addEventListener("change", renderVentasTable);
  if(ventasVendorFilter) ventasVendorFilter.addEventListener("change", renderVentasTable);
  if(ventasComisionFilter) ventasComisionFilter.addEventListener("change", renderVentasTable);

  const balanceGrupoFilter = byId("balanceGrupoFilter");
  const balanceVendorFilter = byId("balanceVendorFilter");
  const balanceFecha = byId("balanceFecha");

  if(balanceGrupoFilter) balanceGrupoFilter.addEventListener("change", renderBalanceTable);
  if(balanceVendorFilter) balanceVendorFilter.addEventListener("change", renderBalanceTable);
  if(balanceFecha) balanceFecha.addEventListener("change", loadBalanceReport);

  if(balanceFecha) balanceFecha.value = todayISO();

  loadGrupoSelects();
  loadLoteriasSelects();
  bindSwitches();
  loadVendorsFromServer();
  loadVentasReport();
  loadBalanceReport();
});

async function deleteMovimiento(vendorId, movimientoId){
  if(!confirm("Ou vle siprime transaction sa?")) return;

  try{
    const res = await fetch(
      "/api/vendors/" + encodeURIComponent(vendorId) +
      "/movimientos/" + encodeURIComponent(movimientoId),
      { method: "DELETE" }
    );

    const data = await res.json();

    if(!res.ok){
      alert(data.message || "Erreur delete transaction");
      return;
    }

    await loadVendorsFromServer();
    await loadVentasReport();
    await loadBalanceReport();
    renderTransactionsTable();

    alert("Transaction supprimée ✔");
  }catch(err){
    console.error(err);
    alert("Erreur delete transaction");
  }
}

async function cancelTicket(ticketId){

  if(!confirm("Ou vle anile ticket sa?")) return;

  try{
   const res = await fetch("/api/tickets/" + encodeURIComponent(ticketId) + "/anile", {
  method: "POST"
});

    const data = await res.json();

    if(!res.ok){
      alert(data.message || "Erreur annulation");
      return;
    }

    alert("Ticket annulé ✔");

    await loadTicketsReport();
    await loadVentasReport();
    await loadBalanceReport();

  }catch(err){
    console.error(err);
    alert("Erreur serveur");
  }
}

let grupos = [];

async function loadGruposFromServer(){
  try{
    const res = await fetch("/api/grupos");
    grupos = await res.json();
    renderGruposTable();
  }catch(err){
    grupos = [];
    renderGruposTable();
  }
}

function renderGruposTable(){
  const tbody = byId("gruposTableBody");
  if(!tbody) return;

  tbody.innerHTML = "";

  grupos.forEach(function(g, index){
    const activo = g.estatus !== "Bloqueado";

    tbody.innerHTML +=
      '<tr>' +
      '<td>' + safe(g.nombre) + '</td>' +
      '<td>' + (activo ? "Activo" : "Bloqueado") + '</td>' +
      '<td style="display:flex;gap:8px;">' +
      '<button class="mini-btn" onclick="editGrupoByIndex(' + index + ')">✏️</button>' +
      (
        activo
        ? '<button class="mini-btn danger" onclick="blockGrupoByIndex(' + index + ')">🚫</button>'
        : '<button class="mini-btn success" onclick="unblockGrupoByIndex(' + index + ')">✅</button>'
      ) +
      '<button class="mini-btn danger" onclick="deleteGrupoByIndex(' + index + ')">🗑</button>' +
      '</td>' +
      '</tr>';
  });
}

async function editGrupoByIndex(index){
  const oldName = grupos[index].nombre;
  const nouveau = prompt("Nouveau nom grupo", oldName);
  if(!nouveau) return;

  await fetch("/api/grupos/" + encodeURIComponent(oldName), {
    method:"PUT",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ nombre:nouveau })
  });

  await loadGruposFromServer();
}

async function blockGrupoByIndex(index){
  const nombre = grupos[index].nombre;

  await fetch("/api/grupos/block/" + encodeURIComponent(nombre), {
    method:"PUT"
  });

  await loadGruposFromServer();
}

async function unblockGrupoByIndex(index){
  const nombre = grupos[index].nombre;

  await fetch("/api/grupos/unblock/" + encodeURIComponent(nombre), {
    method:"PUT"
  });

  await loadGruposFromServer();
}

async function deleteGrupoByIndex(index){
  const nombre = grupos[index].nombre;

  if(!confirm("Ou vle siprime grupo sa?")) return;

  await fetch("/api/grupos/" + encodeURIComponent(nombre), {
    method:"DELETE"
  });

  await loadGruposFromServer();
}

async function openNewGrupo(){
  const nombre = prompt("Nombre grupo");
  if(!nombre) return;

  const comisionGrupo = prompt("Comisión grupo");
  if(comisionGrupo === null) return;

  await fetch("/api/grupos", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      nombre:nombre,
      comisionGrupo:Number(comisionGrupo || 0)
    })
  });

  await loadGruposFromServer();
  await loadGrupoSelects();
}

function toggleExportMenu(e){
  e.stopPropagation();

  var menu = document.getElementById("exportMenu");

  if(menu.classList.contains("show")){
    menu.classList.remove("show");
  }else{
    menu.classList.add("show");
  }
}

document.addEventListener("click", function(){
  var menu = document.getElementById("exportMenu");

  if(menu){
    menu.classList.remove("show");
  }
});

function openVentasDocument(type){
  var start = getValue("fechaInicio") || todayISO();
  var end = getValue("fechaFin") || start;
  var zona = getValue("ventasZonaFilter");
  var vendor = getValue("ventasVendorFilter");
  var comision = getValue("ventasComisionFilter");

  window.open(
    "/ventas-document?type=" + encodeURIComponent(type) +
    "&start=" + encodeURIComponent(start) +
    "&end=" + encodeURIComponent(end) +
    "&zona=" + encodeURIComponent(zona) +
    "&vendor=" + encodeURIComponent(vendor) +
    "&comision=" + encodeURIComponent(comision),
    "_blank"
  );
}

function printVentas(){
  openVentasDocument("print");
}

function downloadPDF(){
  openVentasDocument("pdf");
}

function downloadExcel(){
  openVentasDocument("excel");
}

let limiteNumeros = [];
let bloqueoNumeros = [];

function addLimiteNumero(){
  const type = byId("limNumType").value;
  const numero = byId("limNumNumero").value.trim();
  const monto = parseFloat(byId("limNumMonto").value || 0);

  if(!numero || monto <= 0){
    alert("Antre numéro ak limit");
    return;
  }

  limiteNumeros.push({
    type,
    numero,
    monto
  });

  renderLimiteNumeros();

  byId("limNumNumero").value = "";
  byId("limNumMonto").value = "";
}

function renderLimiteNumeros(){
  const box = byId("limiteNumerosList");
  if(!box) return;

  let html = "";

  limiteNumeros.forEach(function(x,i){

   html += '<div class="ticket-line">' +
  '<span style="display:inline-block;width:70px;">' + x.type + '</span>' +
  '<span style="display:inline-block;width:70px;">' + x.numero + '</span>' +
  '<span style="display:inline-block;width:100px;">' + Number(x.monto || 0).toFixed(2) + ' G</span>' +
  '<button onclick="removeLimiteNumero(' + i + ')">X</button>' +
'</div>';

  });

  box.innerHTML = html;
}

function removeLimiteNumero(i){
  limiteNumeros.splice(i,1);
  renderLimiteNumeros();
}

function addBloqueoNumero(){
  const type = byId("blockNumType").value;
  const numero = byId("blockNumNumero").value.trim();

  if(!numero){
    alert("Antre numéro");
    return;
  }

  bloqueoNumeros.push({
    type,
    numero
  });

  renderBloqueoNumeros();

  byId("blockNumNumero").value = "";
}

function renderBloqueoNumeros(){
  const box = byId("bloqueoNumerosList");
  if(!box) return;

 let html = "";

bloqueoNumeros.forEach(function(x,i){

  html += '<div class="ticket-line">' +
    '<span>' + x.type + '</span>' +
    '<span>' + x.numero + '</span>' +
    '<button onclick="removeBloqueoNumero(' + i + ')">X</button>' +
  '</div>';

});

box.innerHTML = html;
}

async function loadLimitesAjustes(){
  const res = await fetch("/api/limites-ajustes");
  const data = await res.json();

  if(!data.ok) return;

  const l = data.limites || {};

  byId("limite_borlette").value = l.borlette || "";
  byId("limite_mariage").value = l.mariage || "";
  byId("limite_loto3").value = l.loto3 || "";
  byId("limite_loto4").value = l.loto4 || "";
  byId("limite_loto5").value = l.loto5 || "";

  limiteNumeros = Array.isArray(l.limiteNumeros) ? l.limiteNumeros : [];
  bloqueoNumeros = Array.isArray(l.bloqueoNumeros) ? l.bloqueoNumeros : [];

  renderLimiteNumeros();
  renderBloqueoNumeros();
}

function removeBloqueoNumero(i){
  bloqueoNumeros.splice(i,1);
  renderBloqueoNumeros();
}

async function saveLimitesAjustes(){
  try{

    const payload = {
      borlette: Number(byId("limite_borlette").value || 0),
      mariage: Number(byId("limite_mariage").value || 0),
      loto3: Number(byId("limite_loto3").value || 0),
      loto4: Number(byId("limite_loto4").value || 0),
      loto5: Number(byId("limite_loto5").value || 0),

      limiteNumeros,
      bloqueoNumeros
    };

    const res = await fetch("/api/limites-ajustes", {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if(data.ok){
      alert("Limites sauvegardés");
    }else{
      alert(data.message || "Erreur");
    }

  }catch(err){
    console.error(err);
    alert("Erreur serveur");
  }
}

let currentVentasMode = "numero";


function hideAllMasterPages(){
  [
    "ventasPage",
    "ventasDetallePage",
    "miCuentaPage",
    "gruposPage",
    "limitesAjustesPage",
    "limitesEstadisticasPage",
    "balanceVendorPage",
    "ticketsPage",
    "sorteosPage",
    "transactionsPage",
    "vendorsPage",
    "vendorEditorPage"
  ].forEach(function(id){
    const el = byId(id);
    if(el){
      el.classList.add("hidden");
    
    }
  });
}

function showMasterPage(id){
  hideAllMasterPages();

  const el = byId(id);
  if(el){
    el.classList.remove("hidden");
    el.style.display = "block";
  }
}

async function openVentasDetalle(mode){
  currentVentasMode = mode || "numero";

  const page = byId("ventasDetallePage");
  if(!page) return;

  showMasterPage("ventasDetallePage");
  

  try{
    const res = await fetch("/api/reportes/tickets?reload=" + Date.now());
    const data = await res.json();
    ticketsRows = Array.isArray(data) ? data : [];
  }catch(err){
    console.error(err);
    ticketsRows = [];
  }

  let title = "Ventas por Número";
  if(currentVentasMode === "loteria") title = "Ventas por Lotería";
  if(currentVentasMode === "jugada") title = "Ventas por Jugada";

  page.innerHTML =
    '<div class="page-title">' + title + '</div>' +

    '<div class="filters">' +

      '<div class="filter-group">' +
        '<div class="date-range">' +
          '<div>' +
            '<label>Desde</label>' +
            '<input type="date" id="detFechaInicio" class="filter-input" value="' + todayISO() + '">' +
          '</div>' +
          '<div>' +
            '<label>Hasta</label>' +
            '<input type="date" id="detFechaFin" class="filter-input" value="' + todayISO() + '">' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="filter-group">' +
        '<label class="filter-label">Zona</label>' +
        '<select id="detZona" class="filter-select"></select>' +
      '</div>' +

      '<div class="filter-group">' +
        '<label class="filter-label">Vendedor</label>' +
        '<select id="detVendor" class="filter-select"></select>' +
      '</div>' +

      '<div class="filter-group">' +
        '<label class="filter-label">Lotería</label>' +
        '<select id="detLoteria" class="filter-select"></select>' +
      '</div>' +

      '<div class="filter-group">' +
        '<label class="filter-label">Jugada</label>' +
        '<select id="detJugada" class="filter-select">' +
          '<option value="">-</option>' +
          '<option value="BOR">Borlette</option>' +
          '<option value="MAR">Mariage</option>' +
          '<option value="L3">Loto 3</option>' +
          '<option value="L41">Loto 4 L1</option>' +
          '<option value="L42">Loto 4 L2</option>' +
          '<option value="L43">Loto 4 L3</option>' +
          '<option value="L51">Loto 5 L1</option>' +
          '<option value="L52">Loto 5 L2</option>' +
          '<option value="L53">Loto 5 L3</option>' +
        '</select>' +
      '</div>' +

      '<div class="filter-group">' +
        '<label class="filter-label">Número</label>' +
        '<input type="text" id="detNumero" class="filter-input">' +
      '</div>' +

    '</div>' +

    '<div class="table-card">' +
      '<div class="table-scroll">' +
        '<table style="width:100%;min-width:100%;border-collapse:collapse;">' +
          '<thead>' +
            '<tr>' +
              '<th style="text-align:left;">TIPO</th>' +
              '<th style="text-align:center;">#</th>' +
              '<th style="text-align:right;">VENTA</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="detBody"></tbody>' +
          '<tfoot id="detFoot"></tfoot>' +
        '</table>' +
      '</div>' +
    '</div>';

  fillVentasDetalleSelects();
  renderVentasDetalle();

  [
    "detFechaInicio",
    "detFechaFin",
    "detZona",
    "detVendor",
    "detLoteria",
    "detJugada"
  ].forEach(function(id){
    const el = byId(id);
    if(el){
      el.addEventListener("change", renderVentasDetalle);
    }
  });

  const numInput = byId("detNumero");
  if(numInput){
    numInput.addEventListener("input", renderVentasDetalle);
  }

  if(currentVentasMode === "loteria"){
  setMenuActive("ventas_loteria");
}

if(currentVentasMode === "jugada"){
  setMenuActive("ventas_jugada");
}

if(currentVentasMode === "numero"){
  setMenuActive("ventas_numero");
}

  closeSideMenu();
}

function fillVentasDetalleSelects(){
  const zona = byId("detZona");
  const vendor = byId("detVendor");
  const loteria = byId("detLoteria");

  if(zona){
    zona.innerHTML = '<option value="">- GRUPO -</option>';

    gruposList.forEach(function(g){
      const name = safe(g.nombre || g);
      zona.innerHTML += '<option value="' + name + '">' + name + '</option>';
    });
  }

  if(vendor){
    vendor.innerHTML = '<option value="">- VENDEDOR -</option>';

    vendors.forEach(function(v){
      const id = safe(v.id).toUpperCase();
      const name = safe(v.nombre || v.nom || v.id);
      vendor.innerHTML += '<option value="' + id + '">' + name + '</option>';
    });
  }

  if(loteria){
    loteria.innerHTML = '<option value="">-</option>';

    loteriasList.forEach(function(l){
      if(l === "TODAS") return;
      const name = safe(l).toUpperCase();
      loteria.innerHTML += '<option value="' + name + '">' + name + '</option>';
    });
  }
}

function labelType(type){
  type = safe(type).toUpperCase();

  if(type === "BOR") return "Borlette";
  if(type === "MAR") return "Mariage";
  if(type === "L3") return "Loto 3";
  if(type === "L41") return "Loto 4";
  if(type === "L42") return "Loto 4";
  if(type === "L43") return "Loto 4";
  if(type === "L51") return "Loto 5";
  if(type === "L52") return "Loto 5";
  if(type === "L53") return "Loto 5";

  return type;
}

function renderVentasDetalle(){
  const body = byId("detBody");
  const foot = byId("detFoot");

  if(!body || !foot) return;

  const start = getValue("detFechaInicio");
  const end = getValue("detFechaFin");
  const zonaFilter = getValue("detZona");
  const vendorFilter = getValue("detVendor");
  const loteriaFilter = getValue("detLoteria");
  const jugadaFilter = getValue("detJugada");
  const numeroFilter = getValue("detNumero").trim();

  const map = {};

  ticketsRows.forEach(function(t){
    const vendorId = safe(t.vendeur).toUpperCase();

    const vendor = vendors.find(function(v){
      return safe(v.id).toUpperCase() === vendorId;
    }) || {};

    const vendorZona = safe(vendor.zona || vendor.groupe);

    if(zonaFilter && vendorZona !== zonaFilter) return;
    if(vendorFilter && vendorId !== vendorFilter) return;

    let d = "";

    if(t.dateLabel){
      const p = String(t.dateLabel).split("/");
      if(p.length === 3){
        d = p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
      }
    }

    if(!d && t.createdAt){
      const dt = new Date(t.createdAt);
      d =
        dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2,"0") + "-" +
        String(dt.getDate()).padStart(2,"0");
    }

    if(start && d < start) return;
    if(end && d > end) return;

    if(String(t.status || "").toUpperCase() === "ANILE") return;

    (t.jeux || []).forEach(function(j){
      const lot = safe(j.loterie).toUpperCase();
      const type = safe(j.type).toUpperCase();
      const numero = safe(j.numero).trim();

      if(loteriaFilter && lot !== loteriaFilter) return;
      if(jugadaFilter && type !== jugadaFilter) return;
      if(numeroFilter && numero !== numeroFilter) return;

      let key = "";

      if(currentVentasMode === "numero"){
        key = type + "|" + numero;
      }

      if(currentVentasMode === "jugada"){
        key = type;
      }

      if(currentVentasMode === "loteria"){
        key = lot;
      }

      if(!key) return;

      if(!map[key]){
        map[key] = {
          type: type,
          numero: numero,
          loteria: lot,
          count: 0,
          venta: 0
        };
      }

      map[key].count += 1;
      map[key].venta += parseAmount(j.montant);
    });
  });

  const rows = Object.values(map).sort(function(a,b){
    return b.venta - a.venta;
  });

  body.innerHTML = "";
  foot.innerHTML = "";

  if(!rows.length){
    body.innerHTML =
      '<tr>' +
        '<td colspan="3" class="empty-state">Pa gen done</td>' +
      '</tr>';
    return;
  }

  let totalCount = 0;
  let totalVenta = 0;

  rows.forEach(function(r){
    totalCount += r.count;
    totalVenta += r.venta;

    let col1 = "";
    let col2 = "";

    if(currentVentasMode === "numero"){
      col1 = labelType(r.type);
      col2 = r.numero;
    }

    if(currentVentasMode === "jugada"){
      col1 = labelType(r.type);
      col2 = r.count;
    }

    if(currentVentasMode === "loteria"){
      col1 = r.loteria;
      col2 = r.count;
    }

    body.innerHTML +=
      '<tr>' +
        '<td style="text-align:left;padding:12px 14px;">' + safe(col1) + '</td>' +
        '<td style="text-align:center;padding:12px 14px;">' + safe(col2) + '</td>' +
        '<td style="text-align:right;padding:12px 14px;">' + formatAmount(r.venta) + '</td>' +
      '</tr>';
  });

  foot.innerHTML =
    '<tr style="background:#3b405c;font-weight:900;">' +
      '<td style="text-align:left;padding:14px;">TOTAL</td>' +
      '<td style="text-align:center;padding:14px;">' + totalCount + '</td>' +
      '<td style="text-align:right;padding:14px;">' + formatAmount(totalVenta) + '</td>' +
    '</tr>';
}

async function openTicketConfigPage(){

  const input = document.createElement("input");

  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {

    const file = input.files[0];

    if(!file) return;

    const formData = new FormData();

    formData.append("logo", file);

    try{

      const uploadRes = await fetch(
        "/api/upload-logo",
        {
          method:"POST",
          body: formData
        }
      );

      const uploadData =
        await uploadRes.json();

      if(!uploadData.ok){
        alert("Erreur upload logo");
        return;
      }

      const ticketMessage = prompt(
        "Message ticket",
        ""
      );

      const mariageGratis =
        confirm(
          "Activer mariage gratis ?"
        );

    let mariagePayout = 1000;

if(mariageGratis){
  const p = prompt(
    "Prix paiement mariage gratis",
    "1000"
  );

  mariagePayout = Number(p || 1000);
}

      const saveRes = await fetch(
        "/api/app-config",
        {
          method:"POST",

          headers:{
            "Content-Type":
            "application/json"
          },

          body: JSON.stringify({

            ticketLogo:
              uploadData.url,

            ticketMessage:
              ticketMessage || "",

            mariageGratis:{
  enabled: mariageGratis,
  payout: mariagePayout
}

          })
        }
      );

      const saveData =
        await saveRes.json();

      if(saveData.ok){

        alert(
          "Configuration sauvegardée"
        );

      }else{

        alert("Erreur sauvegarde");

      }

    }catch(err){

      console.error(err);

      alert("Erreur système");

    }

  };

  input.click();

}

function getMasterUser(){
  return localStorage.getItem("masterUsername") || "Number";
}

function getMasterPass(){
  return localStorage.getItem("masterPassword") || "1234";
}

function getSecurityPin(){
  return localStorage.getItem("securityPin") || "1234";
}

function loginMaster() {
  const user = byId("username");
  const pass = byId("password");
  const loginPage = byId("loginPage");
  const appPage = byId("appPage");

  if (!user || !pass || !loginPage || !appPage) return;

  const u = user.value.trim();
  const p = pass.value.trim();

  if (u === getMasterUser() && p === getMasterPass()) {
    loginPage.style.display = "none";
    appPage.classList.remove("hidden");
    appPage.style.display = "block";

    loadVendorsFromServer();
    loadVentasReport();
    loadBalanceReport();

    goPage("ventas");
  } else {
    alert("Login incorrect");
  }
}

function openMiCuenta(){
  showMasterPage("miCuentaPage");

byId("miCuentaPage").innerHTML =
    '<div class="page-title">Mi Cuenta</div>' +

    '<div class="table-card" style="padding:14px;">' +

      '<div class="field-group">' +
        '<div class="field-label">Nuevo username</div>' +
        '<input id="newUsername" class="field-input" value="' + getMasterUser() + '">' +
      '</div>' +

      '<div class="field-group">' +
        '<div class="field-label">Nuevo password</div>' +
        '<input id="newPassword" type="password" class="field-input" placeholder="Nuevo password">' +
      '</div>' +

      '<div class="field-group">' +
        '<div class="field-label">PIN sécurité actuel</div>' +
        '<input id="securityPin" type="password" class="field-input" placeholder="PIN actuel obligatoire">' +
      '</div>' +

      '<button class="login-btn" onclick="saveAccount()">Guardar cuenta</button>' +

      '<hr style="border:0;border-top:1px solid rgba(255,255,255,.12);margin:22px 0;">' +

      '<div class="page-title" style="font-size:20px;">Changer PIN</div>' +

      '<div class="field-group">' +
        '<div class="field-label">PIN actuel</div>' +
        '<input id="oldSecurityPin" type="password" class="field-input" placeholder="PIN actuel">' +
      '</div>' +

      '<div class="field-group">' +
        '<div class="field-label">Nouveau PIN</div>' +
        '<input id="newSecurityPin" type="password" class="field-input" placeholder="Nouveau PIN">' +
      '</div>' +

      '<button class="login-btn" onclick="changeSecurityPin()">Changer PIN</button>' +

    '</div>';

  currentPage = "cuenta";
  setMenuActive("cuenta");
  closeSideMenu();
}

function saveAccount(){
  const pin = getValue("securityPin").trim();

  if(pin !== getSecurityPin()){
    alert("PIN incorrect");
    return;
  }

  const username = getValue("newUsername").trim();
  const password = getValue("newPassword").trim();

  if(!username){
    alert("Username obligatoire");
    return;
  }

  localStorage.setItem("masterUsername", username);

  if(password){
    localStorage.setItem("masterPassword", password);
  }

  alert("Cuenta guardada ✔");
}

function changeSecurityPin(){
  const oldPin = getValue("oldSecurityPin").trim();
  const newPin = getValue("newSecurityPin").trim();

  if(oldPin !== getSecurityPin()){
    alert("PIN actuel incorrect");
    return;
  }

  if(!newPin){
    alert("Mete nouveau PIN la");
    return;
  }

  localStorage.setItem("securityPin", newPin);

  alert("PIN changé ✔");
  openMiCuenta();
}

async function openLimitesEstadisticas(){
  currentPage = "limites_estadisticas";

  hideAllMasterPages();

  let page = byId("limitesEstadisticasPage");

  if(!page){
    page = document.createElement("div");
    page.id = "limitesEstadisticasPage";
    page.className = "page-block";

    const app = byId("appPage");
    if(app) app.appendChild(page);
  }

  page.classList.remove("hidden");
  page.style.display = "block";

  await loadTicketsReport();

  page.innerHTML =
    '<div class="page-title">Límites de Ventas</div>' +


    '<div class="filters">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
        '<select id="estOrden" class="filter-select" onchange="renderLimitesEstadisticas()">' +
          '<option value="">- ORDEN -</option>' +
          '<option value="mayor">Mayor venta</option>' +
          '<option value="menor">Menor venta</option>' +
        '</select>' +

        '<select id="estLoteria" class="filter-select" onchange="renderLimitesEstadisticas()">' +
          '<option value="">- LOTERIA -</option>' +
        '</select>' +
      '</div>' +

      '<select id="estVendor" class="filter-select" onchange="renderLimitesEstadisticas()">' +
        '<option value="">- VENDEDOR -</option>' +
      '</select>' +

    '</div>' +

    '<div class="table-card" style="padding:14px;margin-top:14px;">' +

      '<div style="display:grid;grid-template-columns:140px 1fr 88px;border:1px solid rgba(255,255,255,.14);border-radius:12px;overflow:hidden;margin-bottom:12px;">' +
        '<select id="estTipo" onchange="renderLimitesEstadisticas()" style="background:#30344f;color:#d7dcef;border:0;border-right:1px solid rgba(255,255,255,.14);font-size:18px;font-weight:800;padding:0 14px;height:58px;">' +
          '<option value="BOR">BORLETTE</option>' +
          '<option value="MAR">MARIAGE</option>' +
          '<option value="L3">LOTO 3</option>' +
          '<option value="L41">LOTO 4</option>' +
          '<option value="L51">LOTO 5</option>' +
        '</select>' +

        '<input id="estNumero" oninput="renderLimitesEstadisticas()" placeholder="#" style="background:#30344f;color:#d7dcef;border:0;font-size:22px;padding:0 22px;outline:none;height:58px;">' +

        '<button onclick="renderLimitesEstadisticas()" style="background:#30344f;color:#d7dcef;border:0;border-left:1px solid rgba(255,255,255,.14);font-size:30px;">⌕</button>' +
      '</div>' +

      '<div id="limitesEstadisticasBody"></div>' +

    '</div>';

  fillLimitesEstadisticasFilters();
  renderLimitesEstadisticas();
  closeSideMenu();
}

function fillLimitesEstadisticasFilters(){
  const lotSel = byId("estLoteria");
  const venSel = byId("estVendor");

  if(lotSel){
    lotSel.innerHTML = '<option value="">- LOTERIA -</option>';

    loteriasList.forEach(function(l){
      if(l === "TODAS") return;
      lotSel.innerHTML += '<option value="' + safe(l).toUpperCase() + '">' + safe(l) + '</option>';
    });
  }

  if(venSel){
    venSel.innerHTML = '<option value="">- VENDEDOR -</option>';

    vendors.forEach(function(v){
      venSel.innerHTML +=
        '<option value="' + safe(v.id).toUpperCase() + '">' +
          safe(v.nombre || v.nom || v.id) +
        '</option>';
    });
  }
}

function renderLimitesEstadisticas(){
  const body = byId("limitesEstadisticasBody");
  if(!body) return;

  const orden = getValue("estOrden");
  const loteriaFilter = getValue("estLoteria");
  const vendorFilter = getValue("estVendor");
  const tipoFilter = getValue("estTipo") || "BOR";
  const numeroFilter = getValue("estNumero").trim();

  const map = {};
  let maxVenta = 0;

  ticketsRows.forEach(function(t){

    let d = "";

    if(t.dateLabel){
      const p = String(t.dateLabel).split("/");
      if(p.length === 3){
        d = p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
      }
    }

    if(!d && t.createdAt){
      const dt = new Date(t.createdAt);
      d =
        dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2,"0") + "-" +
        String(dt.getDate()).padStart(2,"0");
    }

    if(d !== todayISO()) return;

    const st = String(t.status || "").toUpperCase();
    if(st === "ANILE") return;

    const vendorId = safe(t.vendeur).toUpperCase();

    if(vendorFilter && vendorId !== vendorFilter) return;

    (t.jeux || []).forEach(function(j){
      const type = safe(j.type).toUpperCase();
      const lot = safe(j.loterie).toUpperCase();
      const numero = safe(j.numero).trim();
      const montant = parseAmount(j.montant || j.monto || j.amount || 0);

      if(tipoFilter){
        if(tipoFilter === "L41"){
          if(!["L41","L42","L43"].includes(type)) return;
        }else if(tipoFilter === "L51"){
          if(!["L51","L52","L53"].includes(type)) return;
        }else{
          if(type !== tipoFilter) return;
        }
      }

      if(loteriaFilter && lot !== loteriaFilter) return;
      if(numeroFilter && numero !== numeroFilter) return;

      if(!numero) return;

      if(!map[numero]){
        map[numero] = {
          numero: numero,
          venta: 0
        };
      }

      map[numero].venta += montant;

      if(map[numero].venta > maxVenta){
        maxVenta = map[numero].venta;
      }
    });
  });

  let rows = Object.values(map);

  rows.sort(function(a,b){
    if(orden === "menor") return a.venta - b.venta;
    return b.venta - a.venta;
  });

  if(!rows.length){
    body.innerHTML =
      '<div class="empty-state">Pa gen estadísticas pou filtè sa yo</div>';
    return;
  }

  body.innerHTML = rows.map(function(r){
    const pct = maxVenta > 0 ? Math.round((r.venta / maxVenta) * 100) : 0;

    const high = pct >= 100;
    const mid = pct >= 50 && pct < 100;

    const colorBox = high
      ? 'background:#62364e;color:#ff6767;'
      : mid
        ? 'background:#1f5a70;color:#37d7ff;'
        : 'background:#4a4f69;color:#e5e9f8;';

    return '' +
      '<div style="display:grid;grid-template-columns:1fr 150px 74px;gap:8px;align-items:center;margin:10px 0;font-size:24px;">' +
        '<div style="color:#d7dcef;">' + safe(r.numero) + '</div>' +

        '<div style="' +
          colorBox +
          'border-radius:10px;' +
          'padding:10px 12px;' +
          'text-align:right;' +
          'font-weight:800;' +
        '">' +
          formatAmount(r.venta) +
        '</div>' +

        '<div style="' +
          'background:#41465f;' +
          'border-radius:8px;' +
          'padding:10px 8px;' +
          'text-align:center;' +
          'color:#bfc5da;' +
          'font-weight:700;' +
        '">' +
          pct + '%' +
        '</div>' +
      '</div>';
  }).join("");
}

</script>

</body>
</html>
`);
});

module.exports = router;