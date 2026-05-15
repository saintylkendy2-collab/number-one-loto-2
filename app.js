const express = require('express');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const app = express();

const DATA_FILE = 'vendeurs.json';
const PORT = 3001;

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

function loadUsers() {
try {
if (!fs.existsSync(DATA_FILE)) {
fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}
const raw = fs.readFileSync(DATA_FILE, 'utf8');
return JSON.parse(raw || '{}');
} catch (err) {
return {};
}
}

function saveUsers(users) {
fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function requireSeller(req, res, next) {
const users = loadUsers();
const username = req.cookies.user;

if (!username || !users[username]) {
return res.redirect('/login');
}

req.currentUser = {
username,
...users[username]
};
next();
}

// HOME
app.get('/', (req, res) => {
res.send(`
<html>
<head>
<meta charset="UTF-8">
<title>NUMBER ONE LOTO</title>
</head>
<body style="font-family: monospace; text-align:center;">
<h2>NUMBER ONE LOTO</h2>
<p><a href="/login">LOGIN VANDÈ</a></p>
<p><a href="/admin">MASTER PANEL</a></p>
</body>
</html>
`);
});

// LOGIN PAGE
app.get('/login', (req, res) => {
const users = loadUsers();
const username = req.cookies.user;

if (username && users[username]) {
return res.redirect('/play');
}

res.send(`
<html>
<head>
<meta charset="UTF-8">
<title>LOGIN VANDE</title>
</head>
<body style="font-family: monospace; text-align:center;">
<h2>LOGIN VANDÈ</h2>

<form method="POST" action="/login">
<input name="username" placeholder="Username (eg: NOC100)" required><br><br>
<input type="password" name="password" placeholder="Password" required><br><br>
<button type="submit">LOGIN</button>
</form>

<br>
<a href="/admin">MASTER PANEL</a>
</body>
</html>
`);
});

// LOGIN ACTION
app.post('/login', (req, res) => {
const users = loadUsers();
const username = (req.body.username || '').trim().toUpperCase();
const password = (req.body.password || '').trim();

if (users[username] && users[username].password === password) {
res.cookie('user', username, { maxAge: 1000 * 60 * 60 * 24 * 30 });
return res.redirect('/play');
}

res.send(`
<html>
<head>
<meta charset="UTF-8">
<title>Login pa bon</title>
</head>
<body style="font-family: monospace; text-align:center;">
<h3>Login pa bon</h3>
<a href="/login">Retounen</a>
</body>
</html>
`);
});

// SELLER PAGE
app.get('/play', requireSeller, (req, res) => {
res.send(`
<html>
<head>
<meta charset="UTF-8">
<title>VANT TICKET</title>
</head>
<body style="font-family: monospace; text-align:center;">
<h3>VANDÈ: ${req.currentUser.nom}</h3>

<form method="POST" action="/print">
<textarea name="data" rows="10" cols="24" placeholder="Egzanp:
BOR 58 250
BOR 85 100
MAR 25*36 15" required></textarea><br><br>

<button type="submit">GENERATE</button>
<button type="reset">CLEAR</button>
</form>

<br>
<form method="POST" action="/logout">
<button type="submit">LOGOUT</button>
</form>

<br>
<a href="/admin">MASTER PANEL</a>
</body>
</html>
`);
});

// PRINT
app.post('/print', requireSeller, (req, res) => {
const vendeur = req.currentUser.nom;
const lines = (req.body.data || '').split('\n');

let total = 0;
let output = '';

lines.forEach(line => {
const parts = line.trim().split(/\s+/);
if (parts.length >= 3) {
const type = parts[0];
const num = parts[1];
const amount = parseInt(parts[2], 10);

if (!isNaN(amount)) {
total += amount;
output += `${type} ${num} => ${amount} G<br>`;
}
}
});

const ticket = Math.floor(Math.random() * 1000000000);
const date = new Date().toLocaleString();

res.send(`
<html>
<head>
<meta charset="UTF-8">
<title>Ticket</title>
</head>
<body style="font-family: monospace; text-align:center;">
<div style="width:180px; margin:auto; text-align:left; font-size:13px; line-height:1.4;">
<strong>NUMBER ONE LOTO</strong><br>
<strong>VANDÈ: ${vendeur}</strong><br><br>

Ticket: ${ticket}<br>
Date: ${date}<br><br>

----------------------<br>
${output}
----------------------<br>

<strong>TOTAL =====> ${total} G</strong><br><br>

Fich sa ap peye pa moun ki potel la avan 90 jou.<br>
Mèsi paske chwazi Number One Loto.
</div><br>

<button onclick="window.print()">PRINT</button>
<button onclick="window.location.href='/play'">RETOUNEN</button>
</body>
</html>
`);
});

// LOGOUT
app.post('/logout', (req, res) => {
res.clearCookie('user');
res.redirect('/login');
});

// ADMIN PANEL
app.get('/admin', (req, res) => {
const users = loadUsers();
const editId = (req.query.edit || '').trim().toUpperCase();
const editUser = editId && users[editId] ? users[editId] : null;

let rows = '';
Object.keys(users).sort().forEach(id => {
const u = users[id];
rows += `
<tr>
<td>${id}</td>
<td>${u.nom || ''}</td>
<td>${u.groupe || ''}</td>
<td>${u.password || ''}</td>
<td>
<a href="/admin?edit=${id}">Modifye</a>
<form method="POST" action="/admin/delete" style="display:inline;">
<input type="hidden" name="id" value="${id}">
<button type="submit">Efase</button>
</form>
</td>
</tr>
`;
});

res.send(`
<html>
<head>
<meta charset="UTF-8">
<title>MASTER PANEL</title>
</head>
<body style="font-family: monospace;">
<h2>MASTER PANEL - VANDÈ YO</h2>

<form method="POST" action="/admin/save">
<input type="hidden" name="oldId" value="${editId}">

<label>ID / Username</label><br>
<input name="id" value="${editId}" placeholder="NOC100" required><br><br>

<label>Non vandè</label><br>
<input name="nom" value="${editUser ? editUser.nom : ''}" placeholder="Non vandè" required><br><br>

<label>Gwoup</label><br>
<input name="groupe" value="${editUser ? (editUser.groupe || '') : ''}" placeholder="Gwoup"><br><br>

<label>Password</label><br>
<input name="password" value="${editUser ? editUser.password : '1234'}" placeholder="1234" required><br><br>

<button type="submit">${editUser ? 'MODIFYE VANDE' : 'AJOUTE VANDE'}</button>
</form>

<br><hr><br>

<table border="1" cellpadding="8" cellspacing="0">
<tr>
<th>ID</th>
<th>NON</th>
<th>GWOUP</th>
<th>PASSWORD</th>
<th>AKSYON</th>
</tr>
${rows}
</table>

<br><br>
<a href="/login">LOGIN VANDE</a>
</body>
</html>
`);
});

// SAVE USER
app.post('/admin/save', (req, res) => {
const users = loadUsers();

const oldId = (req.body.oldId || '').trim().toUpperCase();
const newId = (req.body.id || '').trim().toUpperCase();
const nom = (req.body.nom || '').trim();
const groupe = (req.body.groupe || '').trim();
const password = (req.body.password || '').trim();

if (!newId || !nom || !password) {
return res.send('Gen chan ki vid');
}

if (oldId && oldId !== newId) {
delete users[oldId];
}

users[newId] = {
nom,
groupe,
password
};

saveUsers(users);
res.redirect('/admin');
});

// DELETE USER
app.post('/admin/delete', (req, res) => {
const users = loadUsers();
const id = (req.body.id || '').trim().toUpperCase();

if (users[id]) {
delete users[id];
saveUsers(users);
}

res.redirect('/admin');
});

app.listen(PORT, () => {
console.log('Server final ap mache sou http://localhost:' + PORT);
});
