const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor para o Render/Oracle não derrubar o bot
http.createServer((req, res) => { 
    res.writeHead(200); 
    res.end('VOLX_OK'); 
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '7629557685:AAF8M1A5-uU-yX6_F6W6Y5M8Z7X9Y4M3X1';
const OWNER_ID = 6365451230; // Seu UID br7 modz
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

// --- 🛡️ TRAVA ANTI-FLOOD (CORREÇÃO DA PRINT) ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    const text = ctx.message?.text || "";
    
    // Se não for o dono, não for admin e não estiver registrado
    if (id && id !== OWNER_ID && !admins[id] && !users[id]) {
        // SÓ responde se for o comando /start no privado
        if (text.startsWith('/start') && ctx.chat.type === 'private') {
            return ctx.reply("❌ **ACESSO NEGADO.**\nFale com @Volxcheatsofc para registro.");
        }
        return; // SILÊNCIO TOTAL para o resto (Evita o loop de acesso negado)
    }
    return next();
});

// --- COMANDOS ---
bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 *MENU DONO VOLX*\n\n/admin /unadmin /aviso /users /groups /enviar /delmod /ranking /games /addgroup", { parse_mode: 'Markdown' });
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id)) return;
    const total = Object.keys(users).length;
    ctx.reply(`📊 *Estatísticas:* ${total} usuários registrados.`, { parse_mode: 'Markdown' });
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id)) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Uso: /aviso [mensagem]");
    
    let uCount = 0, gCount = 0;
    for (const uId in users) { try { await bot.telegram.sendMessage(uId, `📢 *AVISO:* ${msg}`); uCount++; } catch(e){} }
    for (const gId of groups) { try { await bot.telegram.sendMessage(gId, `📢 *AVISO:* ${msg}`); gCount++; } catch(e){} }
    ctx.reply(`✅ Enviado para ${uCount} pessoas e ${gCount} grupos.`);
});

bot.on('message', (ctx) => {
    // Registra grupo automaticamente
    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) { 
        groups.push(ctx.chat.id); 
        save(); 
    }
    
    const text = ctx.message.text?.toUpperCase() || "";
    
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
    }
});

bot.launch().then(() => console.log("🚀 Bot Volx (Telegraf) Online!"));

