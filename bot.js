const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- SERVIDOR PARA MANTER ONLINE ---
http.createServer((req, res) => {
  res.write('VOLX BOT ONLINE');
  res.end();
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- BANCO DE DADOS ---
const loadJSON = (file, def) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def;
let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, []);

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// --- MIDDLEWARE DE PROTEÇÃO E ADM GRUPO ---
bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== 'private') {
        try {
            const botMember = await ctx.getChatMember(ctx.botInfo.id);
            if (botMember.status !== 'administrator') return; 
        } catch (e) { return; }
    }
    const id = ctx.from?.id;
    if (id && users[id]?.banido) return;
    if (id && users[id]?.castigo && users[id].castigo > Date.now()) return;
    return next();
});

const isAdmin = (id) => admins.includes(id) || id === OWNER_ID;

// --- COMANDOS DE DONO (MODERAÇÃO COMPLETA) ---

bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (target && !admins.includes(target)) { admins.push(target); save(); ctx.reply(`✅ ${target} agora é ADMIN.`); }
});

bot.command('unadmin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    admins = admins.filter(id => id !== target);
    save();
    ctx.reply(`❌ ${target} removido dos ADMINS.`);
});

bot.command('ban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (users[target]) { users[target].banido = true; save(); ctx.reply(`🚫 Usuário ${target} banido.`); }
});

bot.command('unban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (users[target]) { users[target].banido = false; save(); ctx.reply(`✅ Usuário ${target} desbanido.`); }
});

bot.command('castigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const [id, min] = ctx.payload.split(' ');
    if (id && min) {
        if (!users[id]) users[id] = { nome: "User", ind: 0 };
        users[id].castigo = Date.now() + (parseInt(min) * 60000);
        save();
        ctx.reply(`🔇 ${id} em castigo por ${min} min.`);
    }
});

bot.command('uncastigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (users[target]) { users[target].castigo = 0; save(); ctx.reply(`🔊 Castigo removido.`); }
});

bot.command('aviso', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite o texto.");
    const ids = Object.keys(users);
    ctx.reply(`📢 Enviando para ${ids.length} usuários...`);
    ids.forEach(id => bot.telegram.sendMessage(id, `📢 *AVISO VOLX CHEATS*\n\n${msg}`, { parse_mode: 'Markdown' }).catch(() => {}));
});

// --- COMANDOS DE ADMIN (GERENCIAMENTO) ---

bot.command('enviar', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    ctx.session = { step: 'WAIT_C' };
    ctx.reply("📤 Envie o arquivo ou link do mod:");
});

bot.command('delmod', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const modId = ctx.payload.toUpperCase().trim();
    const index = mods.findIndex(m => m.id === modId);
    if (index > -1) { mods.splice(index, 1); save(); ctx.reply("🗑️ Mod removido da lista."); }
    else { ctx.reply("❌ ID não encontrado."); }
});

bot.command('users', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const lista = Object.entries(users);
    let msg = `👥 *RELATÓRIO DE USUÁRIOS*\n\n`;
    lista.slice(-20).forEach(([id, u]) => msg += `👤 ${u.nome} | ID: \`${id}\` | Refs: ${u.ind}\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('comands', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    let menu = `👑 *PAINEL ADMINISTRATIVO*\n\n/enviar - Add mod\n/users - Ver usuários\n/delmod ID - Apagar mod\n`;
    if (ctx.from.id === OWNER_ID) menu += `\n🛡️ *MODERAÇÃO*\n/ban /unban [ID]\n/castigo /uncastigo [ID] [min]\n/aviso [texto]\n/admin /unadmin [ID]`;
    ctx.reply(menu, { parse_mode: 'Markdown' });
});

// --- COMANDOS PÚBLICOS (PRIVADO E GRUPOS) ---

bot.start((ctx) => {
    const id = ctx.from.id;
    const ref = ctx.payload;
    
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        if (ref && users[ref] && ref != id) {
            users[ref].ind++;
            bot.telegram.sendMessage(ref, `🎉 Alguém entrou pelo seu link de indicação!`).catch(() => {});
        }
        save();
    }
    
    const welcomeMsg = `👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS* 🚀\n\nUse /mods para ver os cheats disponíveis.`;
    ctx.reply(welcomeMsg, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.command('ranking', (ctx) => {
    const r = Object.entries(users).filter(u => u[1].ind > 0).sort((a,b) => b[1].ind - a[1].ind).slice(0, 15);
    if (!r.length) return ctx.reply("🏆 Ranking de indicações está vazio.");
    let m = "🏆 *TOP 15 INDICADORES (VOLX)*\n\n";
    r.forEach(([id, u], i) => m += `${i+1}º - ${u.nome} — *${u.ind}* refs\n`);
    ctx.reply(m, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.command('modsgroup', (ctx) => {
    if (ctx.chat.type === 'private') return;
    if (mods.length === 0) return ctx.reply("📦 Catálogo vazio.");
    let m = `📦 *CATÁLOGO DE MODS*\nPedido por: ${ctx.from.first_name}\n\n`;
    mods.forEach(mod => m += `🔹 *${mod.desc}*\nID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.command(['mods', 'att'], (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("No grupo use /modsgroup");
    if (mods.length === 0) return ctx.reply("📦 Nenhum mod disponível.");
    let m = "📦 *CATÁLOGO PRIVADO*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}*\nID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 *Seu link de indicação:*\n\n\`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// --- ENTREGA E LÓGICA ---

bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const m = mods.find(mod => mod.id === ctx.message.text.toUpperCase());
    if (m) {
        if (m.type === 'file') ctx.replyWithDocument(m.cont, { caption: `✅ Mod: ${m.desc}` }).catch(() => {});
        else ctx.reply(`🔗 *Link do Mod:*\n\n${m.cont}`);
    }
});

bot.on(['document', 'video', 'audio', 'text'], (ctx, next) => {
    if (!ctx.session || !isAdmin(ctx.from.id) || ctx.message.text?.startsWith('/')) return next();
    if (ctx.session.step === 'WAIT_C') {
        const fid = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.new = { id: 'VOLX-'+Math.random().toString(36).substr(2,4).toUpperCase(), cont: fid || ctx.message.text, type: fid ? 'file' : 'link' };
        ctx.session.step = 'WAIT_D';
        return ctx.reply("📝 Agora digite a **DESCRIÇÃO**:");
    }
    if (ctx.session.step === 'WAIT_D') {
        ctx.session.new.desc = ctx.message.text;
        mods.push(ctx.session.new); save();
        ctx.reply("✅ MOD CADASTRADO COM SUCESSO!");
        ctx.session = null;
    }
});

bot.launch().then(() => console.log("🚀 VOLX ATUALIZADO!"));

