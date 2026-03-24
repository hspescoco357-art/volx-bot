const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor para o Render manter o bot vivo
http.createServer((req, res) => { 
    res.writeHead(200); 
    res.end('VOLX_OK'); 
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091; // Seu UID Owner atualizado

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

// --- 🛡️ TRAVA ANTI-LOOP (MATA O FLOOD) ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    const text = ctx.message?.text || "";
    
    // Se não for o dono, nem admin, nem usuário registrado
    if (id && id !== OWNER_ID && !admins[id] && !users[id]) {
        // Responde apenas ao /start no PV, ignora o resto
        if (text.startsWith('/start') && ctx.chat.type === 'private') {
            return ctx.reply("❌ **ACESSO NEGADO.**\nFale com @Volxcheatsofc.");
        }
        return; 
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

bot.launch()
    .then(() => console.log("🚀 Bot Volx Online com Novo Token!"))
    .catch((err) => console.error("❌ Erro ao ligar:", err));

