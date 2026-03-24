const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor para manter o Render ativo
http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_OK'); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091; 

const loadJSON = (file, def) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def; }
    catch (e) { return def; }
};

let users = loadJSON('users_db.json', {});
let mods = loadJSON('mods_db.json', []);
let admins = loadJSON('admins_db.json', {});
let groups = loadJSON('groups_db.json', []);

const save = () => {
    fs.writeFileSync('users_db.json', JSON.stringify(users, null, 2));
    fs.writeFileSync('mods_db.json', JSON.stringify(mods, null, 2));
    fs.writeFileSync('admins_db.json', JSON.stringify(admins, null, 2));
    fs.writeFileSync('groups_db.json', JSON.stringify(groups, null, 2));
};

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const hasPerm = (id) => (id === OWNER_ID || admins[id]);

// --- 🛡️ TRAVA DE SEGURANÇA AJUSTADA PARA GRUPOS ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    const isGroup = ctx.chat.type.includes('group');
    
    // Se for grupo, registra o ID e permite os comandos
    if (isGroup) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
        return next(); 
    }

    // No privado: Dono, Admins e VIPs passam. Outros só veem o /start
    if (id && !hasPerm(id) && !users[id]) {
        if (ctx.message?.text?.startsWith('/start')) return next();
        return; // Silêncio total para evitar o loop de "Acesso Negado"
    }
    return next();
});

// --- COMANDOS LIBERADOS EM GRUPO & PV ---

bot.start((ctx) => {
    ctx.reply("🚀 **BOT VOLX ONLINE!**\n\nUse /menu para ver os comandos disponíveis.");
});

bot.command('id', (ctx) => {
    ctx.reply(`🆔 Seu ID: \`${ctx.from.id}\`\n👥 Chat ID: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
});

bot.command('modsgroup', (ctx) => {
    ctx.reply("📂 **MODS PARA GRUPO:**\n\n• Regedit Free\n• Script Basic v1\n\nChame @Volxcheatsofc para o VIP.");
});

bot.command('games', (ctx) => {
    ctx.reply("🎮 **GAMES DISPONÍVEIS:**\n\n/quiz - Teste seus conhecimentos\n/velha - Tic-Tac-Toe");
});

// --- COMANDOS RESTRITOS (VIP/ADMIN/DONO) ---

bot.command('menu', (ctx) => {
    if (!hasPerm(ctx.from.id) && !users[ctx.from.id]) return;
    ctx.reply("🛠️ **PAINEL VOLX**\n\n/mods - Ver arquivos VIP\n/ranking - Ver top wins\n/link - Seu link de indicação");
});

bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 **MENU DONO VOLX**\n\n/admin /unadmin /aviso /users /groups /enviar /delmod /ranking /games /addgroup", { parse_mode: 'Markdown' });
});

// --- OUVINTE DE MENSAGENS ---
bot.on('message', (ctx) => {
    const text = ctx.message.text?.toUpperCase() || "";
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return ctx.reply(`📦 **MOD:** ${mod.desc}\n🔗 ${mod.cont}`);
    }
});

bot.launch().then(() => console.log("🚀 Bot Volx Online (PV + Grupos)!"));

