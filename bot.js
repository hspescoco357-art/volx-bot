const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_OK'); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';
const GROUPS_FILE = 'groups_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const loadJSON = (file, def) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def; }
    catch (e) { return def; }
};

let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, {});
let groups = loadJSON(GROUPS_FILE, []);

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
};

const hasPerm = (id) => (id === OWNER_ID || admins[id]);

// --- TRAVA DE REGISTRO ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    if (id && !users[id] && ctx.message?.text && !ctx.message.text.startsWith('/start')) {
        return ctx.reply("⚠️ *ACESSO NEGADO!*\nRegistre-se com /start no meu privado primeiro.");
    }
    return next();
});

// --- COMANDOS DONO ---
bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 *MENU DONO VOLX*\n\n/admin /unadmin /aviso /users /groups /enviar /delmod /ranking /games /addgroup", { parse_mode: 'Markdown' });
});

// Novo comando /aviso Unificado (PV + Grupos)
bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id)) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite a mensagem após o comando. Ex: /aviso Ola a todos");

    let countU = 0, countG = 0;

    // Enviar para Usuários (PV)
    for (const uId in users) {
        try { await bot.telegram.sendMessage(uId, `📢 *AVISO VOLX:*\n\n${msg}`, { parse_mode: 'Markdown' }); countU++; } catch (e) {}
    }

    // Enviar para Grupos
    for (const gId of groups) {
        try { await bot.telegram.sendMessage(gId, `📢 *AVISO GLOBAL:*\n\n${msg}`, { parse_mode: 'Markdown' }); countG++; } catch (e) {}
    }

    ctx.reply(`✅ *Aviso enviado!*\n👥 Privado: ${countU}\n🏘️ Grupos: ${countG}`, { parse_mode: 'Markdown' });
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id)) return;
    const total = Object.keys(users).length;
    ctx.reply(`📊 *Estatísticas:* ${total} usuários registrados.`, { parse_mode: 'Markdown' });
});

bot.command('admin', (ctx) => { if (ctx.from.id === OWNER_ID) { admins[ctx.payload] = true; save(); ctx.reply("🛡️ Admin ADD."); } });
bot.command('unadmin', (ctx) => { if (ctx.from.id === OWNER_ID) { delete admins[ctx.payload]; save(); ctx.reply("🛡️ Admin REMOVIDO."); } });

bot.command('addgroup', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 Clique abaixo para me adicionar:", Markup.inlineKeyboard([[Markup.button.url("➕ Adicionar", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]]));
});

// --- COMANDOS GERAIS (ANTERIORES) ---
bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        if (ref && users[ref] && ref != id) users[ref].ind++;
        save(); ctx.reply("🚀 *VOLX CHEATS:* Registro concluído!");
    } else ctx.reply("✅ Você já está registrado.");
});

bot.command('ranking', (ctx) => {
    const s = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING DE INDICADORES*\n\n";
    s.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind}\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.on('message', (ctx, next) => {
    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    return next();
});

bot.launch();

