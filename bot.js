const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor para o Render
http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_OK'); }).listen(process.env.PORT || 8080);

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
let games_state = {};

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
};

const hasPerm = (id) => (id === OWNER_ID || admins[id]);

// --- TRAVA DE REGISTRO ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    const text = ctx.message?.text || "";
    if (id && !users[id] && text.startsWith('/') && !text.startsWith('/start')) {
        return ctx.reply("⚠️ *ACESSO NEGADO!*\nRegistre-se com /start no meu privado primeiro.", { parse_mode: 'Markdown' });
    }
    return next();
});

// --- COMANDOS DONO ---
bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 *MENU DONO VOLX*\n\n/admin /unadmin /aviso /avisogroups /users /groups /enviar /delmod /ranking /games /addgroup /id", { parse_mode: 'Markdown' });
});

bot.command('admin', (ctx) => { if (ctx.from.id === OWNER_ID) { admins[ctx.payload] = true; save(); ctx.reply("🛡️ Admin ADD."); } });
bot.command('unadmin', (ctx) => { if (ctx.from.id === OWNER_ID) { delete admins[ctx.payload]; save(); ctx.reply("🛡️ Admin REMOVIDO."); } });

bot.command('delmod', (ctx) => {
    if (!hasPerm(ctx.from.id)) return;
    const idMod = ctx.payload.toUpperCase();
    mods = mods.filter(m => m.id !== idMod);
    save(); ctx.reply(`🗑️ Mod ${idMod} deletado.`);
});

bot.command('addgroup', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 Me adicione a um grupo:", Markup.inlineKeyboard([[Markup.button.url("➕ Adicionar", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]]));
});

// --- GAMES (QUIZ PÚBLICO E VELHA) ---
bot.command('games', (ctx) => ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([[Markup.button.callback('❓ Quiz', 'menu_quiz')], [Markup.button.callback('❌ Jogo da Velha', 'velha_init')]])));

bot.action('menu_quiz', ctx => ctx.editMessageText("🎯 *NÍVEL DO QUIZ:*", Markup.inlineKeyboard([[Markup.button.callback('🟢 Fácil', 'qz_F'), Markup.button.callback('🟡 Médio', 'qz_M')], [Markup.button.callback('🔴 Difícil', 'qz_D')]])));

bot.action(/qz_(.+)/, ctx => {
    const n = ctx.match[1];
    const data = { 
        'F': ["Dono da Volx?", "br7 modz"], 
        'M': ["Equação: 2x+10=20. X?", "5"], 
        'D': ["O que é Offset em Modding?", "Endereço na Lib"] 
    };
    ctx.editMessageText(`🎯 [NÍVEL ${n}]\n${data[n][0]}\n\n(Apenas 1 tentativa!)`, Markup.inlineKeyboard([
        [Markup.button.callback(data[n][1], `qw_${ctx.from.first_name}`)],
        [Markup.button.callback('Opção Incorreta', `ql_${ctx.from.first_name}`)]
    ]));
});

bot.action(/qw_(.+)/, ctx => ctx.editMessageText(`✅ *${ctx.match[1]} ACERTOU!*`, { parse_mode: 'Markdown' }));
bot.action(/ql_(.+)/, ctx => ctx.editMessageText(`❌ *${ctx.match[1]} ERROU!*`, { parse_mode: 'Markdown' }));

// --- COMANDOS GERAIS ---
bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        if (ref && users[ref] && ref != id) users[ref].ind++;
        save(); ctx.reply("🚀 *VOLX CHEATS:* Registro concluído!");
    } else ctx.reply("✅ Você já está registrado.");
});

bot.command('ranking', (ctx) => {
    const s = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING DE INDICADORES*\n\n";
    s.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind}\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("❌ Peça no PV.");
    ctx.reply(`🔗 *LINK:* https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`);
});

bot.command('mods', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("❌ No privado apenas.");
    let m = "📂 *MODS:* \n";
    mods.forEach(x => m += `🔹 ${x.desc} [${x.id}]\n`);
    ctx.reply(mods.length ? m : "Sem mods cadastrados.");
});

bot.command('modsgroup', (ctx) => ctx.reply("📂 O catálogo está no meu privado!"));

// --- OUVINTE PARA SILÊNCIO E CÓDIGOS ---
bot.on('message', (ctx) => {
    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    
    const text = ctx.message.text?.toUpperCase() || "";
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
    }
});

bot.launch();

