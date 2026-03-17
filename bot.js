const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- MANTER ONLINE NA RENDER ---
http.createServer((req, res) => {
  res.write('VOLX BOT ONLINE');
  res.end();
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const MODS_FILE = 'mods_db.json';
const DB_FILE = 'users_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- BANCO DE DADOS ---
let mods = fs.existsSync(MODS_FILE) ? JSON.parse(fs.readFileSync(MODS_FILE)) : [];
let users = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};
let admins = fs.existsSync(ADMINS_FILE) ? JSON.parse(fs.readFileSync(ADMINS_FILE)) : [];

const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- MIDDLEWARE DE PROTEÇÃO (BAN E CASTIGO) ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    if (!id) return next();
    if (users[id]?.banido) return; // Se banido, o bot ignora tudo
    if (users[id]?.castigo && users[id].castigo > Date.now()) {
        const resto = Math.round((users[id].castigo - Date.now()) / 60000);
        return ctx.reply(`⏳ Você está de castigo! Faltam ${resto} min.`).catch(() => {});
    }
    return next();
});

// --- COMANDOS DE DONO (MODERAÇÃO) ---

bot.command('ban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target || !users[target]) return ctx.reply("❌ Use: /ban [ID]");
    users[target].banido = true;
    save(DB_FILE, users);
    ctx.reply(`🚫 Usuário ${target} foi banido permanentemente.`);
});

bot.command('unban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target || !users[target]) return ctx.reply("❌ Use: /unban [ID]");
    users[target].banido = false;
    save(DB_FILE, users);
    ctx.reply(`✅ Usuário ${target} foi desbanido.`);
});

bot.command('castigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const [id, min] = ctx.payload.split(' ');
    if (!id || !min) return ctx.reply("❌ Use: /castigo [ID] [MINUTOS]");
    users[id].castigo = Date.now() + (parseInt(min) * 60000);
    save(DB_FILE, users);
    ctx.reply(`🔇 Usuário ${id} em silêncio por ${min} minutos.`);
});

bot.command('uncastigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target || !users[target]) return ctx.reply("❌ Use: /uncastigo [ID]");
    users[target].castigo = 0;
    save(DB_FILE, users);
    ctx.reply(`🔊 Castigo removido do usuário ${target}.`);
});

// --- COMANDOS DE ADMIN (FIX DO DELMOD) ---

bot.command('delmod', (ctx) => {
    const id = ctx.from.id;
    if (id !== OWNER_ID && !admins.includes(id)) return;
    
    const modId = ctx.payload.toUpperCase();
    if (!modId) return ctx.reply("❌ Use: /delmod [CÓDIGO]");
    
    const index = mods.findIndex(m => m.id === modId);
    if (index > -1) {
        mods.splice(index, 1); // Remove da lista
        save(MODS_FILE, mods); // Salva a lista limpa
        ctx.reply(`🗑️ Mod \`${modId}\` removido com sucesso.`);
    } else {
        ctx.reply("❌ Código não encontrado.");
    }
});

// --- PAINEL ATUALIZADO NO /COMANDS ---
bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id !== OWNER_ID && !admins.includes(id)) return;
    
    let menu = `👑 *PAINEL ADMINISTRATIVO*\n\n` +
               `/enviar - Add mod\n` +
               `/users - Lista de IDs\n` +
               `/delmod [ID] - Apagar da lista\n`;
    
    if (id === OWNER_ID) {
        menu += `\n🛡️ *MODERAÇÃO (DONO)*\n` +
                `/ban /unban [ID]\n` +
                `/castigo /uncastigo [ID] [min]\n` +
                `/aviso [texto] - Global\n` +
                `/admin /unadmin [ID]`;
    }
    ctx.reply(menu, { parse_mode: 'Markdown' });
});

// ... (Mantenha o restante das funções de /start, /mods e bot.on igual ao anterior)
bot.start((ctx) => {
    const id = ctx.from.id;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        save(DB_FILE, users);
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*`, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'att'], (ctx) => {
    if (mods.length === 0) return ctx.reply("📦 Nenhum mod disponível.");
    let msg = "📦 *CATÁLOGO DE MODS*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nID: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.launch().then(() => console.log("🚀 VOLX ATUALIZADO COM MODERAÇÃO!"));

