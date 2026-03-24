const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { 
    res.writeHead(200); 
    res.end('VOLX_OK'); 
}).listen(process.env.PORT || 8080);

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

// --- 🛡️ TRAVA DE SEGURANÇA CORRIGIDA ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    const isGroup = ctx.chat.type.includes('group');
    
    // Se for grupo, registra e deixa passar
    if (isGroup) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
        return next(); 
    }

    // No privado, só passa se for Dono, Admin ou User registrado
    if (id && id !== OWNER_ID && !admins[id] && !users[id]) {
        if (ctx.message?.text?.startsWith('/start')) {
            return ctx.reply("❌ **ACESSO NEGADO.**\nFale com @Volxcheatsofc.");
        }
        return; // Silêncio para o resto no PV
    }
    return next();
});

// --- COMANDOS ---
bot.start((ctx) => ctx.reply("🚀 **BOT VOLX ONLINE!**\nUse /menu para ver os comandos."));

bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 *MENU DONO VOLX*\n\n/admin /unadmin /aviso /users /groups /enviar /delmod /ranking /games /addgroup", { parse_mode: 'Markdown' });
});

bot.command('menu', (ctx) => {
    ctx.reply("🛠️ **PAINEL VOLX**\n\n/mods - Ver arquivos\n/id - Ver seu ID\n/ranking - Ver top wins");
});

bot.command('id', (ctx) => {
    ctx.reply(`🆔 ID: \`${ctx.from.id}\` | Chat: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
});

// Resposta de MODS (Ouvinte Geral)
bot.on('message', (ctx) => {
    const text = ctx.message.text?.toUpperCase() || "";
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
    }
});

bot.launch().then(() => console.log("🚀 Bot Volx Online nos Grupos e PV!"));

