
const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Ticket = require("./models/Ticket");
const Vendor = require("./models/vendor");

const Sorteo = require("./models/Sorteo");
const Grupo = require("./models/Grupo");
const Limites = require("./models/Limites");
const Loteria = require("./models/Loteria");
const AppConfig = require("./models/AppConfig");
const multer = require("multer");


const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

app.use(
  "/uploads",
  express.static("uploads")
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/number_one_loto_2"
)
.then(async () => {
  console.log("Mongo connecté");
  await loadLimites();
})
.catch(err => console.error("Mongo erreur:", err.message));

mongoose.connection.once("open", async () => {

  try {

    await Ticket.collection.dropIndex("id_1").catch(() => {});
    await Ticket.collection.createIndex({ id: 1 }, { unique: true, sparse: true });

    await Ticket.deleteMany({
      $or: [
        { id: null },
        { id: { $exists: false } },
        { id: "" }
      ]
    });

    console.log("✅ Tickets id null supprimés");

  } catch (err) {
    console.error("Erreur nettoyage tickets null:", err.message);
  }

});

const VENDEURS_FILE = path.join(__dirname, "vendeurs.json");
console.log("INDEX VENDEURS_FILE =", VENDEURS_FILE);

const TICKETS_FILE = path.join(__dirname, "tickets.json");

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

function loadVendeursForLogin() {
  try {
    ensureVendeursFile();
    const raw = fs.readFileSync(VENDEURS_FILE, "utf8").trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (err) {
    console.error("Erreur lecture vendeurs :", err);
    return {};
  }
}

function saveVendeursForLogin(vendeurs) {
  try {
    ensureVendeursFile();
    fs.writeFileSync(VENDEURS_FILE, JSON.stringify(vendeurs, null, 2), "utf8");
  } catch (err) {
    console.error("Erreur sauvegarde vendeurs :", err);
  }
}

function loadTickets() {
  try {
    ensureTicketsFile();
    const raw = fs.readFileSync(TICKETS_FILE, "utf8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erreur lecture tickets :", err);
    return [];
  }
}

function saveTickets(tickets) {
  try {
    ensureTicketsFile();
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), "utf8");
  } catch (err) {
    console.error("Erreur sauvegarde tickets :", err);
  }
}

function formatDateTimeFR(date = new Date()) {
  return date.toLocaleString("fr-FR");
}

function formatDateFR(date = new Date()) {
  return date.toLocaleDateString("fr-FR");
}

function formatTimeFR(date = new Date()) {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatFRDateInput(iso) {
  if (!iso) return "";
  const p = String(iso).split("-");
  if (p.length !== 3) return iso;
  return p[2] + "/" + p[1] + "/" + p[0];
}

function money(n) {
  return Number(n || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
}

function loginErrorPage(message) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Login échoué</title>
<style>
body{
margin:0;
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
background:#f2f2f2;
font-family:Arial,sans-serif;
padding:20px;
}
.box{
width:100%;
max-width:360px;
background:#fff;
border-radius:14px;
padding:24px;
box-shadow:0 8px 22px rgba(0,0,0,.08);
text-align:center;
}
.msg{
color:#d93025;
font-size:20px;
font-weight:700;
margin-bottom:16px;
}
a{
display:inline-block;
margin-top:6px;
text-decoration:none;
color:#3f7fe8;
font-weight:700;
}
</style>
</head>
<body>
<div class="box">
<div class="msg">${message}</div>
<a href="/">Retour</a>
</div>
</body>
</html>
`;
}

function detectDeviceInfo(userAgent = "") {
  const ua = String(userAgent || "");
  const low = ua.toLowerCase();

  let marca = "DESCONOCIDO";
  let modelo = "WEB";
  let version = "?";
  let place = "?";

  if (low.includes("iphone")) {
    marca = "APPLE";
    modelo = "IPHONE";
    place = "TEL";
  } else if (low.includes("ipad")) {
    marca = "APPLE";
    modelo = "IPAD";
    place = "TAB";
  } else if (low.includes("android")) {
    marca = "ANDROID";
    modelo = "ANDROID";
    place = "TEL";
  } else if (low.includes("windows")) {
    marca = "PC";
    modelo = "WINDOWS";
    place = "PC";
  } else if (low.includes("macintosh") || low.includes("mac os")) {
    marca = "APPLE";
    modelo = "MAC";
    place = "PC";
  } else if (low.includes("linux")) {
    marca = "PC";
    modelo = "LINUX";
    place = "PC";
  }

  const chromeMatch = ua.match(/Chrome\/(\d+)/i);
  const safariMatch = ua.match(/Version\/(\d+)/i);
  const firefoxMatch = ua.match(/Firefox\/(\d+)/i);
  const edgMatch = ua.match(/Edg\/(\d+)/i);

  if (chromeMatch) version = chromeMatch[1];
  else if (safariMatch) version = safariMatch[1];
  else if (firefoxMatch) version = firefoxMatch[1];
  else if (edgMatch) version = edgMatch[1];

  return { marca, modelo, version, place };
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || "?";
}

function buildConnectionRow(req, vendeur) {
  const ua = req.headers["user-agent"] || "";
  const device = detectDeviceInfo(ua);
  const now = new Date();

  return {
    id: "DEV-" + Date.now(),
    marca: device.marca,
    modelo: device.modelo,
    version: device.version,
    app: vendeur.app || "2.9.32",
    vinculado: formatDateTimeFR(now),
    last: formatDateTimeFR(now),
    pin: Math.floor(Math.random() * 900) + 100,
    place: device.place,
    ip: getClientIp(req),
    userAgent: ua,
    co: true,
    on: true,
    st: true
  };
}

function normalizeStatus(status = "") {
  const s = String(status || "").trim().toUpperCase();

  if (s === "GANE" || s === "GANADO" || s === "GAGNE" || s === "WON" || s === "GANYE") return "GANYE";
  if (s === "PERDU" || s === "PERDIDO" || s === "LOST" || s === "PEDI") return "PEDI";
  if (s === "ANILE" || s === "ANULE" || s === "ANULADO" || s === "CANCELED") return "ANILE";

  return "ANATAN";
}

function statusLabel(status = "") {
  const s = normalizeStatus(status);
  if (s === "GANYE") return "GANYE";
  if (s === "PEDI") return "PEDI";
  if (s === "ANILE") return "ANILE";
  return "AN ATAN";
}

function getVendorCommissionRate(vendeurObj) {
  const general = Number(
    vendeurObj?.comision?.general ||
    vendeurObj?.comision?.generalComision ||
    vendeurObj?.comision?.generale ||
    0
  );
  if (general > 0) return general / 100;
  return 0.05;
}

function getTicketPremioValue(ticket) {
  const status = normalizeStatus(ticket.status);
  if (status !== "GANYE") return 0;
  return Number(ticket.premio || 0);
}

function computeSummaries() {
  const vendeurs = loadVendeursForLogin();
  const tickets = loadTickets();
  const map = {};

  tickets.forEach((ticket) => {
    const vendeurId = String(ticket.vendeur || "").trim().toUpperCase();
    if (!vendeurId) return;

    if (!map[vendeurId]) {
      const vendeurObj = vendeurs[vendeurId] || {};
      map[vendeurId] = {
  vendeur: vendeurId,
  nombre: String(vendeurObj.nom || vendeurObj.nombre || vendeurId),

  zona: String(
    vendeurObj.zona ||
    vendeurObj.groupe ||
    vendeurObj.grupo ||
    ""
  ),

  venta: 0,
  premios: 0,

  // KOMISYON VENDEUR
  comision: venta * getVendorCommissionRate(vendeurObj),

  // KOMISYON GROUP
  comisionGrupo: venta * (parseAmount(vendeurObj.comision?.zona || 0) / 100),

  resultado: 0,

  tickets: 0,
  balanceAnterior: Number(vendeurObj.config?.credito || 0),
  balanceFinal: 0
};
    }

    const status = normalizeStatus(ticket.status);
    const total = Number(ticket.total || 0);
    const premio = getTicketPremioValue(ticket);

    if (status !== "ANILE") {
      map[vendeurId].venta += total;
      map[vendeurId].tickets += 1;
    }

    if (status === "GANYE") {
      map[vendeurId].premios += premio;
    }
  });

  Object.keys(map).forEach((id) => {
    const vendeurObj = vendeurs[id] || {};
   const rate = getVendorCommissionRate(vendeurObj);

// =========================
// KOMISYON VENDEUR
// =========================
map[id].comision = map[id].venta * rate;

// =========================
// KOMISYON GROUP
// =========================
let grupoRate = Number(
  vendeurObj?.grupoComision ||
  vendeurObj?.groupCommission ||
  vendeurObj?.zonaComision ||
  vendeurObj?.comisionGrupo ||
  0
);

if (grupoRate > 1) {
  grupoRate = grupoRate / 100;
}

map[id].comisionGrupo =
  map[id].venta * grupoRate;

// =========================
// RESULTADO FINAL
// =========================
map[id].resultado =
  map[id].venta -
  map[id].comision -
  map[id].premios;

  });

  return Object.values(map);
}

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Login Vendeur</title>
<style>
*{box-sizing:border-box;}
html,body{
margin:0;
padding:0;
width:100%;
height:100%;
font-family:Arial,sans-serif;
background:#f2f2f2;
}
body{
display:flex;
align-items:center;
justify-content:center;
padding:20px;
}
.login-box{
width:100%;
max-width:380px;
background:#fff;
border-radius:16px;
box-shadow:0 8px 25px rgba(0,0,0,.08);
padding:28px 22px;
}
.title{
text-align:center;
font-size:26px;
font-weight:800;
color:#1c1c1c;
margin-bottom:22px;
}
.sub{
text-align:center;
color:#666;
margin-bottom:20px;
}
.input{
width:100%;
height:52px;
border:1px solid #d8d8d8;
border-radius:10px;
font-size:18px;
padding:0 14px;
margin-bottom:14px;
}
.btn{
width:100%;
height:54px;
border:none;
border-radius:12px;
background:#3f7fe8;
color:#fff;
font-size:22px;
font-weight:700;
cursor:pointer;
}
.note{
margin-top:16px;
color:#888;
font-size:14px;
text-align:center;
}
</style>
</head>
<body>
<form class="login-box" method="POST" action="/login">
<div class="title">NUMBER ONE LOTO 2</div>
<div class="sub">Connexion vendeur</div>
<input class="input" type="text" name="id" placeholder="Identifiant" autocomplete="username" required>
<input class="input" type="password" name="password" placeholder="Mot de passe" autocomplete="current-password" required>
<button class="btn" type="submit">CONNECTER</button>
<div class="note">Entrez votre ID vendeur et votre mot de passe</div>
</form>
</body>
</html>
`);
});

app.post("/login", async (req, res) => {
  try {
    const id = String(req.body.id || "").trim().toUpperCase();
    const password = String(req.body.password || "").trim();

    const vendeur = await Vendor.findOne({ id });

    if (!vendeur) {
      return res.send(loginErrorPage("ID pa egziste ✖"));
    }

    const savedPassword = String(vendeur.password || vendeur.clave || "").trim();

    if (password !== savedPassword) {
      return res.send(loginErrorPage("Identifiant ou mot de passe incorrect ✖"));
    }

    if (String(vendeur.estatus || "").toLowerCase() === "bloqueado") {
      return res.send(loginErrorPage("Vandè sa bloke ✖"));
    }

    if (!Array.isArray(vendeur.conexiones)) vendeur.conexiones = [];

    const connRow = buildConnectionRow(req, vendeur);

    const activeConn = vendeur.conexiones.find(c => c && c.st === true);

    if (activeConn) {
      const sameDevice =
        String(activeConn.userAgent || "") === String(connRow.userAgent || "") &&
        String(activeConn.place || "") === String(connRow.place || "") &&
        String(activeConn.marca || "") === String(connRow.marca || "") &&
        String(activeConn.modelo || "") === String(connRow.modelo || "");

      if (sameDevice) {
        activeConn.last = connRow.last;
        activeConn.vinculado = activeConn.vinculado || connRow.vinculado;
        activeConn.ip = connRow.ip;
        activeConn.userAgent = connRow.userAgent;
        activeConn.app = connRow.app;
        activeConn.co = true;
        activeConn.on = true;
        activeConn.st = true;

        vendeur.conexion = activeConn.last;
        if (!vendeur.app) vendeur.app = "2.9.32";

        vendeur.markModified("conexiones");
        await vendeur.save();

        return res.redirect("/dashboard?id=" + encodeURIComponent(id));
      }

      return res.send(loginErrorPage("ID sa konekte deja ✖"));
    }

    vendeur.conexiones.push(connRow);
    vendeur.conexion = connRow.last;
    if (!vendeur.app) vendeur.app = "2.9.32";

    vendeur.markModified("conexiones");
    await vendeur.save();

    return res.redirect("/dashboard?id=" + encodeURIComponent(id));

  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    return res.send(loginErrorPage("Erreur login ✖"));
  }
});

app.get("/logout", (req, res) => {
  const sellerId = String(req.query.id || "").trim().toUpperCase();
  if (sellerId) {
    const vendeurs = loadVendeursForLogin();
    const vendeur = vendeurs[sellerId];
    if (vendeur && Array.isArray(vendeur.conexiones)) {
      vendeur.conexiones = vendeur.conexiones.map((c) => ({
        ...c,
        co: false,
        on: false,
        st: false,
        last: formatDateTimeFR(new Date())
      }));
      vendeur.conexion = "";
      saveVendeursForLogin(vendeurs);
    }
  }
  res.redirect("/");
});

function clean(v){
  return String(v || "").trim().replace(/\s+/g, "");
}

function pad2(v){
  const s = clean(v);
  if (/^\d$/.test(s)) return "0" + s;
  return s;
}

function payout(config, key, def = 0){
  const val = key.split(".").reduce((o, k) => o && o[k], config);
  const n = Number(val);
  return isNaN(n) ? def : n;
}

function getGain(j, tirage, config){
  if (!tirage) return 0;

  const type = clean(j.type).toUpperCase();
  const num = clean(j.numero);
  const montant = Number(j.montant || 0);

  const r1 = clean(tirage.r1);
  const r2 = pad2(tirage.r2);
  const r3 = pad2(tirage.r3);
  const r4 = pad2(tirage.r4);

  let pay = 0;

  // =========================
  // BORLETTE
  // =========================
  if(type === "BOR"){
    const played = pad2(num);

    if(played === r2){
      pay = payout(config, "premios.borlette1", 55);
    }

    else if(played === r3){
      pay = payout(config, "premios.borlette2", 20);
    }

    else if(played === r4){
      pay = payout(config, "premios.borlette3", 10);
    }
  }

  // =========================
  // MARIAGE
  // =========================
  else if(type === "MAR"){
    const combos = [
      r2 + "*" + r3,
      r2 + "*" + r4,
      r3 + "*" + r4
    ];

    if(combos.includes(num)){
      pay = payout(config, "premios.mariage", 1000);
    }
  }

  // =========================
  // LOTO 3
  // =========================
  else if(type === "L3"){
    const l3 = r1 + r2;

    if(num === l3){
      pay = payout(config, "premios.loto3", 500);
    }
  }

  // =========================
  // LOTO 4
  // =========================
  else if(type === "L41"){
    const l41 = r3 + r4;

    if(num === l41){
      pay = payout(config, "premios.l41", 5000);
    }
  }

  else if(type === "L42"){
    const l42 = r2 + r4;

    if(num === l42){
      pay = payout(config, "premios.l42", 5000);
    }
  }

  else if(type === "L43"){
    const l43 = r2 + r3;

    if(num === l43){
      pay = payout(config, "premios.l43", 5000);
    }
  }

  // =========================
  // LOTO 5
  // =========================
  else if(type === "L51"){
    const l51 = r1 + r2 + r3;

    if(num === l51){
      pay = payout(config, "premios.l51", 25000);
    }
  }

  else if(type === "L52"){
    const l52 = r1 + r2 + r4;

    if(num === l52){
      pay = payout(config, "premios.l52", 25000);
    }
  }

  else if(type === "L53"){
    const lastR2 = r2.slice(-1);
    const l53 = lastR2 + r3 + r4;

    if(num === l53){
      pay = payout(config, "premios.l53", 25000);
    }
  }

  return montant * pay;
}

function money(v){
  return Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

app.post("/api/check-limit-game", async (req, res) => {
  try {
    const sellerId = String(req.body.sellerId || "").trim().toUpperCase();
    const type = normGameType(req.body.type);
    const numero = String(req.body.numero || "").trim();
    const loterie = String(req.body.loterie || "").trim().toUpperCase();
    const montant = Number(req.body.montant || 0);

    const vendor = await Vendor.findOne({ id: sellerId }).lean();
    if (!vendor) return res.json({ ok:false, message:"Vandè pa jwenn" });

    const credit = Number(vendor?.config?.credito || vendor?.credito || 0);

if (credit <= 0) {
  return res.json({
    ok:false,
    message:"OU BLOKE POU BALANS TANPRI RANPLI KONSISYON OU!"
  });
}

    const limites = limitesAjustes || {};

    const bloques = Array.isArray(limites.bloqueoNumeros) ? limites.bloqueoNumeros : [];

    const blocked = bloques.some(b => {
      if (typeof b === "string") return b.trim() === numero;
      return String(b.numero || "").trim() === numero &&
        (!b.type || String(b.type).toUpperCase() === type);
    });

    if (blocked) {
      return res.json({ ok:false, message:
  "❌ " + loterie + "\n" +
  type + " " + numero + "\n\n" +
  "Nimewo sa bloke.\n" +
  "Ou pa ka vann jwèt sa."});
    }

    let limit = 0;

    if (type === "BOR") limit = Number(limites.borlette || 0);
    else if (type === "MAR") limit = Number(limites.mariage || 0);
    else if (type === "L3") limit = Number(limites.loto3 || 0);
   else if (type === "L41" || type === "L42" || type === "L43") limit = Number(limites.loto4 || 0);
else if (type === "L51" || type === "L52" || type === "L53") limit = Number(limites.loto5 || 0);

const special = (limites.limiteNumeros || []).find(x =>
  normGameType(x.type) === type &&
  String(x.numero || "").trim() === numero
);

if (special) {
  limit = Number(special.monto || special.montant || special.limit || special.limite || 0);
}

    if (limit <= 0) {
      return res.json({ ok:true });
    }

    const today = new Date().toLocaleDateString("fr-FR");

 const tickets = await Ticket.find({
  status: { $ne:"ANILE" }
}).lean();

    let dejaVendu = 0;

    tickets.forEach(t => {
      (t.jeux || []).forEach(j => {
        if (
          String(j.type || "").toUpperCase() === type &&
          String(j.numero || "").trim() === numero &&
          String(j.loterie || "").trim().toUpperCase() === loterie
        ) {
          dejaVendu += Number(j.montant || 0);
        }
      });
    });

    const reste = limit - dejaVendu;

    console.log("LIMIT DEBUG:", {
  sellerId,
  type,
  numero,
  loterie,
  limit,
  dejaVendu,
  reste
});

    if (reste <= 0) {
      return res.json({ ok:false, message:
  "❌ " + loterie + "\n" +
  type + " " + numero + "\n\n" +
  "Limit: " + limit.toFixed(2) + "\n" +
  "Deja vann: " + dejaVendu.toFixed(2) + "\n" +
  "Rès disponib: 0.00\n\n" +
  "Limit nimewo sa fini."});
    }

    if (montant > reste) {
      return res.json({
        ok:false,
        message:
  "❌ " + loterie + "\n" +
  type + " " + numero + "\n\n" +
  "Limit: " + limit.toFixed(2) + "\n" +
  "Deja vann: " + dejaVendu.toFixed(2) + "\n" +
  "Rès disponib: " + reste.toFixed(2) + "\n\n" +
  "Ou te mande: " + montant.toFixed(2) + "\n" +
  "Ou ka vann sèlman: " + reste.toFixed(2)
      });
    }

    res.json({ ok:true });

  } catch (err) {
    console.error("CHECK LIMIT ERROR:", err);
    res.json({ ok:false, message:"Erreur limit" });
  }
});

let limitesAjustes = {
  borlette: 0,
  mariage: 0,
  loto3: 0,
  loto4: 0,
  loto5: 0,
  limiteNumeros: [],
  bloqueoNumeros: []
};

async function loadLimites(){
  try{

    const saved = await Limites.findOne().lean();

    if(saved){
      limitesAjustes = {
        borlette: Number(saved.borlette || 0),
        mariage: Number(saved.mariage || 0),
        loto3: Number(saved.loto3 || 0),
        loto4: Number(saved.loto4 || 0),
        loto5: Number(saved.loto5 || 0),

        limiteNumeros: Array.isArray(saved.limiteNumeros)
          ? saved.limiteNumeros
          : [],

        bloqueoNumeros: Array.isArray(saved.bloqueoNumeros)
          ? saved.bloqueoNumeros
          : []
      };

      console.log("✅ LIMITES CHARGÉS");
    }

  }catch(err){
    console.error("LOAD LIMITES ERROR:", err);
  }
}

app.post("/api/limites-ajustes", async (req,res)=>{
  try{

  limitesAjustes = {
  borlette: Number(req.body.borlette || 0),
  mariage: Number(req.body.mariage || 0),
  loto3: Number(req.body.loto3 || 0),
  loto4: Number(req.body.loto4 || 0),
  loto5: Number(req.body.loto5 || 0),

  limiteNumeros: Array.isArray(req.body.limiteNumeros)
    ? req.body.limiteNumeros
    : [],

  bloqueoNumeros: Array.isArray(req.body.bloqueoNumeros)
    ? req.body.bloqueoNumeros
    : []
};

await Limites.findOneAndUpdate(
  {},
  limitesAjustes,
  {
    upsert:true,
    new:true
  }
);


    console.log("✅ LIMITES SAUVEGARDÉS MONGO");

    res.json({
      ok:true
    });

  }catch(err){

    console.error("LIMITES ERROR:", err);

    res.json({
      ok:false,
      message:"Erreur serveur"
    });

  }
});

app.get("/api/limites-ajustes", async (req,res)=>{
  try{
    let data = await Limites.findOne().lean();

    if(!data){
      data = {
        borlette:0,
        mariage:0,
        loto3:0,
        loto4:0,
        loto5:0,
        limiteNumeros:[],
        bloqueoNumeros:[]
      };
    }

    limitesAjustes = data;
    res.json({ ok:true, limites:data });

  }catch(err){
    res.json({ ok:false, message:"Erreur load limites" });
  }
});

// GET tickets pa vendeur
app.get("/api/vendor/:id/tickets", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const sellerId = String(req.params.id || "").trim().toUpperCase();

const vendor = await Vendor.findOne({ id: sellerId }).lean();
const vendorConfig = vendor || {};

    const tickets = await Ticket.find({ vendeur: sellerId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const dates = [...new Set(tickets.map(t => String(t.dateLabel || "").trim()).filter(Boolean))];

    const sorteos = await Sorteo.find({ date: { $in: dates } }).lean();

    const sorteoMap = {};
    sorteos.forEach(s => {
      const key =
        String(s.date || "").trim() + "|" +
        String(s.loteria || "").trim().toUpperCase();

      sorteoMap[key] = s;
    });

    function clean(v){
      return String(v || "").trim().replace(/\s+/g, "");
    }

    function pad2(v){
      const s = clean(v);
      if (/^\d$/.test(s)) return "0" + s;
      return s;
    }

    function gameWin(j, tirage){
      const type = String(j.type || "").trim().toUpperCase();
      const played = clean(j.numero);

      const r1 = clean(tirage.r1);  // tèt
      const r2 = pad2(tirage.r2);
      const r3 = pad2(tirage.r3);
      const r4 = pad2(tirage.r4);

      if (type === "BOR") {
        return [r2, r3, r4].includes(pad2(played));
      }

      if (type === "L3") {
        return played === (r1 + r2); // 5 + 55 = 555
      }

      if (type === "MAR") {
        return [
          r2 + "*" + r3,
          r2 + "*" + r4,
          r3 + "*" + r4
        ].includes(played);
      }

      return false;
    }

    const cleanTickets = tickets.map(t => {
      const date = String(t.dateLabel || "").trim();
      let totalGain = 0;
      let hasResult = false;

      const jeux = (t.jeux || []).map(j => {
        const lot = String(j.loterie || "").trim().toUpperCase();
        const tirage = sorteoMap[date + "|" + lot];

let gain = 0;

if (tirage) {
  const hasBalls =
    String(tirage.r1 || "").trim() ||
    String(tirage.r2 || "").trim() ||
    String(tirage.r3 || "").trim() ||
    String(tirage.r4 || "").trim();

  if (hasBalls) {
    hasResult = true;

    gain = getGain(j, tirage, vendorConfig);
    totalGain += gain;
  }
}

return {
  type: j.type,
  numero: j.numero,
  loterie: j.loterie,
  montant: Number(j.montant || 0),
  gain: gain,
gainLabel: money(gain)
};
      });

      const realId = t.id || t.ticketId || t.serial || String(t._id || "");

      return {
        id: realId,
        ticketId: realId,
        serial: realId,
        vendeur: t.vendeur,
        vendeurNom: t.vendeurNom,
        createdAt: t.createdAt,
        createdAtLabel: t.createdAtLabel,
        dateLabel: t.dateLabel,
        timeLabel: t.timeLabel,
        total: Number(t.total || 0),
        jeux: jeux,
        premio: totalGain,
premioLabel: money(totalGain),
        status: String(t.status || "").trim().toUpperCase() === "ANILE"
  ? "ANILE"
  : (!hasResult ? "ANATAN" : (totalGain > 0 ? "GANYE" : "PEDI"))
      };
    });

    res.json(cleanTickets);

  } catch (err) {
    console.error("GET TICKETS ERROR:", err);
    res.status(500).json([]);
  }
});


app.get("/check-tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find({
      status: { $ne: "ANILE" }
    });

    let checked = 0;

    for (let ticket of tickets) {
      let hasResult = false;
      let isWinner = false;
      let totalPremio = 0;

      for (let jeu of ticket.jeux || []) {
        jeu.gain = 0;

        const lot = String(jeu.loterie || "").trim().toUpperCase();
        const date = String(ticket.dateLabel || "").trim();

        const tirage = await Sorteo.findOne({
          date: date,
          loteria: {
            $regex: "^" + lot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
            $options: "i"
          }
        }).lean();

        if (!tirage) continue;

        const r1 = String(tirage.r1 || "").trim();
        const r2 = String(tirage.r2 || "").trim();
        const r3 = String(tirage.r3 || "").trim();
        const r4 = String(tirage.r4 || "").trim();

        if (!r1 && !r2 && !r3 && !r4) continue;

        hasResult = true;

        const won = isWinningGame(jeu, tirage);

        if (won) {
          isWinner = true;
          const gain = Number(jeu.montant || 0);
          jeu.gain = gain;
          totalPremio += gain;
        }
      }

ticket.jeux = (ticket.jeux || []).map(j => ({ ...j, gain: 0 }));

for (let jeu of ticket.jeux || []) {
  if (isWinningGame(jeu, tirage)) {
    const gain = Number(jeu.montant || 0);

    jeu.gain = gain;
    isWinner = true;
    totalPremio += gain;
  }
}

ticket.markModified("jeux");

      ticket.status = !hasResult ? "ANATAN" : (isWinner ? "GANYE" : "PEDI");
      ticket.premio = isWinner ? totalPremio : 0;
      ticket.updatedAt = new Date();

      ticket.markModified("jeux");
      await ticket.save();
      checked++;
    }

    res.json({
      ok: true,
      message: "Tickets vérifiés",
      checked
    });

  } catch (err) {
    console.error("CHECK TICKETS ERROR:", err);
    res.status(500).json({
      ok: false,
      message: "Erreur check tickets",
      error: err.message
    });
  }
});


function pad2(v){
  const s = String(v || "").trim();
  if (/^\d$/.test(s)) return "0" + s;
  return s;
}

function isWinningGame(j, result){
  const type = String(j.type || "").trim().toUpperCase();
  const played = String(j.numero || "").trim();

  const r1 = String(result.r1 || "").trim();
  const r2 = pad2(result.r2);
  const r3 = pad2(result.r3);
  const r4 = pad2(result.r4);

  // BOR
  if(type === "BOR"){
    return [r2, r3, r4].includes(pad2(played));
  }

  // L3
  if(type === "L3"){
    return played === (r1 + r2 + r3);
  }

  // MAR
  if(type === "MAR"){
    return [
      r2 + "*" + r3,
      r2 + "*" + r4,
      r3 + "*" + r4
    ].includes(played);
  }

  return false;
}

function normGameType(v){
  const s = String(v || "").trim().toUpperCase();

  if (s === "BORLETTE" || s === "BOR") return "BOR";
  if (s === "MARIAGE" || s === "MAR") return "MAR";

  if (s === "LOTO 3" || s === "L3") return "L3";

  if (s === "L41") return "L41";
  if (s === "L42") return "L42";
  if (s === "L43") return "L43";

  if (s === "L51") return "L51";
  if (s === "L52") return "L52";
  if (s === "L53") return "L53";

  if (s === "LOTO 4" || s === "L4") return "L41";
  if (s === "LOTO 5" || s === "L5") return "L51";

  return s;
}

function getFreeMariageCount(total){
  total = Number(total || 0);

  if(total < 50) return 0;

  return Math.min(
    5,
    Math.floor(total / 50)
  );
}

function randomFreeMariage(){
  const a = String(Math.floor(Math.random() * 100)).padStart(2, "0");

  let b = String(Math.floor(Math.random() * 100)).padStart(2, "0");

  while(b === a){
    b = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  }

  return a + "x" + b;
}

function buildFreeMariagesForTicket(tirages, jeux, appConfig, vendor){

  const mg = appConfig.mariageGratis || {};
  const cfg = vendor?.config || {};

  const vendorBonus =
    vendor &&
    (
      vendor.bono === true ||
      vendor.bonus === true ||
      vendor.activarBono === true ||
      String(vendor.bono) === "true" ||
      String(vendor.bonus) === "true" ||
      String(vendor.activarBono) === "true" ||
      cfg.activarBono === true ||
      String(cfg.activarBono) === "true"
    );

  if(!mg.enabled || !vendorBonus){
    return [];
  }

  const totalsByLoterie = {};

  (jeux || []).forEach(j => {
    if(j.gratis === true || j.free === true) return;

    const loterieName =
      String(j.loterie || j.loteria || "")
        .trim()
        .toUpperCase();

    if(!loterieName) return;

    totalsByLoterie[loterieName] =
      (totalsByLoterie[loterieName] || 0) +
      Number(j.montant || 0);
  });

  const gratuits = [];

  Object.keys(totalsByLoterie).forEach(loterieName => {

    const count =
      getFreeMariageCount(totalsByLoterie[loterieName]);

    for(let i = 0; i < count; i++){

      gratuits.push({
        type: "MAR",
        numero: randomFreeMariage(),
        montant: 0,
        gratis: true,
        free: true,
        payoutGratis: Number(mg.payout || 1000),
        loterie: loterieName,
        loteria: loterieName
      });

    }

  });

  return gratuits;
}


app.post("/api/tickets", async (req, res) => {
  try {
    const sellerId = String(req.body.sellerId || "").trim().toUpperCase();
    const sellerName = String(req.body.sellerName || sellerId || "VENDEUR");

    const jeux = Array.isArray(req.body.jeux) ? req.body.jeux : [];
    const channel = String(req.body.channel || "MANUEL").trim().toUpperCase();

    const clientCreatedAt = String(req.body.clientCreatedAt || "");
    const clientDateLabel = String(req.body.clientDateLabel || "");
    const clientTimeLabel = String(req.body.clientTimeLabel || "");

    if (!sellerId) {
      return res.status(400).json({ ok: false, message: "sellerId obligatoire" });
    }

    if (!jeux.length) {
      return res.status(400).json({ ok: false, message: "Pa gen jwèt" });
    }

  const safeJeux = jeux.map(j => ({
  type: normGameType(j.type),
  numero: String(j.numero || "").trim(),
  loterie: String(j.loterie || "").trim().toUpperCase(),
  montant: Number(j.montant || 0)
})).filter(j => j.type && j.numero && j.loterie && j.montant > 0);

    if (!safeJeux.length) {
      return res.status(400).json({ ok: false, message: "Jwèt yo pa valid" });
    }

for (const j of safeJeux) {
  const limites = limitesAjustes || {};
  const type = normGameType(j.type);

  const bloques = Array.isArray(limites.bloqueoNumeros)
    ? limites.bloqueoNumeros
    : [];

  const blocked = bloques.some(b => {
    if (typeof b === "string") return b.trim() === j.numero;

    return String(b.numero || "").trim() === j.numero &&
      (!b.type || normGameType(b.type) === type);
  });

  if (blocked) {
    return res.status(403).json({
      ok:false,
      message:
  "❌ " + loterie + "\n" +
  type + " " + numero + "\n\n" +
  "Nimewo sa bloke.\n" +
  "Ou pa ka vann jwèt sa."
    });
  }

  let limit = 0;

  if (type === "BOR") limit = Number(limites.borlette || 0);
  else if (type === "MAR") limit = Number(limites.mariage || 0);
  else if (type === "L3") limit = Number(limites.loto3 || 0);
  else if (type === "L41" || type === "L42" || type === "L43") limit = Number(limites.loto4 || 0);
  else if (type === "L51" || type === "L52" || type === "L53") limit = Number(limites.loto5 || 0);

const special = (limites.limiteNumeros || []).find(x =>
  normGameType(x.type) === type &&
  String(x.numero || "").trim() === String(j.numero || "").trim()
);

if (special) {
  limit = Number(special.monto || special.montant || special.limit || special.limite || 0);
}

  if (limit > 0) {
    const tickets = await Ticket.find({
      status: { $ne: "ANILE" },
      "jeux.numero": String(j.numero || "").trim(),
      "jeux.loterie": String(j.loterie || "").trim().toUpperCase()
    }).lean();

    let dejaVendu = 0;

    tickets.forEach(t => {
      (t.jeux || []).forEach(old => {
        if (
          normGameType(old.type) === type &&
          String(old.numero || "").trim() === String(j.numero || "").trim() &&
          String(old.loterie || "").trim().toUpperCase() === String(j.loterie || "").trim().toUpperCase()
        ) {
          dejaVendu += Number(old.montant || 0);
        }
      });
    });

    const reste = limit - dejaVendu;

    if (reste <= 0) {
      return res.status(403).json({
        ok:false,
        message:
  "❌ " + loterie + "\n" +
  type + " " + numero + "\n\n" +
  "Limit: " + limit.toFixed(2) + "\n" +
  "Deja vann: " + dejaVendu.toFixed(2) + "\n" +
  "Rès disponib: 0.00\n\n" +
  "Limit nimewo sa fini."
      });
    }

    if (Number(j.montant || 0) > reste) {
      return res.status(403).json({
        ok:false,
        message:
  "❌ " + loterie + "\n" +
  type + " " + numero + "\n\n" +
  "Limit: " + limit.toFixed(2) + "\n" +
  "Deja vann: " + dejaVendu.toFixed(2) + "\n" +
  "Rès disponib: " + reste.toFixed(2) + "\n\n" +
  "Ou te mande: " + montant.toFixed(2) + "\n" +
  "Ou ka vann sèlman: " + reste.toFixed(2)
      });
    }
  }
}

    const vendor = await Vendor.findOne({ id: sellerId }).lean();

if (!vendor) {
  return res.status(404).json({ ok:false, message:"Vandè pa jwenn" });
}

const credit = Number(vendor?.config?.credito || vendor?.credito || 0);

if (credit <= 0) {
  return res.status(403).json({
    ok:false,
    message:"OU BLOKE POU BALANS TANPRI RANPLI KONSISYON OU!"
  });
}


const grupo = await Grupo.findOne({
  nombre: vendor.zona || vendor.groupe
}).lean();

if (grupo && grupo.estatus === "Bloqueado") {
  return res.status(403).json({
    ok:false,
    message:"Grupo sa bloke. Ou pa ka fè tikè."
  });
}


function getLimit(limites, type){
  if (type === "BOR") return Number(limites.borlette || limites.bor || limites.BOR || 0);

  if (type === "MAR") return Number(limites.mariage || limites.mar || limites.MAR || 0);

  if (type === "L3") return Number(limites.loto3 || limites.l3 || limites.L3 || 0);

  if (type === "L41" || type === "L42" || type === "L43") {
    return Number(limites.loto4 || limites.l4 || limites.L4 || 0);
  }

  if (type === "L51" || type === "L52" || type === "L53") {
    return Number(limites.loto5 || limites.l5 || limites.L5 || 0);
  }

  return 0;
}

const vendorLimites = vendor.limites || vendor.limits || {};

for (const j of safeJeux) {

  const type = String(j.type || "").trim().toUpperCase();

  const vendorLimit = getLimit(vendorLimites, type);

  if (vendorLimit > 0 && Number(j.montant || 0) > vendorLimit) {

    return res.status(403).json({
      ok:false,
      message:"Limit vandè a se " + vendorLimit.toFixed(2)
    });

  }
}

const lotNames = [...new Set(safeJeux.map(j => String(j.loterie || "").trim().toUpperCase()))];

const lotRows = await Loteria.find({
  name: { $in: lotNames }
}).lean();

const lotMap = {};
lotRows.forEach(l => {
  lotMap[String(l.name || "").trim().toUpperCase()] = l;
});

function minutesNowServer(){
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function minutesFromTimeServer(t){
  const p = String(t || "00:00").split(":");
  return (Number(p[0] || 0) * 60) + Number(p[1] || 0);
}

function isLoteriaOpenServer(l){
  if(!l) return true;

  if(String(l.estatus || "Activo").toLowerCase() !== "activo"){
    return false;
  }

  const nowM = minutesNowServer();
  const openM = minutesFromTimeServer(l.openTime || "00:00");
  const closeM = minutesFromTimeServer(l.closeTime || "23:59");

  if(openM <= closeM){
    return nowM >= openM && nowM < closeM;
  }

  return nowM >= openM || nowM < closeM;
}

for(const j of safeJeux){
  const lotKey = String(j.loterie || "").trim().toUpperCase();
  const lot = lotMap[lotKey];

  if(!isLoteriaOpenServer(lot)){
    return res.status(403).json({
      ok:false,
      message:"Lotri sa fèmen: " + lotKey
    });
  }
}

    const now = clientCreatedAt ? new Date(clientCreatedAt) : new Date();

    const total = safeJeux.reduce((sum, j) => sum + Number(j.montant || 0), 0);
    const tirages = [...new Set(
      safeJeux.map(j => String(j.loterie || "").trim().toUpperCase())
    )];

    const ticketId =
      "T" + Date.now().toString() +
      Math.random().toString(36).substring(2, 8).toUpperCase();

      const appConfig =
  await AppConfig.findOne({ key:"main" }).lean()
  || {};

const freeMariages =
  buildFreeMariagesForTicket(
  tirages,
  jeux,
  appConfig,
  vendor
)

const finalJeux = jeux
  .filter(j =>
    !(j.gratis === true || j.free === true)
  )

    const ticket = await Ticket.create({
      id: ticketId,
      ticketId: ticketId,
      serial: ticketId,

      vendeur: sellerId,
      vendeurNom: sellerName,

      createdAt: now,
      createdAtLabel: clientDateLabel && clientTimeLabel
        ? clientDateLabel + " " + clientTimeLabel
        : now.toLocaleString("fr-FR"),

      dateLabel: clientDateLabel || now.toLocaleDateString("fr-FR"),
      timeLabel: clientTimeLabel || now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),

      // ✅ Tikè toujou ANATAN lè li fèt
      status: "ANATAN",
      premio: 0,

      channel,
      total,
      tirages,
      jeux: finalJeux
    });

    const obj = ticket.toObject();

    console.log("✅ Ticket créé:", ticketId, "ANATAN");

    return res.json({
      ok: true,
      ticket: {
        ...obj,
        id: ticketId,
        ticketId: ticketId,
        serial: ticketId
      }
    });

  } catch (err) {
    console.error("❌ SAVE TICKET ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

app.get("/api/vendor/sorteos", async (req, res) => {
  try {
    function toFRDate(value) {
      if (!value) return "";
      const s = String(value).trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const p = s.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
      }

      return s;
    }

    const date = toFRDate(String(req.query.date || "").trim());

    const rows = await Sorteo.find(date ? { date } : {}).lean();

    const obj = {};

    rows.forEach(r => {
      obj[String(r.loteria || "").trim().toUpperCase()] = {
        r1: r.r1 || "",
        r2: r.r2 || "",
        r3: r.r3 || "",
        r4: r.r4 || ""
      };
    });

    res.json(obj);
  } catch (err) {
    console.error("Erreur vendor sorteos:", err);
    res.status(500).json({});
  }
});

app.post("/api/ticket-status", async (req, res) => {
  try {
    const ticketId = String(req.body.id || "").trim();
    const status = normalizeStatus(req.body.status);
    const premio = Number(req.body.premio || 0);

    const ticket = await Ticket.findOne({
      $or: [
        { id: ticketId },
        { ticketId: ticketId },
        { serial: ticketId }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ ok: false, message: "Ticket introuvable" });
    }

    const currentStatus = normalizeStatus(ticket.status);

    if (status === "ANILE") {
      const createdAt = new Date(ticket.createdAt || Date.now()).getTime();
      const diffMinutes = (Date.now() - createdAt) / 60000;

      if (diffMinutes > 10) {
        return res.json({
          ok: false,
          message: "Ou pa ka anile ticket sa ankò. 10 minit yo pase."
        });
      }

      if (currentStatus === "GANYE" || currentStatus === "PEDI") {
        return res.json({
          ok: false,
          message: "Ticket sa deja trete."
        });
      }
    }

    ticket.status = status;
    ticket.updatedAt = new Date();

    if (status === "GANYE") {
      ticket.premio = premio > 0 ? premio : Number(ticket.premio || 0);
    } else {
      ticket.premio = 0;
    }

    await ticket.save();

    res.json({ ok: true, ticket });

  } catch (err) {
    console.error("UPDATE TICKET STATUS ERROR:", err);
    res.status(500).json({ ok: false, message: "Erreur update ticket" });
  }
});


app.get("/api/master/ventas-summary", (req, res) => {
  res.json(computeSummaries());
});

app.get("/api/master/balance-summary", (req, res) => {
  const summaries = computeSummaries().map((x) => ({
    vendeur: x.vendeur,
    nombre: x.nombre,
    balanceAnterior: x.balanceAnterior,
    resultado: x.resultado,
    balanceFinal: x.balanceFinal
  }));
  res.json(summaries);
});

app.get("/api/vendor/loterias", async (req, res) => {
  try {
    const rows = await Loteria.find().sort({ closeTime: 1 }).lean();

    res.json(rows.map(l => ({
      name: l.name,
      sub: "",
      openTime: l.openTime || "00:00",
      closeTime: l.closeTime || "23:59",
      time: l.closeTime || "23:59",
      estatus: l.estatus || "Activo"
    })));
  } catch (err) {
    console.error("VENDOR LOTERIAS ERROR:", err);
    res.status(500).json([]);
  }
});

app.get("/api/vendor/config", async (req, res) => {
  try {
    let cfg = await AppConfig.findOne({ key: "main" }).lean();

    if (!cfg) {
      cfg = await AppConfig.create({ key: "main" });
      cfg = cfg.toObject();
    }

    res.json({
      ok: true,
      ticketLogo: cfg.ticketLogo || "",
      ticketMessage: cfg.ticketMessage || "",
      mariageGratis: cfg.mariageGratis || {
        enabled: false,
        max: 5,
        stepAmount: 50
      }
    });
  } catch (err) {
    console.error("VENDOR CONFIG ERROR:", err);
    res.status(500).json({
      ok: false,
      ticketLogo: "",
      ticketMessage: "",
      mariageGratis: {
        enabled: false,
        max: 5,
        stepAmount: 50
      }
    });
  }
});

app.post("/api/upload-logo", upload.single("logo"), (req, res) => {
  if(!req.file){
    return res.json({ ok:false });
  }

  res.json({
    ok:true,
    url: "/uploads/" + req.file.filename,
    path: "/uploads/" + req.file.filename
  });
});

app.post("/upload-logo", upload.single("logo"), (req, res) => {
  if(!req.file){
    return res.json({ ok:false });
  }

  res.json({
    ok:true,
    url: "/uploads/" + req.file.filename,
    path: "/uploads/" + req.file.filename
  });
});


app.get("/dashboard", async (req, res) => {
  const sellerId = String(req.query.id || "").trim().toUpperCase();

  const vendeur = await Vendor.findOne({ id: sellerId }).lean() || {};

  const sellerName = String(
    vendeur.nom || vendeur.nombre || sellerId || "VENDEUR"
  );

  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vendeur</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{
margin:0;
padding:0;
width:100%;
height:100%;
overflow-y:auto;
font-family:Arial,sans-serif;
background:#efeff4;
}
body{color:#111;}
.app{
height:100vh;
display:flex;
flex-direction:column;
}
.topbar{
height:60px;
min-height:60px;
background:#3452aa;
color:#fff;
display:grid;
grid-template-columns:60px 1fr 150px;
align-items:center;
}
.top-left,.top-right{
display:flex;
align-items:center;
justify-content:center;
gap:12px;
font-size:24px;
user-select:none;
}
.top-title{
text-align:center;
font-size:24px;
font-weight:800;
white-space:nowrap;
overflow:hidden;
text-overflow:ellipsis;
padding:0 6px;
}
.icon-btn{cursor:pointer;}
.main{
flex:1;
min-height:0;
display:flex;
flex-direction:column;
overflow:hidden;
}
.page{
flex:1;
min-height:0;
display:none;
flex-direction:column;
}
.page.active{display:flex;}
.tickets-area{
flex:1;
min-height:60px;
overflow:auto;
background:#efeff4;
}
.empty-zone{
height:100%;
display:flex;
align-items:center;
justify-content:center;
color:#a9a9a9;
font-size:26px;
font-weight:700;
}
.group-title{
font-size:14px;
font-weight:700;
padding:6px 8px;
background:#e6e6f0;
line-height:1.1;
}
.ticket-row{
display:grid;
grid-template-columns:60px 1fr 80px;
align-items:center;
padding:6px 10px;
font-size:14px;
background:#fff;
border-bottom:1px solid #ececec;
}
.ticket-row div{text-align:center;}
.ticket-row div:first-child{
font-weight:700;
text-align:left;
}
.ticket-row div:last-child{
text-align:right;
}
.summary-bar{
height:42px;
min-height:42px;
background:#dfe3fb;
display:grid;
grid-template-columns:1fr 1fr 1fr;
align-items:center;
font-size:22px;
font-weight:800;
padding:0 12px;
}
.summary-bar .count{
grid-column:2;
display:flex;
align-items:center;
justify-content:center;
text-align:center;
}
.summary-bar .total{
grid-column:3;
display:flex;
align-items:center;
justify-content:flex-end;
text-align:right;
}
.selected-loteries-line{
min-height:40px;
height:40px;
background:#f3f3f3;
border-top:1px solid #ddd;
border-bottom:1px solid #ddd;
display:flex;
align-items:center;
padding:0 12px;
font-size:18px;
color:#444;
overflow:hidden;
white-space:nowrap;
text-overflow:ellipsis;
}
.choice-panel{
display:none;
padding:8px 12px;
background:#efeff4;
}
.choice-grid{
display:grid;
grid-template-columns:repeat(3,1fr);
gap:8px;
}
.choice-chip{
height:56px;
border-radius:12px;
background:#fff;
border:2px solid #d7d7d7;
display:flex;
align-items:center;
justify-content:center;
font-size:24px;
font-weight:800;
cursor:pointer;
user-select:none;
}
.choice-chip.active{
background:#dfe3fb;
border-color:#5b6ff2;
}
.fields{
height:50px;
min-height:50px;
background:#f8f8f8;
display:grid;
grid-template-columns:1fr 1fr 1fr;
position:relative;
border-bottom:1px solid #d0d0d0;
}
.field{
position:relative;
display:flex;
align-items:flex-end;
justify-content:center;
padding:0 8px 8px 8px;
font-size:18px;
color:#979797;
font-weight:500;
user-select:none;
cursor:pointer;
overflow:hidden;
white-space:nowrap;
text-overflow:ellipsis;
}
.field.active{
color:#111;
font-weight:800;
}
.active-line{
position:absolute;
bottom:0;
left:1%;
width:31%;
height:3px;
background:#5b6ff2;
transition:left .18s ease;
}
.active-caret{
position:absolute;
bottom:6px;
width:2px;
height:28px;
background:#ff5d93;
border-radius:3px;
transition:left .18s ease;
left:16%;
animation:blinkCaret 1s steps(1) infinite;
}
@keyframes blinkCaret{
0%,50%{opacity:1;}
50.01%,100%{opacity:0;}
}
.keypad{
height:240px;
min-height:240px;
display:grid;
grid-template-columns:repeat(4,1fr);
grid-template-rows:repeat(4,1fr);
border-top:1px solid #cacaca;
margin-top:4px;
flex-shrink:0;
}
.key{
border:1px solid #cacaca;
background:#f7f7f7;
display:flex;
align-items:center;
justify-content:center;
font-size:24px;
color:#000;
user-select:none;
touch-action:manipulation;
cursor:pointer;
}
.key:active{background:#e3e3e3;}
.key.enter{
background:#f7f7f7;
color:#000;
font-size:22px;
font-weight:700;
}
.bottom-nav{
height:54px;
min-height:54px;
background:#f3f1ff;
border-top:1px solid #d8d8d8;
display:grid;
grid-template-columns:repeat(5,1fr);
align-items:center;
text-align:center;
font-size:15px;
}
.nav-item{
cursor:pointer;
padding:4px 2px;
}
.nav-item.active{
color:#7a6bf2;
font-weight:700;
}
.overlay{
position:fixed;
inset:0;
background:rgba(0,0,0,.22);
z-index:3000;
display:none;
}
.overlay.show{display:block;}
.drawer{
position:fixed;
top:0;
left:-290px;
width:280px;
height:100%;
background:#fff;
z-index:3100;
transition:left .22s ease;
box-shadow:3px 0 16px rgba(0,0,0,.18);
overflow:auto;
}
.drawer.open{left:0;}
.drawer-head{
background:#3452aa;
color:#fff;
padding:22px 18px;
font-size:24px;
font-weight:800;
}
.drawer-item{
padding:17px 18px;
border-bottom:1px solid #eee;
font-size:20px;
cursor:pointer;
}
.options-sheet{
position:fixed;
left:0;
right:0;
bottom:-420px;
background:#fff;
z-index:3200;
transition:bottom .22s ease;
box-shadow:0 -3px 16px rgba(0,0,0,.18);
}
.options-sheet.open{bottom:0;}
.sheet-item{
padding:18px;
border-bottom:1px solid #eee;
font-size:20px;
cursor:pointer;
}
.loterie-modal{
position:fixed;
inset:0;
background:rgba(0,0,0,.35);
z-index:4000;
display:none;
align-items:center;
justify-content:center;
}
.loterie-modal.show{display:flex;}
.loterie-box{
width:92%;
max-width:460px;
max-height:84vh;
background:#fff;
border-radius:12px;
overflow:hidden;
display:flex;
flex-direction:column;
}
.loterie-list{
overflow:auto;
max-height:72vh;
}
.loterie-item{
display:grid;
grid-template-columns:56px 1fr auto;
gap:10px;
align-items:center;
min-height:78px;
padding:8px 12px;
border-bottom:1px solid #ddd;
cursor:pointer;
}
.loterie-check{
width:44px;
height:44px;
border-radius:50%;
background:#d8d8d8;
color:#fff;
display:flex;
align-items:center;
justify-content:center;
font-size:28px;
font-weight:700;
}
.loterie-item.selected .loterie-check{background:#355af2;}
.loterie-name{
font-size:20px;
font-weight:800;
color:#222;
}
.loterie-sub{
margin-top:4px;
font-size:14px;
color:#666;
}
.loterie-time{
color:#76c5ff;
font-size:18px;
font-weight:800;
white-space:nowrap;
}
.modal-actions{
height:74px;
min-height:74px;
background:#f5f5f5;
display:grid;
grid-template-columns:1fr 1fr 1fr;
align-items:center;
justify-items:center;
}
.circle-btn{
width:56px;
height:56px;
border-radius:50%;
display:flex;
align-items:center;
justify-content:center;
font-size:30px;
color:#fff;
user-select:none;
cursor:pointer;
}
.btn-clear{background:#5f628b;}
.btn-ok{background:#1fc7dd;}
.btn-close{background:#c9c9c9;}
.hidden-print-form{display:none;}

.billets-wrap{
flex:1;
overflow:auto;
padding:10px;
}
.billet-card{
background:#fff;
border-radius:14px;
padding:12px;
margin-bottom:10px;
box-shadow:0 4px 12px rgba(0,0,0,.05);
}
.billet-head{
display:flex;
justify-content:space-between;
gap:10px;
align-items:flex-start;
margin-bottom:8px;
}
.billet-code{
font-size:17px;
font-weight:800;
color:#222;
}
.billet-meta{
font-size:13px;
color:#666;
line-height:1.4;
}
.status-badge{
padding:6px 10px;
border-radius:999px;
font-size:12px;
font-weight:800;
white-space:nowrap;
}
.st-anatan{background:#fff3cd;color:#8a6d00;}
.st-ganye{background:#d1f7de;color:#157347;}
.st-pedi{background:#ffe0e0;color:#b42318;}
.st-anile{background:#ececec;color:#555;}
.billet-game{
display:grid;
grid-template-columns:70px 1fr 70px;
gap:6px;
font-size:14px;
padding:4px 0;
border-bottom:1px dashed #eee;
}
.billet-game:last-child{border-bottom:none;}
.billet-actions{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:8px;
margin-top:10px;
}
.small-btn{
border:none;
border-radius:10px;
padding:10px 6px;
font-size:13px;
font-weight:800;
cursor:pointer;
}
.btn-yellow{background:#fff3cd;color:#8a6d00;}
.btn-green{background:#d1f7de;color:#157347;}
.btn-red{background:#ffe0e0;color:#b42318;}
.btn-gray{background:#ececec;color:#555;}
.total-line{
margin-top:8px;
text-align:right;
font-size:15px;
font-weight:800;
}
.copy-wrap{
padding:14px;
display:flex;
flex-direction:column;
gap:12px;
}
.copy-input{
height:52px;
border:1px solid #d6d6d6;
border-radius:12px;
padding:0 14px;
font-size:18px;
background:#fff;
}
.copy-btn{
height:52px;
border:none;
border-radius:12px;
background:#3452aa;
color:#fff;
font-size:18px;
font-weight:800;
cursor:pointer;
}
.copy-note{
font-size:14px;
color:#666;
line-height:1.5;
}
@media (min-width:900px){
body{background:#dfe3ea;}
.app{
max-width:500px;
margin:0 auto;
background:#efeff4;
border-left:1px solid #ddd;
border-right:1px solid #ddd;
}
}

.overlay{
  display:none;
  position:fixed;
  top:0;
  left:0;
  width:100%;
  height:100%;
  background:rgba(0,0,0,.35);
  z-index:10;
}

.overlay.show{
  display:block;
}

#drawer{
  z-index:20;
}

</style>
</head>
<body>
<div class="app">
<div id="overlay" class="overlay" onclick="closeDrawer()"></div>

<div class="topbar">
<div class="top-left">
<span class="icon-btn" onclick="toggleDrawer()">☰</span>
</div>
<div class="top-title">${sellerName}</div>
<div class="top-right">
<span class="icon-btn" onclick="submitPrint()">🖨️</span>
<span class="icon-btn" onclick="shareWhatsApp()">🟢</span>
<span class="icon-btn" onclick="openOptions()">⋮</span>
</div>
</div>

<div class="main">

<div id="salePage" class="page active">
<div id="ticketsArea" class="tickets-area">
<div class="empty-zone">Pas de jeux</div>
</div>

<div class="summary-bar">
<div id="ticketCount" class="count">0</div>
<div id="ticketTotal" class="total">0.00</div>
</div>

<div id="selectedLoteriesLine" class="selected-loteries-line"></div>

<div id="choicePanel" class="choice-panel">
 <div id="choiceList" class="choice-grid"></div>
</div>

<div class="fields">
<div id="numeroLine" class="field active" onclick="tapField(event,'numero')">Numero</div>
<div id="loterieLine" class="field" onclick="setField('loterie')">Loterie</div>
<div id="montantLine" class="field" onclick="tapField(event,'montant')">Montant</div>
<div id="activeLine" class="active-line"></div>
<div id="activeCaret" class="active-caret"></div>
</div>

<div class="keypad">
<div class="key" onclick="press('+')" ontouchstart="press('+'); return false;">+</div>
<div class="key" onclick="press('1')" ontouchstart="press('1'); return false;">1</div>
<div class="key" onclick="press('2')" ontouchstart="press('2'); return false;">2</div>
<div class="key" onclick="press('3')" ontouchstart="press('3'); return false;">3</div>

<div class="key" onclick="press('-')" ontouchstart="press('-'); return false;">-</div>
<div class="key" onclick="press('4')" ontouchstart="press('4'); return false;">4</div>
<div class="key" onclick="press('5')" ontouchstart="press('5'); return false;">5</div>
<div class="key" onclick="press('6')" ontouchstart="press('6'); return false;">6</div>

<div class="key" onclick="press('/')" ontouchstart="press('/'); return false;">/</div>
<div class="key" onclick="press('7')" ontouchstart="press('7'); return false;">7</div>
<div class="key" onclick="press('8')" ontouchstart="press('8'); return false;">8</div>
<div class="key" onclick="press('9')" ontouchstart="press('9'); return false;">9</div>

<div class="key" onclick="press('.')" ontouchstart="press('.'); return false;">.</div>
<div class="key" onclick="backspaceKey()" ontouchstart="backspaceKey(); return false;">⌫</div>
<div class="key" onclick="press('0')" ontouchstart="press('0'); return false;">0</div>
<div class="key enter" onclick="handleEnter()" ontouchstart="handleEnter(); return false;">ENTER</div>
</div>
</div>

<div id="billetsPage" class="page">
<div id="billetsWrap" class="billets-wrap">
<div class="empty-zone">Pa gen billet</div>
</div>
</div>

<div id="copierPage" class="page">
  <div class="copy-wrap">
    <input id="copyTicketId" class="copy-input" placeholder="Mete nimewo seri ticket la">
    <button class="copy-btn" onclick="handleCopyButton()">Copie exacte</button>

    <div class="copy-note">
      Mete nimewo seri ticket la. Si ticket la egziste, jwèt yo ap remonte nan ekran an.
    </div>
  </div>
</div>


<div id="payerPage" class="page">
<div class="empty-zone">Payer ap vini</div>
</div>

<div id="rapportsPage" class="page">
<div class="empty-zone">Rapports ap vini</div>
</div>

<div id="tiragesPage" class="page">
<div id="tiragesWrap" class="billets-wrap"></div>
</div>

<div id="balancePage" class="page">
<div id="balanceWrap" class="billets-wrap"></div>
</div>

<div id="parametrePage" class="page">
<div id="parametreWrap" class="billets-wrap"></div>
</div>

<div id="imprimantePage" class="page">
<div id="imprimanteWrap" class="billets-wrap"></div>
</div>


<div id="drawer" class="drawer">
<div class="drawer-head" style="display:flex;align-items:center;gap:12px;">
<span style="font-size:22px;">NUMBER ONE LOTO 2</span>
</div>
<div class="drawer-item" onclick="openDrawerTirages()">Tirages</div>
<div class="drawer-item" onclick="openDrawerBalance()">Balance</div>
<div class="drawer-item" onclick="openDrawerParametre()">Paramètre</div>
<div class="drawer-item" onclick="openDrawerImprimante()">Imprimante</div>
<div class="drawer-item" onclick="openDrawerUpdate()">Update</div>
<div class="drawer-item" onclick="window.location='/logout?id=${encodeURIComponent(sellerId)}'">Sortir</div>
</div>

<div id="optionsSheet" class="options-sheet">
<div class="sheet-item" onclick="deleteAllGames()">Supprimer</div>
<div class="sheet-item" onclick="autoMarriage()">Maryaj otomatik</div>
<div class="sheet-item" onclick="autoLoto4()">Loto4 otomatik</div>
</div>

<div id="loterieModal" class="loterie-modal">
<div class="loterie-box">
<div id="loterieList" class="loterie-list"></div>
<div class="modal-actions">
<div class="circle-btn btn-clear" onclick="clearLoteries()">🚫</div>
<div class="circle-btn btn-ok" onclick="validateLoteries()">✓</div>
<div class="circle-btn btn-close" onclick="closeLoterieModal()">✕</div>
</div>
</div>
</div>

<form id="printForm" class="hidden-print-form" method="POST" action="/print" target="_blank">
<input type="hidden" name="ticketId" id="printTicketId">
<input type="hidden" name="sellerId" value="${sellerId}">
</form>

<div class="bottom-nav">
<div id="nav-billets" class="nav-item active" onclick="switchPage('billetsPage', this)">Billets</div>
<div id="nav-copier" class="nav-item" onclick="switchPage('copierPage', this)">Copier</div>
<div id="nav-payer" class="nav-item" onclick="switchPage('payerPage', this)">Payer</div>
<div id="nav-rapports" class="nav-item" onclick="switchPage('rapportsPage', this)">Rapports</div>
<div id="nav-menu" class="nav-item" onclick="toggleDrawer()">Menu</div>
</div>
</div>

<script>
var sellerId = ${JSON.stringify(sellerId)};
var sellerName = ${JSON.stringify(sellerName)};

var activeField = "numero";
var numero = "";
var montant = "";
var jeux = [];
var selectedLoteries = [];
var cursorNumero = 0;
var cursorMontant = 0;
var pendingChoiceNumber = "";
var tempChoices = [];
var savedTickets = [];
var currentPageName = "salePage";

var loteries = [];

function getSelectedLoteriesText(){
 return selectedLoteries.length ? selectedLoteries.join(", ") : "";
}

function measureTextWidth(text, el){
 const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement("canvas"));
 const ctx = canvas.getContext("2d");
 const style = window.getComputedStyle(el);
 ctx.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
 return ctx.measureText(text).width;
}

function getFieldValue(field){
 return field === "numero" ? numero : montant;
}

function getCursorValue(field){
 return field === "numero" ? cursorNumero : cursorMontant;
}

function setCursorValue(field, value){
 if(field === "numero") cursorNumero = value;
 else cursorMontant = value;
}

function tapField(event, field){
 activeField = field;
 var el = document.getElementById(field === "numero" ? "numeroLine" : "montantLine");
 var value = getFieldValue(field);
 var rect = el.getBoundingClientRect();
 var clickX = event.clientX;

 if(!value.length){
   setCursorValue(field, 0);
   updateFields();
   return;
 }

 var textWidth = measureTextWidth(value, el);
 var startX = rect.left + ((rect.width - textWidth) / 2);

 var bestIndex = 0;
 var bestDistance = Infinity;

 for(var i = 0; i <= value.length; i++){
   var part = value.slice(0, i);
   var x = startX + measureTextWidth(part, el);
   var dist = Math.abs(clickX - x);

   if(dist < bestDistance){
     bestDistance = dist;
     bestIndex = i;
   }
 }

 setCursorValue(field, bestIndex);
 updateFields();
}

function moveCaret(){
 var caret = document.getElementById("activeCaret");
 var fieldsWrap = document.querySelector(".fields");

 if(activeField === "loterie"){
   caret.style.display = "none";
   return;
 }

 var fieldEl = document.getElementById(activeField === "numero" ? "numeroLine" : "montantLine");
 var value = getFieldValue(activeField);
 var cursorPos = getCursorValue(activeField);

 var wrapRect = fieldsWrap.getBoundingClientRect();
 var fieldRect = fieldEl.getBoundingClientRect();

 var shownText = value || (activeField === "numero" ? "Numero" : "Montant");
 var fullWidth = measureTextWidth(shownText, fieldEl);
 var textStart = fieldRect.left + ((fieldRect.width - fullWidth) / 2);

 var realText = value || "";
 var beforeCursor = realText.slice(0, cursorPos);
 var beforeWidth = measureTextWidth(beforeCursor, fieldEl);

 var caretX = textStart + beforeWidth;

 caret.style.display = "block";
 caret.style.left = (caretX - wrapRect.left) + "px";
}

function updateFields(){
 var numeroLine = document.getElementById("numeroLine");
 var loterieLine = document.getElementById("loterieLine");
 var montantLine = document.getElementById("montantLine");
 var selectedLine = document.getElementById("selectedLoteriesLine");
 var activeLine = document.getElementById("activeLine");

 numeroLine.textContent = numero || "Numero";
 loterieLine.textContent = "Loterie";
 montantLine.textContent = montant || "Montant";
 selectedLine.textContent = getSelectedLoteriesText();

 numeroLine.classList.remove("active");
 loterieLine.classList.remove("active");
 montantLine.classList.remove("active");

 var lineLeft = "1%";

 if(activeField === "numero"){
   numeroLine.classList.add("active");
   lineLeft = "1%";
 }

 if(activeField === "loterie"){
   loterieLine.classList.add("active");
   lineLeft = "34.5%";
 }

 if(activeField === "montant"){
   montantLine.classList.add("active");
   lineLeft = "68%";
 }

 activeLine.style.left = lineLeft;
 moveCaret();
}

function setField(field){
 activeField = field;

 if(field === "numero") cursorNumero = numero.length;
 if(field === "montant") cursorMontant = montant.length;

 updateFields();

 if(field === "loterie"){
   openLoterieModal();
 }
}

function showChoicePanel(options){
 var panel = document.getElementById("choicePanel");
 var list = document.getElementById("choiceList");
 tempChoices = [];
 list.innerHTML = "";

 options.forEach(function(opt){
   var div = document.createElement("div");
   div.className = "choice-chip";
   div.textContent = opt;
   div.onclick = function(){
     if(tempChoices.indexOf(opt) >= 0){
       tempChoices = tempChoices.filter(function(x){ return x !== opt; });
       div.classList.remove("active");
     }else{
       tempChoices.push(opt);
       div.classList.add("active");
     }
   };
   list.appendChild(div);
 });

 panel.style.display = "block";
}

function hideChoicePanel(){
 document.getElementById("choicePanel").style.display = "none";
 document.getElementById("choiceList").innerHTML = "";
 tempChoices = [];
}

function press(val){
 val = String(val);

 if(activeField === "numero"){
   if(val === "+"){
    if(numero.length === 4){
  numero += "+";
  activeField = "montant";
  updateFields();
  return;
}

     if(numero.length === 5){
       pendingChoiceNumber = numero;
       showChoicePanel(["L1","L2","L3"]);
       return;
     }

     return;
   }

   if(val === "/"){
     if(/^\\d{2}$/.test(numero) || /^\\d{4}$/.test(numero)){
       numero = numero + "/";
       cursorNumero = numero.length;
       activeField = "montant";
       cursorMontant = montant.length;
       updateFields();
       return;
     }
     return;
   }

   if(!/[0-9]/.test(val)) return;
   if(numero.indexOf("/") >= 0) return;
   if(numero.length >= 5) return;

   numero = numero.slice(0, cursorNumero) + val + numero.slice(cursorNumero);
   cursorNumero += val.length;
 }else if(activeField === "montant"){
   if(!/[0-9.]/.test(val)) return;
   montant = montant.slice(0, cursorMontant) + val + montant.slice(cursorMontant);
   cursorMontant += val.length;
 }

 updateFields();
}

function backspaceKey(){
 if(activeField === "numero"){
   if(cursorNumero > 0){
     numero = numero.slice(0, cursorNumero - 1) + numero.slice(cursorNumero);
     cursorNumero--;
   }
 }else if(activeField === "montant"){
   if(cursorMontant > 0){
     montant = montant.slice(0, cursorMontant - 1) + montant.slice(cursorMontant);
     cursorMontant--;
   }
 }

 updateFields();
}

function handleEnter(){
 if(document.getElementById("choicePanel").style.display === "block"){
   if(tempChoices.length === 0){
     alert("Chwazi omwen youn");
     return;
   }

   numero = pendingChoiceNumber + "+" + tempChoices.join(",");
   cursorNumero = numero.length;
   hideChoicePanel();

   activeField = "montant";
   cursorMontant = montant.length;
   updateFields();
   return;
 }

 if(activeField === "numero"){
   if(!numero.trim()) return;

   if(selectedLoteries.length > 0){
     activeField = "montant";
     cursorMontant = montant.length;
     updateFields();
     return;
   }

   activeField = "loterie";
   updateFields();
   openLoterieModal();
   return;
 }

 if(activeField === "loterie"){
   validateLoteries();
   return;
 }

 if(activeField === "montant"){
   if(!montant.trim()) return;
   addGame();
   return;
 }
}

function openLoterieModal(){
 document.getElementById("loterieModal").classList.add("show");
 document.getElementById("overlay").classList.add("show");
 renderLoterieList();
}

function closeLoterieModal(){
 document.getElementById("loterieModal").classList.remove("show");
 document.getElementById("overlay").classList.remove("show");
 activeField = "numero";
 updateFields();
}

function clearLoteries(){
 selectedLoteries = [];
 renderLoterieList();
 updateFields();
}

function validateLoteries(){
 document.getElementById("loterieModal").classList.remove("show");
 document.getElementById("overlay").classList.remove("show");

 if(selectedLoteries.length === 0){
   activeField = "loterie";
   updateFields();
   openLoterieModal();
   return;
 }

 activeField = "montant";
 cursorMontant = montant.length;
 updateFields();
}

function toggleLoterie(name){
 var idx = selectedLoteries.indexOf(name);

 if(idx >= 0) selectedLoteries.splice(idx, 1);
 else selectedLoteries.push(name);

 renderLoterieList();
 updateFields();
}

function renderLoterieList(){
  var list = document.getElementById("loterieList");
  list.innerHTML = "";

  var visibleLoteries = loteries.filter(function(item){
    return getLoteriaState(item).open;
  });

  if(!visibleLoteries.length){
    list.innerHTML =
      '<div style="padding:30px;text-align:center;font-size:20px;font-weight:800;color:#888;">' +
        'Pa gen lotri ouvè pou kounya' +
      '</div>';
    return;
  }

  visibleLoteries.forEach(function(item){
    var state = getLoteriaState(item);

    var row = document.createElement("div");
    row.className = "loterie-item" + (selectedLoteries.indexOf(item.name) >= 0 ? " selected" : "");

    row.onclick = function(){
      toggleLoterie(item.name);
    };

    var left = document.createElement("div");
    left.className = "loterie-check";
    left.textContent = selectedLoteries.indexOf(item.name) >= 0 ? "✓" : "";

    var center = document.createElement("div");
    center.innerHTML =
      '<div class="loterie-name">' + item.name + '</div>' +
      '<div class="loterie-sub" style="font-weight:800;color:' + state.color + ';">' +
        state.label +
      '</div>';

    var right = document.createElement("div");
    right.className = "loterie-time";
    right.textContent = item.time || item.closeTime || "";

    row.appendChild(left);
    row.appendChild(center);
    row.appendChild(right);
    list.appendChild(row);
  });
}


function reverse2(s){
 return s.charAt(1) + s.charAt(0);
}

function uniqueStrings(arr){
 var out = [];
 var seen = {};
 arr.forEach(function(x){
   if(!seen[x]){
     seen[x] = true;
     out.push(x);
   }
 });
 return out;
}

function buildSlashMarriageEntries(num){
 var raw = num.slice(0, -1);

 if(/^\\d{2}$/.test(raw)){
   var a2 = raw;
   var ar2 = reverse2(a2);

   return uniqueStrings([a2, ar2]).map(function(x){
     return { type: "BOR", numero: x };
   });
 }

 if(/^\\d{4}$/.test(raw)){
   var a = raw.slice(0,2);
   var b = raw.slice(2,4);
   var ar = reverse2(a);
   var br = reverse2(b);

   return uniqueStrings([
     a + "*" + b,
     a + "*" + br,
     ar + "*" + b,
     ar + "*" + br
   ]).map(function(x){
     var parts = x.split("*");
     if(parts[0] === parts[1]) return null;
     if(parts[0] === reverse2(parts[1])) return null;
     return { type: "MAR", numero: x };
   }).filter(Boolean);
 }

 return null;
}

function buildGameEntries(num){
 num = num.trim();

 if(/^\\d{2}$/.test(num)){
   return [{ type: "BOR", numero: num }];
 }

 if(/^\\d{2}\\/$/.test(num)){
   return buildSlashMarriageEntries(num);
 }

 if(/^\\d{3}$/.test(num)){
   return [{ type: "L3", numero: num }];
 }

 if(/^\\d{4}$/.test(num)){
   return [{ type: "MAR", numero: num.slice(0,2) + "*" + num.slice(2,4) }];
 }

 if(/^\\d{4}\\/$/.test(num)){
   return buildSlashMarriageEntries(num);
 }

if(/^\\d{4}\\+$/.test(num)){
  return [{
    type: "L41",
    numero: num.replace("+", "")
  }];
}

 if(/^\\d{4}\\+(L1|L2|L3)(,(L1|L2|L3))*$/.test(num)){
   var raw4 = num.split("+")[0];
   var types4 = uniqueStrings(num.split("+")[1].split(","));
   return types4.map(function(t){
     return { type: t === "L1" ? "L41" : t === "L2" ? "L42" : "L43", numero: raw4 };
   });
 }

 if(/^\\d{5}\\+(L1|L2|L3)(,(L1|L2|L3))*$/.test(num)){
   var raw5 = num.split("+")[0];
   var types5 = uniqueStrings(num.split("+")[1].split(","));
   return types5.map(function(t){
     return { type: t === "L1" ? "L51" : t === "L2" ? "L52" : "L53", numero: raw5 };
   });
 }

 return null;
}


function mergeOrPushGame(entry){
 var found = jeux.find(function(j){
   return j.type === entry.type && j.numero === entry.numero && j.loterie === entry.loterie;
 });

 if(found){
   found.montant = Number(found.montant) + Number(entry.montant);
 }else{
   jeux.push(entry);
 }
}

function getAutoSourceBalls(){
 var counts = {};

 jeux.forEach(function(j){
   if(j.type === "BOR" && /^\\d{2}$/.test(j.numero)){
     counts[j.numero] = (counts[j.numero] || 0) + 1;
   }
 });

 return counts;
}

function autoMarriage(){
 var counts = getAutoSourceBalls();
 var nums = Object.keys(counts);

 if(nums.length < 2){
   alert("Fòk ou mete omwen 2 boul");
   return;
 }

 if(selectedLoteries.length === 0){
   alert("Chwazi omwen yon loterie");
   return;
 }

 if(!montant.trim()){
   alert("Mete montan an");
   return;
 }

 // 🔥 1. Fè gwoup (12/21, 34/43, etc)
 var groups = [];
 var used = {};

 nums.forEach(function(n){
   if(used[n]) return;

   var r = reverse2(n);

   if(nums.includes(r) && r !== n){
     groups.push([n, r]);
     used[n] = true;
     used[r] = true;
   } else {
     groups.push([n]);
     used[n] = true;
   }
 });

 var results = [];

 // 🔥 2. Travèse gwoup yo nan lòd
 for(var i=0;i<groups.length;i++){
   for(var j=i+1;j<groups.length;j++){

     var g1 = groups[i];
     var g2 = groups[j];

     g1.forEach(function(a){
       g2.forEach(function(b){

         if(a === b) return;
         if(a === reverse2(b)) return;

         results.push(a + "*" + b);
       });
     });
   }
 }

 // 🔥 3. Mete nan jwèt
 results.forEach(function(numeroAuto){
   selectedLoteries.forEach(function(lot){
     mergeOrPushGame({
       type: "MAR",
       numero: numeroAuto,
       loterie: lot,
       montant: parseFloat(montant) || 0
     });
   });
 });

 closeOptions();
 document.getElementById("overlay").classList.remove("show");
 renderJeux();
 updateFields();
}

function autoLoto4(){
 var counts = getAutoSourceBalls();
 var nums = Object.keys(counts);

 if(nums.length < 2){
   alert("Fòk ou mete omwen 2 boul pou L1 otomatik");
   return;
 }

 if(selectedLoteries.length === 0){
   alert("Chwazi omwen yon loterie");
   return;
 }

 if(!montant.trim()){
   alert("Mete montan an");
   return;
 }

 var results = {};

 for(var i=0;i<nums.length;i++){
   for(var j=i+1;j<nums.length;j++){
     var a = nums[i];
     var b = nums[j];

     if(a === b) continue;
     if(a === reverse2(b)) continue;

     results[a + b] = true;
     results[b + a] = true;
   }
 }

 Object.keys(results).forEach(function(numeroAuto){
   selectedLoteries.forEach(function(lot){
     mergeOrPushGame({
       type: "L41",
       numero: numeroAuto,
       loterie: lot,
       montant: parseFloat(montant) || 0
     });
   });
 });

 closeOptions();
 document.getElementById("overlay").classList.remove("show");
 renderJeux();
 updateFields();
}

async function addGame(){
  if(!numero.trim()) return;
  if(!montant.trim()) return;
  if(selectedLoteries.length === 0) return;

  var entries = buildGameEntries(numero);

  if(!entries){
    alert("Jeu pa valid");
    return;
  }

  for (const lot of selectedLoteries) {
    for (const entry of entries) {
      const check = await fetch("/api/check-limit-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: sellerId,
          type: entry.type,
          numero: entry.numero,
          loterie: lot,
          montant: parseFloat(montant) || 0
        })
      }).then(r => r.json());

      if(!check.ok){
        alert(check.message || "Limit pa valid");
        return;
      }
    }
  }

  selectedLoteries.forEach(function(lot){
    entries.forEach(function(entry){
      mergeOrPushGame({
        type: entry.type,
        numero: entry.numero,
        loterie: lot,
        montant: parseFloat(montant) || 0
      });
    });
  });

  numero = "";
  cursorNumero = 0;
  activeField = "numero";

  renderJeux();
  updateFields();
}

function goBackToJeuxFromMenu(){
  var drawer = document.getElementById("drawer");
  var overlay = document.getElementById("overlay");
  var sheet = document.getElementById("optionsSheet");
  var loterieModal = document.getElementById("loterieModal");

  if(drawer) drawer.classList.remove("open");
  if(sheet) sheet.classList.remove("open");
  if(loterieModal) loterieModal.classList.remove("show");
  if(overlay) overlay.classList.remove("show");

  switchPage("salePage", document.getElementById("nav-billets"));
}

function toggleDrawer(){
  closeOptions();

  var drawer = document.getElementById("drawer");
  var overlay = document.getElementById("overlay");

  if(!drawer || !overlay) return;

  drawer.classList.toggle("open");

  if(drawer.classList.contains("open")){
    overlay.classList.add("show");
  }else{
    overlay.classList.remove("show");
    switchPage("salePage", document.getElementById("nav-billets"));
  }
}

function closeDrawer(){
  goBackToJeuxFromMenu();
}

function renderJeux(){
 var area = document.getElementById("ticketsArea");

 if(jeux.length === 0){
   area.innerHTML = '<div class="empty-zone">Pas de jeux</div>';
   document.getElementById("ticketCount").textContent = "0";
   document.getElementById("ticketTotal").textContent = "0.00";
   return;
 }

 var grouped = {};
 var total = 0;

 jeux.forEach(function(j){
   if(!grouped[j.loterie]) grouped[j.loterie] = [];
   grouped[j.loterie].push(j);
   total += Number(j.montant) || 0;
 });

 area.innerHTML = "";

 Object.keys(grouped).forEach(function(name){
   var title = document.createElement("div");
   title.className = "group-title";
   title.textContent = name;
   area.appendChild(title);

   grouped[name].forEach(function(j){
     var row = document.createElement("div");
     row.className = "ticket-row";
     row.innerHTML =
       '<div>' + (j.type === "L41" ? "Loto4" : j.type) + '</div>' +
       '<div>' + j.numero + '</div>' +
       '<div>' + Number(j.montant).toFixed(2) + '</div>';

     row.onclick = function(){
       if(confirm("Supprimer ?")){
         var idx = jeux.indexOf(j);
         if(idx >= 0){
           jeux.splice(idx, 1);
           renderJeux();
         }
       }
     };

     area.appendChild(row);
   });
 });

 document.getElementById("ticketCount").textContent = String(jeux.length);
 document.getElementById("ticketTotal").textContent = total.toFixed(2);
}

function buildPayloadGames(){
 return jeux.map(function(j){
   return {
     type: j.type,
     numero: j.numero,
     loterie: j.loterie,
     montant: Number(j.montant || 0)
   };
 });
}

function buildPrintableTextFromTicket(ticket){
  if(!ticket || !Array.isArray(ticket.jeux)) return "";

  var lines = [];

  ticket.jeux.forEach(function(j){
    lines.push(
      String(j.type || "") + " " +
      String(j.numero || "") + " " +
      Number(j.montant || 0).toFixed(2) +
      " - " +
      String(j.loterie || "")
    );
  });

  return lines.join("\\n");
}


function resetAfterSend(){
 jeux = [];
 numero = "";
 montant = "";
 cursorNumero = 0;
 cursorMontant = 0;
 selectedLoteries = [];

 activeField = "numero";

 renderJeux();
 updateFields();
}

function saveCurrentTicket(channel){
 if(jeux.length === 0){
   alert("Pa gen jwèt pou voye.");
   return Promise.resolve(null);
 }

 return fetch("/api/tickets", {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({
  sellerId: sellerId,
  sellerName: sellerName,
  jeux: buildPayloadGames(),
  channel: channel || "MANUEL",
  clientCreatedAt: new Date().toISOString(),
  clientDateLabel: new Date().toLocaleDateString("fr-FR"),
  clientTimeLabel: new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
})
 }).then(function(res){
   return res.json();
 }).then(function(data){
   if(!data.ok){
     alert(data.message || "Erreur save ticket");
     return null;
   }
   return data.ticket;
 }).catch(function(){
   alert("Erreur save ticket");
   return null;
 });
}

function submitPrint(){
  if(jeux.length === 0){
    alert("Pa gen jwèt pou enprime.");
    return;
  }

  saveCurrentTicket("PRINT").then(function(ticket){
    if(!ticket || !ticket.id){
      alert("Ticket pa kreye oubyen ID pa vini.");
      return;
    }

    window.location.href =
      "/print?ticketId=" + encodeURIComponent(ticket.id) +
      "&sellerId=" + encodeURIComponent(sellerId);

    loadBillets();
    resetAfterSend();
  }).catch(function(err){
    console.error(err);
    alert("Erreur impression");
  });
}

function shareWhatsApp(){
  var waWin = window.open("", "_blank");

  saveCurrentTicket("WHATSAPP").then(function(ticket){
    if(!ticket){
      if(waWin) waWin.close();
      return;
    }

    var text = buildPrintableTextFromTicket(ticket);
    var url = "https://wa.me/?text=" + encodeURIComponent(text);

    if(waWin){
      waWin.location.href = url;
    }

    loadBillets();
    resetAfterSend();
  }).catch(function(){
    if(waWin) waWin.close();
    alert("Erreur WhatsApp");
  });
}

function filterTransactions(list, vendor, start, end){
  return list.filter(t => {
    const okVendor = !vendor || t.vendorId === vendor;

    const d = new Date(t.fecha);
    const okDate =
      (!start || d >= new Date(start)) &&
      (!end || d <= new Date(end));

    return okVendor && okDate;
  });
}

function openOptions(){
 document.getElementById("drawer").classList.remove("open");
 document.getElementById("optionsSheet").classList.add("open");
 document.getElementById("overlay").classList.add("show");
}

function closeOptions(){
 var sheet = document.getElementById("optionsSheet");
 var overlay = document.getElementById("overlay");

 if(sheet) sheet.classList.remove("open");

 var drawerOpen = document.getElementById("drawer")?.classList.contains("open");
 var modalOpen = document.getElementById("loterieModal")?.classList.contains("show");

 if(!drawerOpen && !modalOpen && overlay){
   overlay.classList.remove("show");
 }
}

function deleteAllGames(){
 jeux = [];
 closeOptions();
 document.getElementById("overlay").classList.remove("show");
 renderJeux();
 updateFields();
}

function switchPage(pageId, el){
  if(pageId === "billetsPage" && currentPageName === "billetsPage"){
    pageId = "salePage";
  }

  currentPageName = pageId;

  document.querySelectorAll(".page").forEach(function(p){
    p.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(function(n){
    n.classList.remove("active");
  });

  if(el) el.classList.add("active");

  if(pageId === "billetsPage"){
    loadBillets();
  }
}

function statusClass(status){
 var s = String(status || "").toUpperCase();
 if(s === "GANYE") return "st-ganye";
 if(s === "PEDI") return "st-pedi";
 if(s === "ANILE") return "st-anile";
 return "st-anatan";
}

function statusLabel(status){
 var s = String(status || "").toUpperCase();
 if(s === "GANYE") return "GANYE";
 if(s === "PEDI") return "PEDI";
 if(s === "ANILE") return "ANILE";
 return "AN ATAN";
}

function loadBillets(){
 fetch("/api/vendor/" + encodeURIComponent(sellerId) + "/tickets?ts=" + Date.now(), {
  cache: "no-store"
})
 .then(function(res){ return res.json(); })
 .then(function(rows){
 savedTickets = Array.isArray(rows) ? rows : [];
 renderBillets();
 renderRapports();
 })
 .catch(function(){
 savedTickets = [];
 renderBillets();
 renderRapports();
 });
}

var selectedTicketToCopy = null;
var copyMode = false;

function feedbackTouch(){
  if(navigator.vibrate){
    navigator.vibrate(40);
  }
}

function rePrintTicket(ticketId){
  if(!ticketId){
    alert("Ticket ID pa valid");
    return;
  }

  window.open(
    "/print?ticketId=" + encodeURIComponent(ticketId) +
    "&sellerId=" + encodeURIComponent(sellerId),
    "_blank"
  );
}


function renderBillets(){
  var wrap = document.getElementById("billetsWrap");

  function fmt(v){
  return Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


  if(!savedTickets.length){
    wrap.innerHTML = '<div class="empty-zone">Pa gen billet</div>';
    return;
  }

  wrap.innerHTML = "";

  savedTickets.forEach(function(t){
    var card = document.createElement("div");
    card.className = "billet-card";

    var premioTotal = Number(t.premio || 0);
      var premioTxt = premioTotal > 0 && t.status !== "ANILE"
  ? '<div class="billet-meta" style="font-weight:800;color:#157347;">Gain total: ' + fmt(premioTotal) + '</div>'
  : '';

   card.innerHTML =
  '<div class="billet-head">' +
    '<div>' +
      '<div class="billet-code">#' + t.id + '</div>' +
      '<div class="billet-meta">' +
        (
          t.createdAtLabel ||
          (
            new Date(t.createdAt || Date.now()).toLocaleDateString("fr-FR") +
            " " +
            new Date(t.createdAt || Date.now()).toLocaleTimeString("fr-FR", {
              hour:"2-digit",
              minute:"2-digit",
              second:"2-digit"
            })
          )
        ) +
      '</div>' +
      '<div class="billet-meta">Total: ' + fmt(t.total) + '</div>' +
      premioTxt +
    '</div>' +
    '<div class="status-badge ' + statusClass(t.status) + '">' + statusLabel(t.status) + '</div>' +
  '</div>';

    if(Array.isArray(t.jeux)){
t.jeux.forEach(function(j){

      var statusTxt = String(t.status || "").toUpperCase().trim();
  var isAnile = statusTxt === "ANILE" || statusTxt === "ANULE" || statusTxt === "ANULADO";

  var gain = Number(j.gain || 0);

  var row = document.createElement("div");
        row.className = "billet-game";

        row.innerHTML =
          '<div>' + (j.type === "L41" ? "Loto4" : j.type) + '</div>' +
          '<div>' +
            j.numero + ' - ' + j.loterie +
            (!isAnile && gain > 0
              ? ' <span style="background:#d1f7de;color:#157347;font-size:12px;font-weight:900;padding:2px 6px;border-radius:8px;margin-left:6px;">+' + fmt(gain) + '</span>'
              : '') +
          '</div>' +
          '<div style="text-align:right">' + fmt(j.montant) + '</div>';

        card.appendChild(row);
      });
    }

    var actions = document.createElement("div");
    actions.className = "billet-actions";
actions.style.gridTemplateColumns = "1fr 1fr 1fr 1.25fr 1fr";
actions.innerHTML =
  '<button class="small-btn btn-green">COPIE</button>' +
  '<button class="small-btn btn-yellow">LOTERIE</button>' +
  '<button class="small-btn btn-yellow">MONTANT</button>' +
  '<button class="small-btn btn-gray">PRINT</button>' +
  '<button class="small-btn btn-gray">ANILE</button>';

    var btns = actions.querySelectorAll("button");

    btns[0].onclick = function(e){
      e.stopPropagation();
      feedbackTouch();
      copyFromTicket(t);
    };

    btns[1].onclick = function(e){
      e.stopPropagation();
      feedbackTouch();
      selectedTicketToCopy = t;
      copyMode = true;
      selectedLoteries = [];
      activeField = "loterie";
      updateFields();
      openLoterieModal();
    };

    btns[2].onclick = function(e){
      e.stopPropagation();
      feedbackTouch();

      var newMontant = prompt("Mete nouvo montant lan:");
      if(newMontant === null) return;

      newMontant = Number(newMontant || 0);
      if(newMontant <= 0){
        alert("Montant pa valid");
        return;
      }

      copyFromTicketWithMontant(t, newMontant);
    };

  btns[3].onclick = function(e){
  e.preventDefault();
  e.stopPropagation();
  feedbackTouch();

  setTimeout(function(){
    rePrintTicket(t.id || t.ticketId || t.serial);
  }, 80);
};

btns[4].onclick = function(e){
  e.stopPropagation();
  feedbackTouch();

  if(confirm("Ou sèten ou vle anile ticket sa?")){
    updateTicketStatus(t.id, "ANILE");
  }
};

    card.appendChild(actions);
    wrap.appendChild(card);
  });
}


function copyFromTicket(ticket){
  if(!ticket || !Array.isArray(ticket.jeux)){
    alert("Ticket pa valid");
    return;
  }

  jeux = [];
  selectedLoteries = [];
  numero = "";
  montant = "";
  cursorNumero = 0;
  cursorMontant = 0;
  activeField = "numero";

 (ticket.jeux || [])
.filter(j => Number(j.montant || 0) > 0)
.forEach(function(j){
    jeux.push({
      type: j.type,
      numero: j.numero,
      loterie: j.loterie,
      montant: Number(j.montant || 0)
    });

    if(selectedLoteries.indexOf(j.loterie) < 0){
      selectedLoteries.push(j.loterie);
    }
  });

  renderJeux();
  updateFields();
  switchPage("salePage", document.getElementById("nav-billets"));
}

function copyFromTicketWithMontant(ticket, newMontant){
  if(!ticket || !Array.isArray(ticket.jeux)){
    alert("Ticket pa valid");
    return;
  }

  jeux = [];
  selectedLoteries = [];
  numero = "";
  montant = "";
  cursorNumero = 0;
  cursorMontant = 0;
  activeField = "numero";

 (ticket.jeux || [])
.filter(j => Number(j.montant || 0) > 0)
.forEach(function(j){
    jeux.push({
      type: j.type,
      numero: j.numero,
      loterie: j.loterie,
      montant: Number(newMontant || 0)
    });

    if(selectedLoteries.indexOf(j.loterie) < 0){
      selectedLoteries.push(j.loterie);
    }
  });

  renderJeux();
  updateFields();
  switchPage("salePage", document.getElementById("nav-billets"));
}

function validateLoteries(){
  document.getElementById("loterieModal").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");

  if(selectedLoteries.length === 0){
    activeField = "loterie";
    updateFields();
    openLoterieModal();
    return;
  }

  if(copyMode && selectedTicketToCopy){
    jeux = [];
    numero = "";
    montant = "";
    cursorNumero = 0;
    cursorMontant = 0;
    activeField = "numero";

(selectedTicketToCopy.jeux || [])
.filter(j => Number(j.montant || 0) > 0)
.forEach(function(j){
      selectedLoteries.forEach(function(lot){
        jeux.push({
          type: j.type,
          numero: j.numero,
          loterie: lot,
          montant: Number(j.montant || 0)
        });
      });
    });

    copyMode = false;
    selectedTicketToCopy = null;

    renderJeux();
    updateFields();
    switchPage("salePage", document.getElementById("nav-billets"));
    return;
  }

  activeField = "montant";
  cursorMontant = montant.length;
  updateFields();
}

function cleanTicketId(v){
  return String(v || "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "");
}

function handleCopyButton(){
  var val = document.getElementById("copyTicketId").value.trim();

  if(!val){
    alert("Mete nimewo ticket la");
    return;
  }

  var cleanInput = cleanTicketId(val);

  fetch("/api/vendor/" + encodeURIComponent(sellerId) + "/tickets?reload=" + Date.now())
  .then(function(res){ return res.json(); })
  .then(function(rows){
    if(!Array.isArray(rows)) rows = [];

    var found = rows.find(function(t){
      var id1 = cleanTicketId(t.id);
      var id2 = cleanTicketId(t.serial);
      var id3 = cleanTicketId(t.ticketId);

      return id1 === cleanInput || id2 === cleanInput || id3 === cleanInput;
    });

    if(!found){
      alert("Ticket pa jwenn");
      return;
    }

    if(!Array.isArray(found.jeux)){
      alert("Ticket sa pa gen jwèt ladanl");
      return;
    }

    jeux = [];
    selectedLoteries = [];
    numero = "";
    montant = "";
    cursorNumero = 0;
    cursorMontant = 0;
    activeField = "numero";

    (found.jeux || [])
.filter(j => Number(j.montant || 0) > 0)
.forEach(function(j){
      jeux.push({
        type: j.type,
        numero: j.numero,
        loterie: j.loterie,
        montant: Number(j.montant || 0)
      });

      if(selectedLoteries.indexOf(j.loterie) < 0){
        selectedLoteries.push(j.loterie);
      }
    });

    renderJeux();
    updateFields();

    switchPage("salePage", document.getElementById("nav-billets"));
  })
  .catch(function(){
    alert("Erreur lecture ticket");
  });
}

function renderRapports(){
  var box = document.getElementById("rapportsPage");
  if(!box) return;

  function toIsoDay(value){
    var d = new Date(value || new Date());
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function toFr(iso){
    if(!iso) return "";
    var p = iso.split("-");
    if(p.length !== 3) return iso;
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  var oldStart = document.getElementById("rapportDateStart");
  var oldEnd = document.getElementById("rapportDateEnd");

  var todayStr = toIsoDay(new Date());
  var startValue = oldStart ? oldStart.value : todayStr;
  var endValue = oldEnd ? oldEnd.value : todayStr;

  var filtered = savedTickets.filter(function(t){
    var d = toIsoDay(t.createdAt || new Date());
    return d >= startValue && d <= endValue;
  });

  var vente = 0;
  var prime = 0;

  var byDay = {};
  var byLoterie = {};

  filtered.forEach(function(t){
    var st = String(t.status || "").toUpperCase();
    if(st === "ANILE") return;

    var total = Number(t.total || 0);
    var premio = st === "GANYE" ? Number(t.premio || 0) : 0;
    var dayKey = toIsoDay(t.createdAt || new Date());

    vente += total;
    prime += premio;

    if(!byDay[dayKey]){
      byDay[dayKey] = { vente: 0, prime: 0 };
    }
    byDay[dayKey].vente += total;
    byDay[dayKey].prime += premio;

    (t.jeux || []).forEach(function(j){
      var lot = String(j.loterie || "").trim() || "SANS TIRAGE";
      var amt = Number(j.montant || 0);

      if(!byLoterie[lot]){
        byLoterie[lot] = { vente: 0, prime: 0 };
      }
      byLoterie[lot].vente += amt;
    });
  });

var commission = vente * (Number(sellerCommissionRate || 0) / 100);
var resultat = vente - prime - commission;

  var daysHtml = "";
  var sortedDays = Object.keys(byDay).sort();
  sortedDays.forEach(function(day){
    var d = byDay[day];
  var dCommission = d.vente * (Number(sellerCommissionRate || 0) / 100);
var dBalance = d.vente - d.prime - dCommission;

daysHtml +=
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:18px;margin-bottom:18px;">' +
    '<div>' + Number(d.vente || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '<div style="font-size:15px;color:#666;margin-top:4px;">' + Number(dCommission || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div></div>' +
    '<div>' + Number(d.prime || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
    '<div>' + Number(dBalance || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '<div style="font-size:15px;color:#666;margin-top:4px;">' + toFr(day) + '</div></div>' +
  '</div>';
});

if(!daysHtml){
  daysHtml =
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:18px;margin-bottom:18px;">' +
      '<div>0.00<div style="font-size:15px;color:#666;margin-top:4px;">0.00</div></div>' +
      '<div>0.00</div>' +
      '<div>0.00<div style="font-size:15px;color:#666;margin-top:4px;">' + toFr(endValue) + '</div></div>' +
    '</div>';
}

  var loterieHtml = "";
  var lotKeys = Object.keys(byLoterie).sort();
  lotKeys.forEach(function(lot){
    var l = byLoterie[lot];
    var lCommission = 0;
    var lBalance = l.vente - l.prime - lCommission;

      loterieHtml +=
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:18px;margin-bottom:18px;">' +
      '<div>' + Number(l.vente || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '<div style="font-size:15px;color:#666;margin-top:4px;">' + Number(lCommission || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div></div>' +
      '<div>' + Number(l.prime || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
      '<div>' + Number(lBalance || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '<div style="font-size:15px;color:#666;margin-top:4px;">' + lot + '</div></div>' +
    '</div>';
});

if(!loterieHtml){
  loterieHtml =
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:18px;margin-bottom:18px;">' +
      '<div>' + Number(vente || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '<div style="font-size:15px;color:#666;margin-top:4px;">' + Number(commission || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div></div>' +
      '<div>' + Number(prime || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
      '<div>' + Number(resultat || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
    '</div>';
}

  box.innerHTML =
  '<div style="height:100%;display:flex;flex-direction:column;background:#f5f5f5;">' +

    '<div style="height:58px;min-height:58px;background:#2f49d1;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 14px;">' +
      '<button id="rapportBackBtn" type="button" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">←</button>' +
      '<div style="font-size:22px;font-weight:700;">Rapports</div>' +
      '<div style="display:flex;gap:18px;align-items:center;">' +
        '<button id="rapportPrintBtn" type="button" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">🖨️</button>' +
        '<button id="rapportRefreshBtn" type="button" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">↻</button>' +
      '</div>' +
    '</div>' +

    '<div style="padding:14px;overflow:auto;flex:1;">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">' +
        '<input id="rapportDateStart" type="date" value="' + startValue + '" style="width:100%;border:none;border-bottom:1px solid #999;background:transparent;padding:10px 0;font-size:18px;outline:none;">' +
        '<input id="rapportDateEnd" type="date" value="' + endValue + '" style="width:100%;border:none;border-bottom:1px solid #999;background:transparent;padding:10px 0;font-size:18px;outline:none;">' +
      '</div>' +

      '<div style="background:#fff;padding:18px 16px;margin-bottom:18px;">' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;row-gap:8px;font-size:18px;line-height:1.5;">' +
    '<div style="text-align:center;font-weight:700;">Ventes</div><div style="text-align:center;font-weight:700;">' + Number(vente || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
    '<div style="text-align:center;font-weight:700;">Prix</div><div style="text-align:center;font-weight:700;">' + Number(prime || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
    '<div style="text-align:center;font-weight:700;">Commission</div><div style="text-align:center;font-weight:700;">' + Number(commission || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
    '<div style="text-align:center;font-weight:700;">Résultat</div><div style="text-align:center;font-weight:700;">' + Number(resultat || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' +
  '</div>' +
'</div>' +

      '<div style="background:#fff;padding:18px 16px;margin-bottom:18px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;margin-bottom:18px;">RESUMEN POR DÍA</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:18px;margin-bottom:14px;">' +
          '<div>VENTE</div>' +
          '<div>PRIME</div>' +
          '<div>BALANCE</div>' +
        '</div>' +
        daysHtml +
      '</div>' +

      '<div style="background:#fff;padding:18px 16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;margin-bottom:18px;">RESUMEN POR LOTERÍA</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:18px;margin-bottom:14px;">' +
          '<div>VENTE</div>' +
          '<div>PRIME</div>' +
          '<div>BALANCE</div>' +
        '</div>' +
        loterieHtml +
      '</div>' +

    '</div>' +
  '</div>';

  var backBtn = document.getElementById("rapportBackBtn");
  var refreshBtn = document.getElementById("rapportRefreshBtn");
  var printBtn = document.getElementById("rapportPrintBtn");
  var startInput = document.getElementById("rapportDateStart");
  var endInput = document.getElementById("rapportDateEnd");

  if(backBtn){
    backBtn.addEventListener("click", function(){
      switchPage("billetsPage", document.getElementById("nav-billets"));
    });
  }

  if(refreshBtn){
    refreshBtn.addEventListener("click", function(){
      loadBillets();
    });
  }

  if(printBtn){
  printBtn.addEventListener("click", function(){
    var now = new Date();

    window.open(
      "/print-report?sellerId=" + encodeURIComponent(sellerId) +
      "&start=" + encodeURIComponent(startValue) +
      "&end=" + encodeURIComponent(endValue) +
      "&date=" + encodeURIComponent(now.toLocaleDateString("fr-FR")) +
      "&time=" + encodeURIComponent(now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
      })),
      "_blank"
    );
  });
}

  if(startInput){
    startInput.addEventListener("change", function(){
      renderRapports();
    });
  }

  if(endInput){
    endInput.addEventListener("change", function(){
      renderRapports();
    });
  }
}

function updateTicketStatus(id, status, premio){
 fetch("/api/ticket-status", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
   id: id,
   status: status,
   premio: premio || 0
 })
 }).then(function(res){
 return res.json();
 }).then(function(){
   fetch("/api/vendor/" + encodeURIComponent(sellerId) + "/tickets")
   .then(function(res){ return res.json(); })
   .then(function(rows){
     savedTickets = Array.isArray(rows) ? rows : [];
     renderBillets();
     renderRapports();

     if(currentPageName === "balancePage"){
       renderBalancePage();
     }
   });
 }).catch(function(){
 alert("Erreur mise à jour status");
 });
}

function copyTicketById(){
 var id = document.getElementById("copyTicketId").value.trim();
 if(!id){
 alert("Mete nimewo seri a");
 return;
 }

 fetch("/api/ticket/" + encodeURIComponent(id))
 .then(function(res){ return res.json(); })
 .then(function(ticket){
 if(!ticket || !ticket.id){
   alert("Ticket pa jwenn");
   return;
 }

 jeux = [];
 selectedLoteries = [];
 numero = "";
 cursorNumero = 0;
 activeField = "numero";

 if(Array.isArray(ticket.jeux)){
   ticket.jeux.forEach(function(j){
     jeux.push({
       type: j.type,
       numero: j.numero,
       loterie: j.loterie,
       montant: Number(j.montant || 0)
     });

     if(selectedLoteries.indexOf(j.loterie) < 0){
       selectedLoteries.push(j.loterie);
     }
   });
 }

 renderJeux();
 updateFields();
 switchPage("salePage", document.getElementById("nav-billets"));
 })
 .catch(function(){
 alert("Erreur lecture ticket");
 });
}

 (function(){
  var autoBoulPeMode = false;

  var overlay = document.getElementById("overlay");
  var sheet = document.getElementById("optionsSheet");

  if(overlay){
    overlay.onclick = function(){
      closeDrawer();
      closeOptions();
      overlay.classList.remove("show");
    };
  }

  if(sheet && !document.getElementById("boulPeOption")){
    var items = sheet.querySelectorAll(".sheet-item");
    var boulPe = document.createElement("div");
    boulPe.id = "boulPeOption";
    boulPe.className = "sheet-item";
    boulPe.textContent = "Boul pè";
    boulPe.onclick = function(){
      autoBoulPeMode = true;
      closeOptions();
      document.getElementById("overlay").classList.remove("show");

      activeField = "montant";
      cursorMontant = montant.length;
      updateFields();
    };

     items.forEach(function(item){
     if(item.textContent.trim() === "Loto4 otomatik"){
        item.parentNode.insertBefore(boulPe, item.nextSibling);
      }
    });
  }

  var oldHandleEnter = handleEnter;

  handleEnter = function(){
    if(document.getElementById("choicePanel").style.display === "block"){
      if(tempChoices.length === 0){
        alert("Chwazi omwen youn");
        return;
      }

      numero = pendingChoiceNumber + "+" + tempChoices.join(",");
      cursorNumero = numero.length;
      hideChoicePanel();

      activeField = "montant";
      cursorMontant = montant.length;
      updateFields();
      return;
    }

    if(activeField === "numero"){
      if(!numero.trim()) return;

      if(selectedLoteries.length > 0){
        activeField = "montant";
        cursorMontant = montant.length;
        updateFields();
        return;
      }

      activeField = "loterie";
      updateFields();
      openLoterieModal();
      return;
    }

    if(activeField === "loterie"){
      validateLoteries();
      return;
    }

    if(activeField === "montant"){
      if(!montant.trim()) return;

      if(autoBoulPeMode){
        if(selectedLoteries.length === 0){
          activeField = "loterie";
          updateFields();
          openLoterieModal();
          return;
        }

        ["00","11","22","33","44","55","66","77","88","99"].forEach(function(num){
          selectedLoteries.forEach(function(lot){
            mergeOrPushGame({
              type: "BOR",
              numero: num,
              loterie: lot,
              montant: parseFloat(montant) || 0
            });
          });
        });

        autoBoulPeMode = false;
        montant = "";
        cursorMontant = 0;
        activeField = "numero";

        renderJeux();
        updateFields();
        return;
      }

      addGame();
      return;
    }

    oldHandleEnter();
  };
})();

/* ================= LANGUE APP COMPLETE ================= */

var APP_LANG = localStorage.getItem("APP_LANG") || "fr";

var TR = {
  fr: {
    billets:"Billets", copier:"Copier", payer:"Payer", rapports:"Rapports", menu:"Menu",
    tirages:"Tirages", balance:"Balance", parametre:"Paramètre", imprimante:"Imprimante",
    update:"Update", sortir:"Sortir",
    choisirLangue:"CHOISIR LA LANGUE",
    idioma:"Idioma del Equipo",
    heure:"Hora del Sistema",
    version:"Versión de App",
    papier:"Papel",
    charset:"CharSet",
    ventes:"VENTES",
    whatsapp:"WhatsApp",
    guardarUsuario:"Guardar Usuario",
    guardarClave:"Guardar Clave",
    entrerAuto:"Entrar Automático",
    empreinte:"Usar Huella Digital",
    numero:"Numero",
    loterie:"Loterie",
    montant:"Montant",
    pasJeux:"Pas de jeux",
    ok:"OK"
  },

  ht: {
    billets:"Biyè", copier:"Kopye", payer:"Peye", rapports:"Rapò", menu:"Meni",
    tirages:"Tiraj", balance:"Balans", parametre:"Paramèt", imprimante:"Enprimant",
    update:"Mizajou", sortir:"Sòti",
    choisirLangue:"CHWAZI LANG",
    idioma:"Lang aparèy la",
    heure:"Lè sistèm nan",
    version:"Vèsyon app la",
    papier:"Papye",
    charset:"CharSet",
    ventes:"VANT",
    whatsapp:"WhatsApp",
    guardarUsuario:"Sove itilizatè",
    guardarClave:"Sove modpas",
    entrerAuto:"Antre otomatik",
    empreinte:"Sèvi ak anprent",
    numero:"Nimewo",
    loterie:"Lotri",
    montant:"Montan",
    pasJeux:"Pa gen jwèt",
    ok:"OK"
  },

  es: {
    billets:"Boletos", copier:"Copiar", payer:"Pagar", rapports:"Reportes", menu:"Menú",
    tirages:"Sorteos", balance:"Balance", parametre:"Parámetros", imprimante:"Impresora",
    update:"Actualizar", sortir:"Salir",
    choisirLangue:"ELEGIR IDIOMA",
    idioma:"Idioma del Equipo",
    heure:"Hora del Sistema",
    version:"Versión de App",
    papier:"Papel",
    charset:"CharSet",
    ventes:"VENTAS",
    whatsapp:"WhatsApp",
    guardarUsuario:"Guardar Usuario",
    guardarClave:"Guardar Clave",
    entrerAuto:"Entrar Automático",
    empreinte:"Usar Huella Digital",
    numero:"Número",
    loterie:"Lotería",
    montant:"Monto",
    pasJeux:"Sin jugadas",
    ok:"OK"
  }
};

function T(k){
  return (TR[APP_LANG] && TR[APP_LANG][k]) || TR.fr[k] || k;
}

function langSelectHtml(){
  return '' +
    '<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">' +
      '<select id="langSelectTemp" style="font-size:18px;font-weight:800;padding:5px;">' +
        '<option value="fr" ' + (APP_LANG === "fr" ? "selected" : "") + '>français</option>' +
        '<option value="ht" ' + (APP_LANG === "ht" ? "selected" : "") + '>kreyòl</option>' +
        '<option value="es" ' + (APP_LANG === "es" ? "selected" : "") + '>español</option>' +
      '</select>' +
      '<button onclick="saveLanguageChoice()" style="background:#2f49d1;color:white;border:none;border-radius:8px;padding:6px 12px;font-weight:800;">' + T("ok") + '</button>' +
    '</div>';
}

function saveLanguageChoice(){
  var sel = document.getElementById("langSelectTemp");
  if(!sel) return;

  APP_LANG = sel.value;
  localStorage.setItem("APP_LANG", APP_LANG);

  location.reload();
}

function applyAppLang(){
  var e;

  e = document.getElementById("nav-billets"); if(e) e.textContent = T("billets");
  e = document.getElementById("nav-copier"); if(e) e.textContent = T("copier");
  e = document.getElementById("nav-payer"); if(e) e.textContent = T("payer");
  e = document.getElementById("nav-rapports"); if(e) e.textContent = T("rapports");
  e = document.getElementById("nav-menu"); if(e) e.textContent = T("menu");

  e = document.getElementById("numeroLine"); if(e && !numero) e.textContent = T("numero");
  e = document.getElementById("loterieLine"); if(e) e.textContent = T("loterie");
  e = document.getElementById("montantLine"); if(e && !montant) e.textContent = T("montant");

  var drawerItems = document.querySelectorAll("#drawer .drawer-item");
  if(drawerItems.length >= 6){
    drawerItems[0].textContent = T("tirages");
    drawerItems[1].textContent = T("balance");
    drawerItems[2].textContent = T("parametre");
    drawerItems[3].textContent = T("imprimante");
    drawerItems[4].textContent = T("update");
    drawerItems[5].textContent = T("sortir");
  }
}

setTimeout(function(){
  applyAppLang();
}, 300);

loadVendorLoteries().then(function(){
  renderJeux();
  updateFields();
  loadBillets();
});

setInterval(function(){
  loadVendorLoteries().then(function(){
    if(document.getElementById("loterieModal").classList.contains("show")){
      renderLoterieList();
    }
  });
}, 30000);

(function(){
  var oldRenderBillets = renderBillets;
  var oldValidateLoteries = validateLoteries;

  var montantCopyTicket = null;
  var montantCopyValue = 0;

  renderBillets = function(){
    oldRenderBillets();
    fixMontantButtons();
  };

  setInterval(function(){
  if(currentPageName === "billetsPage" || currentPageName === "balancePage" || currentPageName === "rapportsPage"){
    loadBillets();
  }
}, 3000);

window.addEventListener("focus", function(){
  loadBillets();
});

  function fixMontantButtons(){
    var cards = document.querySelectorAll(".billet-card");

    cards.forEach(function(card, index){
      var actions = card.querySelector(".billet-actions");
      if(!actions) return;

      var ticket = savedTickets[index];
      if(!ticket) return;

      var buttons = actions.querySelectorAll("button");
      var montantBtns = [];

      buttons.forEach(function(btn){
        if(btn.textContent.trim().toUpperCase() === "MONTANT"){
          montantBtns.push(btn);
        }
      });

      while(montantBtns.length > 1){
        montantBtns.pop().remove();
      }

      var btn = montantBtns[0];
      if(!btn){
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "small-btn btn-yellow";
        btn.textContent = "MONTANT";
        actions.insertBefore(btn, actions.lastElementChild);
      }

      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();

        var m = prompt("Mete nouvo montant lan:");
        if(m === null) return;

        m = Number(m || 0);
        if(m <= 0){
          alert("Montant pa valid");
          return;
        }

        montantCopyTicket = ticket;
        montantCopyValue = m;

        selectedLoteries = [];
        activeField = "loterie";
        updateFields();
        openLoterieModal();
      };
    });
  }

  validateLoteries = function(){
    if(montantCopyTicket){
      document.getElementById("loterieModal").classList.remove("show");
      document.getElementById("overlay").classList.remove("show");

      if(selectedLoteries.length === 0){
        activeField = "loterie";
        updateFields();
        openLoterieModal();
        return;
      }

      jeux = [];
      numero = "";
      montant = "";
      cursorNumero = 0;
      cursorMontant = 0;
      activeField = "numero";

      montantCopyTicket.jeux.forEach(function(j){
        selectedLoteries.forEach(function(lot){
          jeux.push({
            type: j.type,
            numero: j.numero,
            loterie: lot,
            montant: Number(montantCopyValue || 0)
          });
        });
      });

      montantCopyTicket = null;
      montantCopyValue = 0;

      renderJeux();
      updateFields();
      switchPage("salePage", document.getElementById("nav-billets"));
      return;
    }

    oldValidateLoteries();
  };
})();

var sellerCommissionRate = Number(${JSON.stringify(vendeur?.comision?.general || 0)});
var sellerCredit = Number(${JSON.stringify(vendeur?.config?.credito || 0)});

function backToJeux(){
  var drawer = document.getElementById("drawer");
  var overlay = document.getElementById("overlay");
  var sheet = document.getElementById("optionsSheet");
  var loterieModal = document.getElementById("loterieModal");

  if(drawer) drawer.classList.remove("open");
  if(sheet) sheet.classList.remove("open");
  if(loterieModal) loterieModal.classList.remove("show");
  if(overlay) overlay.classList.remove("show");

  switchPage("salePage", document.getElementById("nav-billets"));
}

function closeMenuOnly(){
  var drawer = document.getElementById("drawer");
  var overlay = document.getElementById("overlay");
  var sheet = document.getElementById("optionsSheet");

  if(drawer) drawer.classList.remove("open");
  if(sheet) sheet.classList.remove("open");
  if(overlay) overlay.classList.remove("show");
}

function openDrawerTirages(){
  closeMenuOnly();
  renderTiragesPage();
  switchPage("tiragesPage", null);
}

function openDrawerBalance(){
  closeMenuOnly();

  renderBalancePage(); // pa fetch la ankò isit

  switchPage("balancePage", null);
}

function openDrawerParametre(){
  closeMenuOnly();
  renderParametrePage();
  switchPage("parametrePage", null);
}

function openDrawerImprimante(){
  closeMenuOnly();
  renderImprimantePage();
  switchPage("imprimantePage", null);
}

function openDrawerUpdate(){
  location.reload();
}

function todayISO(){
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

var currentBalanceDate = todayISO();
var currentTirageDate = todayISO();

function moneyFmt(v){
  return Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function renderTiragesPage(){
  var box = document.getElementById("tiragesWrap");
  if(!box) return;

  var html = "";

  html += '<div style="height:58px;background:#2f49d1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;">Tirages</div>';
  html += '<div style="background:#fff;text-align:center;padding:10px 0;border-bottom:1px solid #aaa;">';
  html += '<div style="font-size:16px;color:#777;">Date</div>';
  html += '<input type="date" value="' + currentTirageDate + '" onchange="currentTirageDate=this.value;renderTiragesPage();" style="border:none;background:transparent;text-align:center;font-size:24px;font-weight:700;width:190px;outline:none;">';
  html += '</div>';

  html += '<div style="background:#fff;">';

  loteries.forEach(function(l){
    html +=
      '<div data-loteria="' + l.name + '" style="display:grid;grid-template-columns:80px 1fr;align-items:center;min-height:92px;border-bottom:1px solid #ddd;padding:8px 10px;">' +
        '<div style="font-size:12px;font-weight:800;color:#2f49d1;text-align:center;">LOGO</div>' +
        '<div>' +
          '<div style="font-size:21px;font-weight:800;color:#64b5e8;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + l.name + '</div>' +
          '<div style="display:flex;gap:9px;margin-top:8px;">' +
            '<div class="ball" style="width:50px;height:50px;border-radius:50%;background:#8ccc5a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;">--</div>' +
            '<div class="ball" style="width:50px;height:50px;border-radius:50%;background:#8ccc5a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;">--</div>' +
            '<div class="ball" style="width:50px;height:50px;border-radius:50%;background:#8ccc5a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;">--</div>' +
            '<div class="ball" style="width:50px;height:50px;border-radius:50%;background:#8ccc5a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;">--</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  });

  html += '</div>';
  box.innerHTML = html;

  loadSorteosVendor();
}

async function loadSorteosVendor() {
  try {
    const date = currentTirageDate || todayISO();
    const res = await fetch("/api/vendor/sorteos?date=" + encodeURIComponent(date));
    const data = await res.json();

    document.querySelectorAll("[data-loteria]").forEach(row => {
      const loteria = row.getAttribute("data-loteria");
      const r = data[loteria] || {};

      const nums = [r.r1, r.r2, r.r3, r.r4].filter(x => String(x || "").trim() !== "");
      const balls = row.querySelectorAll(".ball");

      balls.forEach((b, i) => {
        b.textContent = nums[i] || "--";
      });
    });
  } catch (err) {
    console.error("Erreur load sorteos vendor:", err);
  }
}

function renderParametrePage(){
  var box = document.getElementById("parametreWrap");
  if(!box) return;

  box.innerHTML =
    '<div style="padding:14px;background:#f3f3f7;min-height:100%;">' +
      '<div style="color:#888;font-size:16px;margin-bottom:12px;">CHOISIR LA LANGUE</div>' +
      '<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:18px;font-size:18px;">' +
        '<div style="display:grid;grid-template-columns:1fr auto;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">' +
          '<div>🌐 Idioma del Equipo</div>' +
          '<select style="font-size:18px;border:none;background:transparent;font-weight:800;outline:none;">' +
            '<option>français</option>' +
            '<option>kreyòl</option>' +
            '<option>español</option>' +
          '</select>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr auto;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">' +
          '<div>🕒 Hora del Sistema</div><b>' + new Date().toLocaleTimeString("fr-FR") + '</b>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr auto;align-items:center;padding:12px 0;">' +
          '<div>✅ Versión de App</div><b>2.9.32</b>' +
        '</div>' +
      '</div>' +
'<div style="display:flex;justify-content:space-between;padding:14px;border-bottom:1px solid #eee;">' +
  '<span>🌐 ' + T("idioma") + '</span>' +
  langSelectHtml() +
'</div>' +
      '<div style="color:#888;font-size:16px;margin-bottom:12px;">IMPRIMANTE</div>' +
      '<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:18px;font-size:18px;">' +
        '<div style="padding:12px 0;border-bottom:1px solid #eee;">🖨️ -- <b style="float:right;">✎</b></div>' +
        '<div style="padding:12px 0;border-bottom:1px solid #eee;">🧾 Papel <b style="float:right;">58mm ○ 80mm</b></div>' +
        '<div style="padding:12px 0;">Tt CharSet <b style="float:right;">UTF-8</b></div>' +
      '</div>' +

      '<div style="color:#888;font-size:16px;margin-bottom:12px;">VENTES</div>' +
      '<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:18px;font-size:18px;">' +
        '<div style="padding:12px 0;border-bottom:1px solid #eee;">Loteries <b style="float:right;">Material</b></div>' +
        '<div style="padding:12px 0;">WhatsApp <b style="float:right;">IMG ○ PDF ○ ?</b></div>' +
      '</div>' +

      '<div style="color:#888;font-size:16px;margin-bottom:12px;">CLAVIER</div>' +
      '<div style="background:#fff;border-radius:14px;padding:12px;font-size:18px;">' +
        '<div style="padding:12px 0;border-bottom:1px solid #eee;">🔒 Guardar Usuario <b style="float:right;">ON</b></div>' +
        '<div style="padding:12px 0;border-bottom:1px solid #eee;">🔑 Guardar Clave <b style="float:right;">OFF</b></div>' +
        '<div style="padding:12px 0;border-bottom:1px solid #eee;">↪ Entrar Automático <b style="float:right;">OFF</b></div>' +
        '<div style="padding:12px 0;">🖐 Usar Huella Digital <b style="float:right;">ON</b></div>' +
      '</div>' +
    '</div>';
}

function renderImprimantePage(){
  var box = document.getElementById("imprimanteWrap");
  if(!box) return;

  box.innerHTML =
    '<div style="height:58px;background:#2f49d1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;">Imprimante</div>' +
    '<div style="padding:14px;">' +
      '<div style="background:#fff;border-radius:14px;padding:14px;font-size:18px;">' +
        '<div style="font-size:20px;font-weight:800;margin-bottom:12px;">Printer disponibles</div>' +
        '<div style="padding:14px;border-bottom:1px solid #eee;">POS Internal Printer</div>' +
        '<div style="padding:14px;border-bottom:1px solid #eee;">Bluetooth Printer</div>' +
        '<div style="padding:14px;border-bottom:1px solid #eee;">LP-BT71</div>' +
        '<button onclick="submitPrint()" style="width:100%;height:50px;border:none;border-radius:12px;background:#3452aa;color:#fff;font-size:18px;font-weight:800;margin-top:16px;">Tester impression</button>' +
      '</div>' +
    '</div>';
}

/* ===== AJOUTE KALANDRIYE SOU LIS BIYÈ YO SAN CHANJE renderBillets() ===== */
(function(){
  var oldRenderBilletsDate = renderBillets;
  var billetsDateFilter = "";

  function todayBilletDate(){
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function getBilletDate(t){
    var d = new Date(t.createdAt || Date.now());
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  renderBillets = function(){
    if(!billetsDateFilter){
      billetsDateFilter = todayBilletDate();
    }

    var allTickets = savedTickets.slice();

    savedTickets = allTickets.filter(function(t){
      return getBilletDate(t) === billetsDateFilter;
    });

    oldRenderBilletsDate();

    savedTickets = allTickets;

    var wrap = document.getElementById("billetsWrap");
    if(!wrap) return;

    var bar = document.createElement("div");
    bar.style.cssText = "position:sticky;top:0;z-index:99;background:#efeff4;padding:8px 4px 10px;";
    bar.innerHTML =
      '<input type="date" id="billetsDateInput" value="' + billetsDateFilter + '" ' +
      'style="width:100%;height:42px;border:1px solid #ddd;border-radius:12px;text-align:center;font-size:18px;font-weight:800;background:#fff;">';

    wrap.insertBefore(bar, wrap.firstChild);

    document.getElementById("billetsDateInput").onchange = function(){
      billetsDateFilter = this.value;
      renderBillets();
    };
  };
})();

/* ===== PATCH APA: 4724 + "-" = AUTO 8 L1 ===== */
(function(){
  var oldPressAutoL1 = press;
  var oldHandleEnterAutoL1 = handleEnter;

  window.autoL1Mode = false;

  press = function(val){
    val = String(val);

    if(activeField === "numero" && val === "-" && /^\\d{4}$/.test(numero)){
      window.autoL1Mode = true;
      activeField = "montant";
      cursorMontant = montant.length;
      updateFields();
      return;
    }

    oldPressAutoL1(val);
  };

  handleEnter = function(){
    if(activeField === "montant" && window.autoL1Mode){
      if(!montant.trim()){
        alert("Mete montan an");
        return;
      }

      if(selectedLoteries.length === 0){
        activeField = "loterie";
        updateFields();
        openLoterieModal();
        return;
      }

      var a = numero.slice(0, 2);
      var b = numero.slice(2, 4);
      var ar = reverse2(a);
      var br = reverse2(b);

      var combos = [
        a + b,
        b + a,
        a + br,
        br + a,
        ar + b,
        b + ar,
        ar + br,
        br + ar
      ];

      combos.forEach(function(num){
        selectedLoteries.forEach(function(lot){
          mergeOrPushGame({
            type: "L41",
            numero: num,
            loterie: lot,
            montant: parseFloat(montant) || 0
          });
        });
      });

      window.autoL1Mode = false;
      numero = "";
      montant = "";
      cursorNumero = 0;
      cursorMontant = 0;
      activeField = "numero";

      renderJeux();
      updateFields();
      return;
    }

    oldHandleEnterAutoL1();
  };
})();

/* ===== PATCH APA: OPTION GRAP ===== */
(function(){
  var oldHandleEnterGrap = handleEnter;
  var autoGrapMode = false;

  var sheet = document.getElementById("optionsSheet");

  if(sheet && !document.getElementById("grapOption")){
    var items = sheet.querySelectorAll(".sheet-item");
    var grap = document.createElement("div");
    grap.id = "grapOption";
    grap.className = "sheet-item";
    grap.textContent = "Grap";

    grap.onclick = function(){
      autoGrapMode = true;

      closeOptions();
      document.getElementById("overlay").classList.remove("show");

      activeField = "montant";
      cursorMontant = montant.length;
      updateFields();
    };

    items.forEach(function(item){
      if(item.textContent.trim() === "Boul pè"){
        item.parentNode.insertBefore(grap, item.nextSibling);
      }
    });
  }

  handleEnter = function(){
    if(activeField === "montant" && autoGrapMode){
      if(!montant.trim()){
        alert("Mete montan an");
        return;
      }

      if(selectedLoteries.length === 0){
        activeField = "loterie";
        updateFields();
        openLoterieModal();
        return;
      }

      [
        "000","111","222","333","444",
        "555","666","777","888","999"
      ].forEach(function(num){
        selectedLoteries.forEach(function(lot){
          mergeOrPushGame({
            type: "L3",
            numero: num,
            loterie: lot,
            montant: parseFloat(montant) || 0
          });
        });
      });

      autoGrapMode = false;
      montant = "";
      cursorMontant = 0;
      activeField = "numero";

      renderJeux();
      updateFields();
      return;
    }

    oldHandleEnterGrap();
  };
})();

/* ===== PATCH APA: GRAP OPSYON ===== */
(function(){
  var oldHandleEnterGrapOption = handleEnter;
  var autoGrapOptionMode = false;
  var grapBase = "";

  var sheet = document.getElementById("optionsSheet");

  if(sheet && !document.getElementById("grapOption2")){
    var items = sheet.querySelectorAll(".sheet-item");
    var grapOpt = document.createElement("div");

    grapOpt.id = "grapOption2";
    grapOpt.className = "sheet-item";
    grapOpt.textContent = "Grap Opsyon";

    grapOpt.onclick = function(){
      var val = prompt("Mete 2 boul (egzanp: 23)");

      if(!val) return;

      val = String(val).trim();

      if(!/^\\d{2}$/.test(val)){
        alert("Fòk se 2 chif egzak");
        return;
      }

      grapBase = val;
      autoGrapOptionMode = true;

      closeOptions();
      document.getElementById("overlay").classList.remove("show");

      activeField = "montant";
      cursorMontant = montant.length;
      updateFields();
    };

    items.forEach(function(item){
      if(item.textContent.trim() === "Grap"){
        item.parentNode.insertBefore(grapOpt, item.nextSibling);
      }
    });
  }

  handleEnter = function(){

    if(activeField === "montant" && autoGrapOptionMode){

      if(!montant.trim()){
        alert("Mete montan an");
        return;
      }

      if(selectedLoteries.length === 0){
        activeField = "loterie";
        updateFields();
        openLoterieModal();
        return;
      }

      // 🔥 0 jiska 9 devan 2 boul la
      for(var i=0;i<=9;i++){
        var numeroAuto = i + grapBase;

        selectedLoteries.forEach(function(lot){
          mergeOrPushGame({
            type: "L3",
            numero: numeroAuto,
            loterie: lot,
            montant: parseFloat(montant) || 0
          });
        });
      }

      autoGrapOptionMode = false;
      grapBase = "";

      montant = "";
      cursorMontant = 0;
      activeField = "numero";

      renderJeux();
      updateFields();
      return;
    }

    oldHandleEnterGrapOption();
  };
})();

function renderBalancePage(){
  Promise.all([
    fetch("/api/vendor/" + encodeURIComponent(sellerId) + "/tickets?reload=" + Date.now()).then(function(res){ return res.json(); }),
    fetch("/api/reportes/balance?date=" + encodeURIComponent(currentBalanceDate)).then(function(res){ return res.json(); })
  ])
  .then(function(data){
    savedTickets = Array.isArray(data[0]) ? data[0] : [];
    var balanceRows = Array.isArray(data[1]) ? data[1] : [];

    var box = document.getElementById("balanceWrap");
    if(!box) return;

    var vente = 0;
    var prix = 0;

    function ticketDateKey(t){
      if(t.dateLabel){
        var p = String(t.dateLabel).split("/");
        if(p.length === 3){
          return p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
        }
      }

      var d = new Date(t.createdAt || Date.now());
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2,"0") + "-" +
        String(d.getDate()).padStart(2,"0");
    }

    savedTickets.forEach(function(t){
      var st = String(t.status || "").toUpperCase();
      if(st === "ANILE") return;

      var ticketDay = ticketDateKey(t);
      if(currentBalanceDate && ticketDay > currentBalanceDate) return;

      vente += Number(t.total || 0);

      if(st === "GANYE"){
        prix += Number(t.premio || 0);
      }
    });

    var rate = Number(sellerCommissionRate || 0);
    var commission = vente * (rate / 100);
    var resultat = vente - commission - prix;

    var initial = 0;
    var paiementRecu = 0;
    var collectionsLivrees = 0;
    var details = "";

    var rowBalance = balanceRows.find(function(r){
      return String(r.id || "").toUpperCase() === String(sellerId || "").toUpperCase();
    });

    if(rowBalance && Array.isArray(rowBalance.collectionsLivrees)){
      rowBalance.collectionsLivrees.forEach(function(m){
        collectionsLivrees += Number(m.monto || 0);

        details +=
          '<div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:14px;color:#666;border-top:1px solid #eee;">' +
            '<span>' + (m.fecha || "") + '</span>' +
            '<span>' + moneyFmt(m.monto) + '</span>' +
          '</div>';
      });
    }

    var balance = rowBalance && rowBalance.balance !== undefined
      ? Number(rowBalance.balance || 0)
      : resultat;

    var sousTotal = balance + collectionsLivrees;

    var credit = Number(sellerCredit || 0);
    var disponible = credit - balance;

    function row(label, value, bold, green){
      return '<div style="display:grid;grid-template-columns:1fr auto;align-items:center;padding:13px 16px;border-bottom:1px solid #eee;font-size:20px;">' +
        '<div style="' + (bold ? 'font-weight:800;' : '') + '">' + label + '</div>' +
        '<div style="' + (bold ? 'font-weight:800;' : '') + (green ? 'color:#22a447;' : '') + '">' + moneyFmt(value) + '</div>' +
      '</div>';
    }

    var collectionsBlock =
      '<details style="background:#fff;border:1px solid #ddd;margin-bottom:10px;">' +
        '<summary style="display:grid;grid-template-columns:1fr auto;align-items:center;padding:13px 16px;font-size:20px;cursor:pointer;">' +
          '<span>Collections livrées</span>' +
          '<span>' + moneyFmt(collectionsLivrees) + '</span>' +
        '</summary>' +
        details +
      '</details>';

    box.innerHTML =
      '<div style="height:58px;background:#2f49d1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;">USD ' + moneyFmt(balance) + '</div>' +
      '<div style="padding:18px;background:#f3f3f7;min-height:100%;">' +

        '<div style="text-align:center;margin-bottom:14px;">' +
          '<input type="date" value="' + currentBalanceDate + '" onchange="currentBalanceDate=this.value;renderBalancePage();" style="border:none;border-bottom:1px solid #555;background:transparent;text-align:center;font-size:26px;font-weight:700;width:210px;outline:none;">' +
        '</div>' +

        '<div style="background:#fff;border:1px solid #ddd;margin-bottom:10px;">' +
          row("Ventes", vente, false, false) +
          row("Prix", prix, false, false) +
          row("Commission", commission, false, false) +
          row("RÉSULTAT", resultat, true, false) +
        '</div>' +

        '<div style="background:#fff;border:1px solid #ddd;margin-bottom:10px;">' +
          row("Initial", initial, false, false) +
          row("Paiement reçu", paiementRecu, false, false) +
          row("SOUS-TOTAL", sousTotal, true, false) +
        '</div>' +

        collectionsBlock +

        '<div style="background:#fff;border:1px solid #ddd;margin-bottom:10px;">' +
          row("BALANCE", balance, true, false) +
        '</div>' +

        '<div style="background:#eef1f5;border:1px solid #ddd;">' +
          row("CRÉDIT", credit, true, false) +
          row("DISPONIBLE", disponible, true, true) +
        '</div>' +
      '</div>';
  });
}


function timeToMinutes(t){
  t = String(t || "00:00").trim();

  var p = t.split(":");
  if(p.length < 2) return 0;

  var h = Number(p[0] || 0);
  var m = Number(p[1] || 0);

  return (h * 60) + m;
}

function nowMinutes(){
  var d = new Date();
  return (d.getHours() * 60) + d.getMinutes();
}

function getLoteriaState(l){
  var now = nowMinutes();
  var open = timeToMinutes(l.openTime || "00:00");
  var close = timeToMinutes(l.closeTime || "23:59");

  var active = String(l.estatus || "Activo").toLowerCase() === "activo";

  if(!active){
    return { open:false, minutesLeft:0, label:"Bloqueado", color:"#999" };
  }

  var isOpen = false;
  var minutesLeft = 0;

  if(open <= close){
    isOpen = now >= open && now < close;
    minutesLeft = close - now;
  }else{
    isOpen = now >= open || now < close;

    if(now >= open){
      minutesLeft = (1440 - now) + close;
    }else{
      minutesLeft = close - now;
    }
  }

  if(!isOpen){
    return { open:false, minutesLeft:0, label:"Fèmen", color:"#999" };
  }

  var h = Math.floor(minutesLeft / 60);
  var m = minutesLeft % 60;

  var label = "";
  if(h > 0){
    label = h + " heure " + m + " minutes";
  }else{
    label = m + " minutes";
  }

  var color = "#666";
  if(minutesLeft <= 5){
    color = "#e00000";
  }else if(minutesLeft <= 30){
    color = "#d99a00";
  }

  return {
    open:true,
    minutesLeft:minutesLeft,
    label:label,
    color:color
  };
}

async function loadVendorLoteries(){
  try{
    const res = await fetch("/api/vendor/loterias?reload=" + Date.now());
    const data = await res.json();

    if(Array.isArray(data) && data.length){
      loteries = data.map(function(l){
        return {
          name: l.name,
          sub: "",
          openTime: l.openTime || "00:00",
          closeTime: l.closeTime || "23:59",
          time: l.closeTime || "23:59",
          estatus: l.estatus || "Activo"
        };
      });
    }
  }catch(err){
    console.error("Erreur load loteries:", err);
  }
}

function openVendorDrawer(){
  document.getElementById("sideMenu").classList.add("open");
  document.getElementById("drawerOverlay").classList.add("show");
}

function closeVendorDrawer(){
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("show");
}

</script>
</body>
</html>
`);
});

app.get("/print", async (req, res) => {
  try {
    const ticketId = String(req.query.ticketId || "").trim();
    const sellerId = String(req.query.sellerId || "").trim().toUpperCase();

   const ticket = await Ticket.findOne({
  $or: [
    { id: ticketId },
    { ticketId: ticketId },
    { serial: ticketId }
  ]
}).lean();

if (!ticket) {
  return res.status(404).send("Ticket introuvable");
}

   let vendeur = null;

if (sellerId) {
  vendeur = await Vendor.findOne({ id: sellerId }).lean();
}

const sellerName = String(
  (vendeur && (vendeur.nom || vendeur.nombre)) ||
  ticket.vendeurNom ||
  ticket.vendeur ||
  sellerId ||
  "VENDEUR"
);

    const total = Number(ticket.total || 0);
    const dateStr = ticket.dateLabel || formatDateFR(new Date(ticket.createdAt || Date.now()));
    const timeStr = ticket.timeLabel || formatTimeFR(new Date(ticket.createdAt || Date.now()));

    let lotSeen = {};
    let loteriesHtml = "";

    (ticket.jeux || []).forEach(j => {
      const lot = String(j.loterie || "").trim() || "SANS TIRAGE";
      if (!lotSeen[lot]) {
        lotSeen[lot] = true;
        loteriesHtml += '<div class="tirage">' + lot + '</div>';
      }
    });

    const gameMap = {};
    let gamesHtml = "";

    (ticket.jeux || []).forEach(j => {

if (j.gratis === true || j.free === true) {
  return;
}

      let typeRaw = String(j.type || "").toUpperCase();
      let numero = String(j.numero || "").trim();
      let montant = Number(j.montant || 0);

      let type = typeRaw;
      if (typeRaw === "BOR") type = "Borlette";
      else if (typeRaw === "MAR") type = "Mariage";
      else if (typeRaw === "L41") type = "Loto4";


      let loterie =
  String(j.loterie || j.loteria || "").trim().toUpperCase();

let key =
  loterie + "|" + type + "|" + numero + "|" + montant;

   if (!gameMap[key]) {

  gameMap[key] = {
    type,
    numero,
    montant,
    count: 0,
    gratis: j.gratis === true,
    free: j.free === true
  };

}

      gameMap[key].count++;
    });

    Object.values(gameMap).forEach(g => {
      let totalLine =
  g.gratis || g.free
    ? "Gratis"
    : (g.montant * g.count).toFixed(2);

      gamesHtml +=
        '<div class="game-row">' +
          '<div class="col-type">' + (g.type === "L41" ? "Loto4" : g.type) + '</div>' +
          '<div class="col-num">' + g.numero + '</div>' +
          '<div class="col-amt">' + totalLine + '</div>' +
        '</div>';
    });

    const freeGames = (ticket.jeux || []).filter(
  j => j.gratis === true || j.free === true
);

let freeHtml = "";

let freeMap = {};

freeGames.forEach(j => {

  let loterie = String(
    j.loterie || j.loteria || ""
  ).trim();

  if (!freeMap[loterie]) {
    freeMap[loterie] = [];
  }

  freeMap[loterie].push(j);

});

Object.keys(freeMap).forEach(loterie => {

  freeHtml +=
    '<div class="tirage">' + loterie + '</div>';

  freeMap[loterie].forEach(j => {

    let typeRaw = String(j.type || "").toUpperCase();

let type = typeRaw;

if (typeRaw === "BOR") type = "Borlette";
else if (typeRaw === "MAR") type = "Mariage";
else if (typeRaw === "L41") type = "Loto4";
   

    let numero = String(j.numero || "").trim();

    freeHtml +=
      '<div class="game-row">' +
        '<div class="col-type">' + (type === "L41" ? "Loto4" : type) + '</div>' +
        '<div class="col-num">' + numero + '</div>' +
        '<div class="col-amt">Gratis</div>' +
      '</div>';

  });

});

    res.set("Content-Type", "text/html; charset=utf-8");

const APP_CONFIG =
  await AppConfig.findOne({ key:"main" }).lean()
  || {};

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Print</title>
<style>
@page{ size:58mm auto; margin:0; }
body{
  width:42mm;
  margin:0 auto;
  font-family:monospace;
  font-size:10px;
}
.title{text-align:center;font-weight:700;margin-bottom:4px;}
.meta{margin-bottom:4px;}
.line{border-top:1px dashed #000;margin:4px 0;}
.tirage{font-weight:700;margin-top:4px;}
.game-row{
  display:grid;
  grid-template-columns:1fr 30px 40px;
}
.col-amt{text-align:right;}
.total{font-weight:700;margin-top:4px;}
</style>
</head>
<body>

${APP_CONFIG.ticketLogo ? `
<div style="text-align:center;margin-bottom:6px;">
  <img
    src="${APP_CONFIG.ticketLogo}"
    style="width:120px;max-height:120px;object-fit:contain;"
  >
</div>
` : ""}

<div class="title">NUMBER ONE LOTO 2</div>

<div class="meta">
SELLER ${sellerName}<br>
TICKET ${ticket.id || ticket.ticketId || ticket.serial || ticketId}<br>
DATE ${dateStr} ${timeStr}
</div>

<div class="line"></div>

${loteriesHtml}

<div class="line"></div>

${gamesHtml}

${freeHtml}

<div class="line"></div>

<div class="total">TOTAL: ${total.toFixed(2)}</div>

<div
  style="
    margin-top:14px;
    text-align:center;
    font-size:8px;
  "
>
  ${APP_CONFIG.ticketMessage || ""}
</div>

<script>
setTimeout(function(){
  window.print();
}, 300);
</script>

</body>
</html>
    `);

  } catch (err) {
    console.error("PRINT ERROR:", err);
    res.status(500).send("Erreur impression");
  }
});

app.get("/print-report", async (req, res) => {
  try {
    const sellerId = String(req.query.sellerId || "").trim().toUpperCase();
    const start = String(req.query.start || "").trim();
    const end = String(req.query.end || "").trim();

    const printDate = String(req.query.date || "").trim();
    const printTime = String(req.query.time || "").trim();

    function money(v) {
      if (v === null || v === undefined) return 0;
      const n = Number(String(v).replace(/,/g, "").trim());
      return Number.isFinite(n) ? n : 0;
    }

    function formatFRDateInput(iso) {
      if (!iso) return "";
      const p = String(iso).split("-");
      if (p.length !== 3) return iso;
      return p[2] + "/" + p[1] + "/" + p[0];
    }

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

    const vendeur = await Vendor.findOne({ id: sellerId }).lean();

    const sellerName = String(
      vendeur?.nom || vendeur?.nombre || sellerId || "SELLER"
    );

    const tickets = await Ticket.find({ vendeur: sellerId }).lean();

    let vente = 0;
    let prix = 0;

    tickets.forEach(t => {
      const d = ticketDay(t);
      if (start && d < start) return;
      if (end && d > end) return;

      const st = normalizeStatus(t.status);
      if (st === "ANILE") return;

      vente += money(t.total);

      if (st === "GANYE") {
        prix += money(t.premio);
      }
    });

    const rate = money(
      vendeur?.comision?.general ??
      vendeur?.comisionGeneral ??
      vendeur?.com_general ??
      0
    );

    const commission = (vente * rate) / 100;
    const resultat = vente - prix - commission;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Rapport</title>
<style>
@page{ size:58mm auto; margin:0; }
html,body{ margin:0; padding:0; background:#fff; }
body{
  width:42mm;
  margin:0 auto;
  padding:1mm;
  font-family:monospace;
  font-size:9px;
  color:#000;
  line-height:1.2;
}
.title{ text-align:center; font-size:10px; font-weight:700; margin-bottom:3px; }
.center{text-align:center;}
.line{ border-top:1px dashed #000; margin:4px 0; }
.row{ display:grid; grid-template-columns:1fr auto; gap:4px; margin:3px 0; }
.boxline{ border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0; }
</style>
</head>
<body>
  <div class="title">NUMBER ONE LOTO 2</div>
  <div class="center">RAPPORT</div>
  <div class="center">${sellerName}</div>
  <div class="center">${formatFRDateInput(start)} / ${formatFRDateInput(end)}</div>
  <div class="center">[ ${printDate} ${printTime} ]</div>

  <div class="line"></div>

 <div class="boxline">
  <div class="row"><span>| Ventes</span><b>${Number(vente || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} |</b></div>

  <div class="row"><span>| Prix</span><b>${Number(prix || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} |</b></div>

  <div class="row"><span>| Commission</span><b>${Number(commission || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} |</b></div>

  <div class="row"><span>| Balance</span><b>${Number(resultat || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} |</b></div>
</div>

<script>
setTimeout(function(){
  try{ window.print(); }catch(e){}
},300);
</script>
</body>
</html>
    `);

  } catch (err) {
    console.error("Erreur print-report:", err);
    res.status(500).send("Erreur rapport");
  }
});



app.get("/api/reportes/tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 }).lean();
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});


app.get("/tickets/:vendeur", async (req, res) => {
  try {
    const vendeurId = String(req.params.vendeur || "").trim().toUpperCase();
    const tickets = await Ticket.find({ vendeur: vendeurId }).sort({ createdAt: -1 }).lean();
    res.json(tickets);
  } catch (err) {
    res.status(500).json([]);
  }
});

const adminRoutes = require("./admin");
app.use(adminRoutes);

app.get("/test-vendors", async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/test-tickets", async (req, res) => {
  const tickets = await Ticket.find();
  res.json(tickets);
});

app.get("/api/grupos", async (req, res) => {

  const grupos = await Grupo.find().sort({ nombre: 1 });

  res.json(grupos);

});

app.post("/api/grupos", async (req, res) => {

  const nombre = String(req.body.nombre || "").trim();

  if(!nombre){
    return res.status(400).json({
      ok:false
    });
  }

  const existe = await Grupo.findOne({ nombre });

  if(existe){
    return res.json({
      ok:true
    });
  }

  const grupo = await Grupo.create({
  nombre,
  estatus:"Activo",
  comisionGrupo: Number(req.body.comisionGrupo || 0)
});

  res.json({
    ok:true,
    grupo
  });

});

app.put("/api/grupos/:id", async (req, res) => {
  try {

    const nombre = String(req.body.nombre || "").trim();

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        message: "Nom groupe obligatoire"
      });
    }

    const grupo = await Grupo.findOneAndUpdate(
      { nombre: req.params.id },
      { nombre },
      { new: true }
    );

    if (!grupo) {
      return res.status(404).json({
        ok: false,
        message: "Grupo pa jwenn"
      });
    }

    res.json({
      ok: true,
      grupo
    });

  } catch (err) {

    console.error("Erreur modification grupo:", err);

    res.status(500).json({
      ok: false
    });

  }
});

app.put("/api/grupos/block/:nombre", async (req, res) => {
  try{
    const nombre = decodeURIComponent(req.params.nombre || "").trim();

    await Grupo.updateOne(
      { nombre },
      { $set:{ estatus:"Bloqueado" } }
    );

    await Vendor.updateMany(
      { $or:[ { zona:nombre }, { groupe:nombre } ] },
      { $set:{ grupoBloqueado:true } }
    );

    res.json({ ok:true });
  }catch(err){
    console.error(err);
    res.status(500).json({ ok:false });
  }
});

app.put("/api/grupos/unblock/:nombre", async (req, res) => {
  try{
    const nombre = decodeURIComponent(req.params.nombre || "").trim();

    await Grupo.updateOne(
      { nombre },
      { $set:{ estatus:"Activo" } }
    );

    await Vendor.updateMany(
      { $or:[ { zona:nombre }, { groupe:nombre } ] },
      { $set:{ grupoBloqueado:false } }
    );

    res.json({ ok:true });
  }catch(err){
    console.error(err);
    res.status(500).json({ ok:false });
  }
});

app.delete("/api/grupos/:nombre", async (req, res) => {
  try{
    const nombre = decodeURIComponent(req.params.nombre || "").trim();

    await Grupo.deleteOne({ nombre });

    await Vendor.updateMany(
      { $or:[ { zona:nombre }, { groupe:nombre } ] },
      { $set:{ zona:"", groupe:"", grupoBloqueado:false } }
    );

    res.json({ ok:true });
  }catch(err){
    console.error(err);
    res.status(500).json({ ok:false });
  }
});
 
app.listen(3001, "0.0.0.0", () => {
  console.log("Server ap mache sou rezo a");
});
