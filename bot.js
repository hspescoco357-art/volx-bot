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

const safeSend = (ctx, text, extra = {}) => {
    return ctx.reply(text, extra).catch(() => console.log("Erro: Usuário bloqueou o bot."));
};

// --- VERIFICAÇÃO DE CARGOS ---
const isOwner = (id) => id === OWNER_ID;
const isAdmin = (id) => admins.includes(id) || id === OWNER_ID;

// --- COMANDOS EXCLUSIVOS DO DONO ---

bot.command('admin', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = parseInt(ctx.payload);
    if (!target) return ctx.reply("❌ Use: /admin [ID]");
    if (!admins.includes(target)) {
        admins.push(target);
        save(ADMINS_FILE, admins);
        ctx.reply(`✅ Usuário ${target} agora é ADMIN.`);
    }
});

bot.command('unadmin', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = parseInt(ctx.payload);
    admins = admins.filter(id => id !== target);
    save(ADMINS_FILE, admins);
    ctx.reply(`❌ Usuário ${target} removido dos ADMINS.`);
});

bot.command('aviso', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite o texto: /aviso [mensagem]");
    
    const allUsers = Object.keys(users);
    ctx.reply(`📢 Enviando aviso para ${allUsers.length} usuários...`);
    
    for (const id of allUsers) {
        try {
            await bot.telegram.sendMessage(id, `📢 *AVISO VOLX CHEATS*\n\n${msg}`, { parse_mode: 'Markdown' });
        } catch (e) { console.log(`Falha ao avisar ${id}`); }
    }
    ctx.reply("✅ Aviso enviado!");
});

// --- COMANDOS DE ADMIN (ADICIONAR MODS / USERS) ---

bot.command('comands', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    let menu = `👑 *PAINEL ADMINISTRATIVO*\n\n` +
               `/enviar - Adicionar novo mod\n` +
               `/users - Ver usuários\n` +
               `/delmod [ID] - Apagar mod\n`;
    if (isOwner(ctx.from.id)) menu += `/aviso - Mensagem global\n/admin [ID] - Add admin\n/unadmin [ID] - Remove admin`;
    safeSend(ctx, menu, { parse_mode: 'Markdown' });
});

bot.command('users', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    let msg = "👥 *RELATÓRIO DE USUÁRIOS*\n\n";
    Object.entries(users).forEach(([id, u]) => {
        msg += `👤 ${u.nome} | ID: \`${id}\` | Refs: ${u.ind}\n`;
    });
    safeSend(ctx, msg, { parse_mode: 'Markdown' });
});

bot.command('enviar', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    ctx.session = { step: 'WAITING_CONTENT' };
    safeSend(ctx, "📤 Envie o **ARQUIVO** ou **LINK**:");
});

// --- COMANDOS PÚBLICOS (START, LINK, RANKING, MODS) ---
// (Mantenha igual ao código anterior para economizar espaço aqui)
bot.start((ctx) => {
    const id = ctx.from.id;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        save(DB_FILE, users);
    }
    safeSend(ctx, `👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*`, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'att'], (ctx) => {
    if (mods.length === 0) return safeSend(ctx, "📦 Sem mods.");
    let msg = "📦 *CATÁLOGO DE MODS*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nID: \`${m.id}\`\n\n`);
    safeSend(ctx, msg, { parse_mode: 'Markdown' });
});

bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const mod = mods.find(m => m.id === ctx.message.text.toUpperCase());
    if (!mod) return;
    if (mod.type === 'file') {
        ctx.replyWithDocument(mod.content, { caption: `✅ Mod: ${mod.description}` }).catch(() => {});
    } else {
        safeSend(ctx, `🔗 *Link:* ${mod.content}`);
    }
});

// Lógica de receber mod (Admin)
bot.on(['document', 'video', 'audio', 'text'], async (ctx, next) => {
    if (!ctx.session || !isAdmin(ctx.from.id) || ctx.message.text?.startsWith('/')) return next();
    if (ctx.session.step === 'WAITING_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.newMod = { id: 'VOLX-'+Math.random().toString(36).substr(2,4).toUpperCase(), content: fileId || ctx.message.text, type: fileId ? 'file' : 'link' };
        ctx.session.step = 'WAITING_DESC';
        return safeSend(ctx, "📝 Digite a **DESCRIÇÃO**:");
    }
    if (ctx.session.step === 'WAITING_DESC') {
        ctx.session.newMod.description = ctx.message.text;
        mods.push(ctx.session.newMod);
        save(MODS_FILE, mods);
        safeSend(ctx, `✅ MOD CADASTRADO! ID: \`${ctx.session.newMod.id}\``, { parse_mode: 'Markdown' });
        ctx.session = null;
    }
});

bot.launch().then(() => console.log("🚀 VOLX ATUALIZADO!"));

