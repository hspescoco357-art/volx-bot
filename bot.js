const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor para o Render não dar erro
http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_OK'); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091; 

// Função de carregamento segura para evitar o erro "Unhandled error" do Render
const loadJSON = (file, def) => {
    try { 
        if (!fs.existsSync(file)) return def;
        const data = fs.readFileSync(file);
        return data.length > 0 ? JSON.parse(data) : def;
    } catch (e) { return def; }
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

// --- 🛡️ SEGURANÇA E REGISTRO ---
bot.use((ctx, next) => {
    if (!ctx.from || !ctx.chat) return;

    // Se for grupo, registra e deixa passar TUDO
    if (ctx.chat.type.includes('group')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
        return next();
    }

    // No Privado: Dono/Admin/VIP passam. Outros só o /start.
    const id = ctx.from.id;
    if (id !== OWNER_ID && !admins[id] && !users[id]) {
        if (ctx.message?.text?.startsWith('/start')) return next();
        return; 
    }
    return next();
});

// --- COMANDOS LIBERADOS ---
bot.start((ctx) => ctx.reply("🚀 **BOT VOLX ONLINE!**\nUse /menu para ver os comandos."));

bot.command('id', (ctx) => ctx.reply(`🆔 Seu ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' }));

bot.command('modsgroup', (ctx) => {
    ctx.reply("📂 **MODS DISPONÍVEIS (GRUPO):**\n\n• Regedit Free\n• Aimlock 50%\n\nChame @Volxcheatsofc para o VIP.");
});

bot.command('games', (ctx) => {
    ctx.reply("🎮 **GAMES:**\n\n/quiz - Teste seus conhecimentos\n/velha - Tic-Tac-Toe");
});

// --- COMANDOS RESTRITOS (SÓ PV E VIP) ---
bot.command('menu', (ctx) => {
    if (ctx.chat.type !== 'private' || (!hasPerm(ctx.from.id) && !users[ctx.from.id])) return;
    ctx.reply("🛠️ **PAINEL VIP VOLX**\n\n/mods - Ver arquivos VIP\n/link - Indicação");
});

bot.command('ranking', (ctx) => {
    if (ctx.chat.type !== 'private' || (!hasPerm(ctx.from.id) && !users[ctx.from.id])) return;
    ctx.reply("🏆 **RANKING:**\n\nUse o sistema de convites para subir!");
});

bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 **MENU DONO**\n\n/admin /aviso /users /groups", { parse_mode: 'Markdown' });
});

bot.on('message', (ctx) => {
    const text = ctx.message.text?.toUpperCase() || "";
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
    }
});

bot.catch((err) => { console.error('Erro no processamento:', err); });
bot.launch().then(() => console.log("🚀 Volx Bot Online!"));

