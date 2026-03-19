const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_SYSTEM_OK'); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
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

// Middleware de Registro e Captura de Grupos
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    }
    const id = ctx.from?.id;
    if (id && !users[id] && !ctx.message?.text?.startsWith('/start')) {
        return ctx.reply("⚠️ *REGISTRO NECESSÁRIO!*\n\nUse /start para liberar o bot.", { parse_mode: 'Markdown' });
    }
    return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS DE DONO E ADMIN ---

bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.payload.split(' ');
    const targetId = args[0];
    const perms = args.slice(1); // Ex: /admin 12345 users aviso enviar
    if (!targetId || !perms.length) return ctx.reply("❌ Use: /admin [ID] [permissões]");
    
    admins[targetId] = perms;
    save();
    ctx.reply(`✅ Usuário \`${targetId}\` agora é Admin com: ${perms.join(', ')}`, { parse_mode: 'Markdown' });
});

bot.command('unadmin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const targetId = ctx.payload.trim();
    if (!targetId || !admins[targetId]) return ctx.reply("❌ ID não encontrado na lista de Admins.");
    
    delete admins[targetId];
    save();
    ctx.reply(`🗑️ Privilégios de Admin removidos do ID \`${targetId}\`.`, { parse_mode: 'Markdown' });
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    const lista = Object.entries(users);
    if (!lista.length) return ctx.reply("Nenhum usuário.");

    let m = `👥 *RELATÓRIO VOLX*\n\n`;
    lista.forEach(([id, u]) => {
        const cargo = id == OWNER_ID ? "👑 Dono" : (admins[id] ? "🛡️ Admin" : "👤 Membro");
        m += `👤 *${u.nome}* (\`${id}\`)\n📈 Refs: ${u.ind} | 🔰 ${cargo}\n\n`;
    });
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Use: /aviso [texto]");

    const targets = [...Object.keys(users), ...groups];
    ctx.reply(`📢 Enviando para ${targets.length} destinos...`);

    for (const t of targets) {
        try {
            await bot.telegram.sendMessage(t, `📢 *AVISO VOLX*\n\n${msg}`, { parse_mode: 'Markdown' });
            await new Promise(r => setTimeout(r, 150)); 
        } catch (e) {}
    }
    ctx.reply("✅ Envio concluído!");
});

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) {
        return ctx.reply("👑 *MENU DONO*\n\n/admin [ID] [perms]\n/unadmin [ID]\n/aviso [msg]\n/users\n/enviar\n/delmod [ID]", { parse_mode: 'Markdown' });
    } 
    if (admins[id]) {
        return ctx.reply(`🛡️ *MENU ADMIN*\n\nPoderes: ${admins[id].join(', ')}`, { parse_mode: 'Markdown' });
    }
});

// --- COMANDOS DE MODS ---

bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.session = { step: 'WAIT_C' };
    ctx.reply("📤 Envie o arquivo ou link do Mod:");
});

bot.on(['document', 'video', 'text'], (ctx, next) => {
    if (!ctx.session || ctx.session.step !== 'WAIT_C' || ctx.message.text?.startsWith('/')) return next();
    const fid = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.text;
    const newMod = {
        id: 'VOLX-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        cont: fid,
        desc: ctx.message.caption || "Mod Sem Descrição"
    };
    mods.push(newMod);
    save();
    ctx.session = null;
    ctx.reply(`✅ Mod adicionado! ID: \`${newMod.id}\``, { parse_mode: 'Markdown' });
});

// --- JOGOS E PÚBLICO ---

bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'set_quiz')],
        [Markup.button.callback('❌ Jogo da Velha', 'menu_velha')]
    ]));
});

bot.start((ctx) => {
    if (!users[ctx.from.id]) { users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0 }; save(); }
    ctx.reply("🚀 *VOLX CHEATS REGISTRADO!*");
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    let m = "📦 *CATÁLOGO VOLX*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}* | ID: \`${mod.id}\`\n\n`);
    ctx.reply(m || "Vazio", { parse_mode: 'Markdown' });
});

bot.launch();

