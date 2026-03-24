const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor para o Render
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

// --- 🛡️ TRAVA E REGISTRO DE GRUPO ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    const isGroup = ctx.chat.type.includes('group');
    
    if (isGroup && !groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }

    // No privado, silencia quem não é VIP/Dono (exceto /start)
    if (ctx.chat.type === 'private' && id && !hasPerm(id) && !users[id]) {
        if (ctx.message?.text?.startsWith('/start')) return next();
        return; 
    }
    return next();
});

// --- COMANDOS LIBERADOS (GRUPO E PV) ---

bot.start((ctx) => ctx.reply("🚀 **BOT VOLX ONLINE!**\n\nUse /menu para ver os comandos."));

bot.command('id', (ctx) => ctx.reply(`🆔 Seu ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' }));

bot.command('modsgroup', (ctx) => {
    ctx.reply("📂 **MODS FREE (GRUPO):**\n\n• Regedit Mobile V1\n• Aimlock 50%\n\nChame @Volxcheatsofc para o VIP.");
});

bot.command('games', (ctx) => {
    ctx.reply("🎮 **MINI-GAMES:**\n\nEm breve: Quiz e Velha!");
});

// --- COMANDOS RESTRITOS (SÓ PV E VIP) ---

bot.command('menu', (ctx) => {
    if (ctx.chat.type !== 'private' || (!hasPerm(ctx.from.id) && !users[ctx.from.id])) return;
    ctx.reply("🛠️ **PAINEL VIP VOLX**\n\n/mods - Ver arquivos VIP\n/link - Indicação");
});

bot.command('ranking', (ctx) => {
    if (ctx.chat.type !== 'private' || (!hasPerm(ctx.from.id) && !users[ctx.from.id])) return;
    ctx.reply("🏆 **RANKING DE INDICADORES:**\n\n1º - ...\n2º - ...");
});

bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 **MENU DONO**\n\n/admin /aviso /users /groups", { parse_mode: 'Markdown' });
});

bot.launch().then(() => console.log("🚀 Bot Volx Online!"));

