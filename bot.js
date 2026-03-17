const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- SISTEMA PARA MANTER ONLINE NA RENDER ---
// Isso cria um servidor básico na porta 8080 para a Render não "matar" o bot.
http.createServer((req, res) => {
  res.write('VOLX BOT ONLINE');
  res.end();
}).listen(process.env.PORT || 8080);

// --- CONFIGURAÇÕES ---
const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const MODS_FILE = 'mods_db.json';
const DB_FILE = 'users_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- BANCO DE DADOS ---
let mods = fs.existsSync(MODS_FILE) ? JSON.parse(fs.readFileSync(MODS_FILE)) : [];
let users = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};

const saveMods = () => fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
const saveUsers = () => fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));

const generateModID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'VOLX-' + code;
};

// --- COMANDOS DE DONO (PRIVADOS) ---

bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply(`👑 *PAINEL DO DONO VOLX*\n\n` +
              `/enviar - Adicionar novo mod\n` +
              `/users - Lista detalhada de usuários\n` +
              `/stats - Ver números do bot\n` +
              `/delmod [ID] - Apagar um mod\n` +
              `/aviso [texto] - Enviar aviso para todos`, { parse_mode: 'Markdown' });
});

bot.command('users', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    let msg = "👥 *RELATÓRIO DE USUÁRIOS*\n\n";
    Object.entries(users).forEach(([id, u]) => {
        msg += `👤 *Nome:* ${u.nome}\n` +
               `🔗 *User:* ${u.username || 'Sem @'}\n` +
               `🆔 *UID:* \`${id}\`\n` +
               `📊 *Refs:* ${u.ind}\n\n`;
    });
    if (msg === "👥 *RELATÓRIO DE USUÁRIOS*\n\n") msg = "⚠️ Nenhum usuário registrado.";
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('enviar', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.session = { step: 'WAITING_CONTENT' };
    ctx.reply("📤 *NOVO MOD*\n\nEnvie o **ARQUIVO** ou o **LINK** agora:", { parse_mode: 'Markdown' });
});

bot.command('delmod', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const id = ctx.payload.toUpperCase();
    const initialLen = mods.length;
    mods = mods.filter(m => m.id !== id);
    if (mods.length < initialLen) {
        saveMods();
        ctx.reply(`✅ Mod ${id} removido com sucesso.`);
    } else {
        ctx.reply("❌ ID não encontrado.");
    }
});

// --- COMANDOS PÚBLICOS ---

bot.start((ctx) => {
    const id = ctx.from.id;
    const ref = ctx.payload;
    if (!users[id]) {
        users[id] = { 
            nome: ctx.from.first_name, 
            username: ctx.from.username ? `@${ctx.from.username}` : null, 
            ind: 0 
        };
        if (ref && users[ref] && ref != id) {
            users[ref].ind++;
            bot.telegram.sendMessage(ref, `🎉 Alguém entrou pelo seu link de indicação!`).catch(()=>{});
        }
        saveUsers();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}!\n\nBem-vindo ao *VOLX CHEATS* 🚀\n\nUse /mods para ver os cheats disponíveis ou /link para indicar amigos.`);
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 *Seu link de indicação:*\n\n\`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\`\n\nIndique amigos e suba no /ranking!`, { parse_mode: 'Markdown' });
});

bot.command('ranking', (ctx) => {
    const top = Object.entries(users)
        .sort((a, b) => b[1].ind - a[1].ind)
        .slice(0, 15);
    
    let msg = "🏆 *TOP 15 INDICADORES*\n\n";
    top.forEach(([id, u], i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
        msg += `${medal} ${i+1}º - ${u.nome} — *${u.ind}* refs\n`;
    });
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'att'], (ctx) => {
    if (mods.length === 0) return ctx.reply("📦 Nenhum mod disponível no momento.");
    let msg = "📦 *CATÁLOGO DE MODS*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nCódigo: \`${m.id}\`\n\n`);
    msg += "_Digite o código do mod para baixar._";
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Entrega automática de mods
bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const mod = mods.find(m => m.id === ctx.message.text.toUpperCase());
    if (!mod) return;
    ctx.reply(`🚀 Preparando envio de: *${mod.description}*`, { parse_mode: 'Markdown' });
    if (mod.type === 'file') {
        ctx.replyWithDocument(mod.content, { caption: `✅ Mod: ${mod.description}` });
    } else {
        ctx.reply(`🔗 *Link para Download:*\n\n${mod.content}`, { parse_mode: 'Markdown' });
    }
});

// Lógica de recebimento do /enviar
bot.on(['document', 'video', 'audio', 'text'], async (ctx, next) => {
    if (!ctx.session || ctx.from.id !== OWNER_ID || ctx.message.text?.startsWith('/')) return next();
    
    if (ctx.session.step === 'WAITING_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.newMod = { 
            id: generateModID(), 
            content: fileId || ctx.message.text, 
            type: fileId ? 'file' : 'link' 
        };
        ctx.session.step = 'WAITING_DESC';
        return ctx.reply("📝 Agora digite a **DESCRIÇÃO** do mod:");
    }
    
    if (ctx.session.step === 'WAITING_DESC') {
        ctx.session.newMod.description = ctx.message.text;
        mods.push(ctx.session.newMod);
        saveMods();
        ctx.reply(`✅ *MOD CADASTRADO!*\n\nID: \`${ctx.session.newMod.id}\`\nDescrição: ${ctx.session.newMod.description}`, { parse_mode: 'Markdown' });
        ctx.session = null;
    }
});

bot.launch().then(() => console.log("🚀 VOLX ONLINE!"));

