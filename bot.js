const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.write('VOLX POWER ONLINE'); res.end(); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json'; // Agora guarda { id, perms: [] }

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const loadJSON = (file, def) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def; }
    catch (e) { return def; }
};

let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, {}); // Objeto: { "ID": ["enviar", "ban"] }

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// --- SISTEMA DE PERMISSÕES ---
const hasPerm = (id, cmd) => {
    if (id === OWNER_ID) return true;
    return admins[id] && admins[id].includes(cmd);
};

// --- COMANDOS DE DONO ---

bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const [target, permsRaw] = ctx.payload.split(' ');
    if (!target || !permsRaw) return ctx.reply("❌ Use: /admin [ID] [comando1,comando2]\nEx: /admin 123456 enviar,ban,users");
    
    const perms = permsRaw.split(',').map(p => p.trim().toLowerCase());
    admins[target] = perms;
    save();
    ctx.reply(`✅ Usuário ${target} agora é ADMIN com acesso a: ${perms.join(', ')}`);
});

bot.command('unadmin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = ctx.payload.trim();
    if (admins[target]) {
        delete admins[target];
        save();
        ctx.reply(`❌ Privilégios de ${target} removidos.`);
    }
});

// --- COMANDOS HIERÁRQUICOS ---

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) {
        return ctx.reply("👑 *MENU DONO SUPREMO*\n\n/admin [ID] [perms] - Dar poder\n/unadmin [ID] - Tirar poder\n/aviso [texto] - Aviso Global\n/ban [ID] - Banir\n/castigo [ID] [min] - Silenciar\n/users - Lista completa\n/enviar - Add Mod\n/delmod [ID] - Apagar Mod", { parse_mode: 'Markdown' });
    } 
    
    if (admins[id]) {
        let m = "🛡️ *MENU ADMINISTRADOR*\nSeus poderes ativos:\n";
        admins[id].forEach(p => m += `🔹 /${p}\n`);
        return ctx.reply(m, { parse_mode: 'Markdown' });
    }

    ctx.reply("👤 *MENU MEMBRO*\n\n/mods - Ver catálogo\n/ranking - Top indicadores\n/link - Meu link ref\n/quiz - Jogar Quiz\n/cruzadinha - Jogar Cruzadinha", { parse_mode: 'Markdown' });
});

bot.command('ban', (ctx) => {
    if (!hasPerm(ctx.from.id, 'ban')) return;
    const t = parseInt(ctx.payload);
    if (users[t]) { users[t].banido = true; save(); ctx.reply(`🚫 Banido por admin: ${t}`); }
});

bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.session = { step: 'WAIT_C' };
    ctx.reply("📤 Envie o arquivo ou link do mod:");
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    const lista = Object.keys(users);
    ctx.reply(`👥 Total de usuários: ${lista.length}`);
});

bot.command('delmod', (ctx) => {
    if (!hasPerm(ctx.from.id, 'delmod')) return;
    const modId = ctx.payload.toUpperCase().trim();
    mods = mods.filter(m => m.id !== modId);
    save();
    ctx.reply(`✅ Mod ${modId} removido.`);
});

// --- COMANDOS GERAIS (GAMES & START) ---

bot.start((ctx) => {
    const id = ctx.from.id;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false };
        save();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*!\n\nUse /mods para ver os mods disponíveis!`);
});

// [O código do Quiz e Cruzadinha permanece o mesmo do anterior aqui]

bot.command(['mods', 'modsgroup'], (ctx) => {
    if (!mods.length) return ctx.reply("📦 Catálogo vazio.");
    let m = "📦 *CATÁLOGO VOLX*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}*\nID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.catch((err) => console.log('Erro:', err));
bot.launch().then(() => console.log("🚀 VOLX HIERARQUIA ATIVA!"));

