const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- SERVIDOR PARA MANTER ONLINE NA RENDER ---
http.createServer((req, res) => {
  res.write('VOLX BOT ONLINE');
  res.end();
}).listen(process.env.PORT || 8080);

// --- CONFIGURAÇÕES INICIAIS ---
const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- SISTEMA DE BANCO DE DADOS LOCAL ---
const loadJSON = (file, defaultData) => {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file));
    } catch (e) { console.log(`Erro ao ler ${file}`); }
    return defaultData;
};

let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, []);

const saveData = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// --- MIDDLEWARE DE PROTEÇÃO (BAN E CASTIGO) ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    if (!id) return next();
    if (users[id]?.banido) return; 
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
    saveData();
    ctx.reply(`🚫 Usuário ${target} foi banido.`);
});

bot.command('unban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target || !users[target]) return ctx.reply("❌ Use: /unban [ID]");
    users[target].banido = false;
    saveData();
    ctx.reply(`✅ Usuário ${target} foi desbanido.`);
});

bot.command('castigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.payload.split(' ');
    const id = args[0];
    const min = args[1];
    if (!id || !min) return ctx.reply("❌ Use: /castigo [ID] [MINUTOS]");
    if (!users[id]) users[id] = { nome: "User", ind: 0 };
    users[id].castigo = Date.now() + (parseInt(min) * 60000);
    saveData();
    ctx.reply(`🔇 Usuário ${id} silenciado por ${min} min.`);
});

bot.command('uncastigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = ctx.payload;
    if (!target || !users[target]) return ctx.reply("❌ Use: /uncastigo [ID]");
    users[target].castigo = 0;
    saveData();
    ctx.reply(`🔊 Castigo removido.`);
});

bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target) return ctx.reply("❌ Use: /admin [ID]");
    if (!admins.includes(target)) {
        admins.push(target);
        saveData();
        ctx.reply(`✅ Usuário ${target} agora é ADMIN.`);
    }
});

bot.command('unadmin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    admins = admins.filter(id => id !== target);
    saveData();
    ctx.reply(`❌ Admin ${target} removido.`);
});

// --- COMANDOS DE ADMIN / DONO ---

bot.command('delmod', (ctx) => {
    if (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) return;
    const modId = ctx.payload.toUpperCase().trim();
    if (!modId) return ctx.reply("❌ Use: /delmod [CÓDIGO]");
    const index = mods.findIndex(m => m.id === modId);
    if (index > -1) {
        mods.splice(index, 1);
        saveData();
        ctx.reply(`🗑️ Mod \`${modId}\` removido com sucesso.`);
    } else {
        ctx.reply("❌ Código não encontrado.");
    }
});

bot.command('aviso', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Use: /aviso [mensagem]");
    const allUsers = Object.keys(users);
    ctx.reply(`📢 Enviando aviso para ${allUsers.length} usuários...`);
    for (const id of allUsers) {
        bot.telegram.sendMessage(id, `📢 *AVISO VOLX CHEATS*\n\n${msg}`, { parse_mode: 'Markdown' }).catch(() => {});
    }
});

bot.command('users', (ctx) => {
    if (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) return;
    const lista = Object.entries(users);
    if (lista.length === 0) return ctx.reply("👥 Nenhum usuário.");
    let msg = `👥 *USUÁRIOS REGISTRADOS: ${lista.length}*\n\n`;
    lista.slice(-25).forEach(([id, u]) => {
        msg += `👤 ${u.nome} | ID: \`${id}\` | Refs: ${u.ind}\n`;
    });
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id !== OWNER_ID && !admins.includes(id)) return;
    let menu = `👑 *PAINEL ADMINISTRATIVO*\n\n/enviar - Add mod\n/users - Ver IDs\n/delmod [ID] - Apagar mod\n`;
    if (id === OWNER_ID) {
        menu += `\n🛡️ *DONO*\n/ban /unban [ID]\n/castigo /uncastigo [ID] [min]\n/aviso [texto]\n/admin /unadmin [ID]`;
    }
    ctx.reply(menu, { parse_mode: 'Markdown' });
});

// --- COMANDOS PÚBLICOS ---

bot.start((ctx) => {
    const id = ctx.from.id;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        saveData();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS* 🚀\n\nUse /mods para ver os cheats disponíveis.`, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'att'], (ctx) => {
    if (mods.length === 0) return ctx.reply("📦 Nenhum mod no catálogo.");
    let msg = "📦 *CATÁLOGO DE MODS*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nCódigo: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Entrega de mods por código
bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const mod = mods.find(m => m.id === ctx.message.text.toUpperCase());
    if (!mod) return;
    if (mod.type === 'file') {
        ctx.replyWithDocument(mod.content, { caption: `✅ Mod: ${mod.description}` }).catch(() => {});
    } else {
        ctx.reply(`🔗 *Link do Mod:*\n\n${mod.content}`).catch(() => {});
    }
});

// Lógica de envio de mods (ADMIN/DONO)
bot.on(['document', 'video', 'audio', 'text'], async (ctx, next) => {
    if (!ctx.session || (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) || ctx.message.text?.startsWith('/')) return next();
    
    if (ctx.session.step === 'WAITING_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.newMod = { 
            id: 'VOLX-'+Math.random().toString(36).substr(2,4).toUpperCase(), 
            content: fileId || ctx.message.text, 
            type: fileId ? 'file' : 'link' 
        };
        ctx.session.step = 'WAITING_DESC';
        return ctx.reply("📝 Agora digite a **DESCRIÇÃO** do mod:");
    }
    
    if (ctx.session.step === 'WAITING_DESC') {
        ctx.session.newMod.description = ctx.message.text;
        mods.push(ctx.session.newMod);
        saveData();
        ctx.reply(`✅ *MOD CADASTRADO!*\nCódigo: \`${ctx.session.newMod.id}\``, { parse_mode: 'Markdown' });
        ctx.session = null;
    }
});

bot.command('enviar', (ctx) => {
    if (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) return;
    ctx.session = { step: 'WAITING_CONTENT' };
    ctx.reply("📤 Envie o **ARQUIVO** ou o **LINK** do mod:");
});

bot.launch().then(() => console.log("🚀 VOLX SISTEMA COMPLETO ONLINE!"));

