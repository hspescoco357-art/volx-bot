const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Correção para o Cron-job: Resposta curta para evitar erro de "saída muito grande"
http.createServer((req, res) => { 
    res.writeHead(200); 
    res.end('VOLX_OK'); 
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const loadJSON = (file, def) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def; }
    catch (e) { return def; }
};

let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, {});

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// --- FILTRO DE REGISTRO OBRIGATÓRIO ---
bot.use(async (ctx, next) => {
    const id = ctx.from?.id;
    const text = ctx.message?.text || "";
    const protectedCmds = ['/mods', '/ranking', '/link', '/games', '/modsgroup'];

    if (protectedCmds.some(c => text.startsWith(c)) && !users[id]) {
        return ctx.reply("⚠️ *REGISTRO NECESSÁRIO!*\n\nVocê precisa dar /start primeiro para usar o bot.", { parse_mode: 'Markdown' });
    }
    return next();
});

// --- COMANDOS ADMINISTRATIVOS ---
bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) {
        return ctx.reply("👑 *PAINEL DONO*\n/admin /unadmin /aviso /users /delmod", { parse_mode: 'Markdown' });
    }
    if (admins[id]) {
        return ctx.reply(`🛡️ *PAINEL ADMIN*\nPoderes: ${admins[id].join(', ')}`, { parse_mode: 'Markdown' });
    }
});

// --- SISTEMA DE GAMES (/games) ---
bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*\nEscolha seu jogo:", Markup.inlineKeyboard([
        [Markup.button.callback('😵 Jogo da Forca', 'menu_forca')],
        [Markup.button.callback('❌ Jogo da Velha', 'menu_velha')]
    ]));
});

// Lógica de Forca (2-6 Jogadores)
bot.action('menu_forca', (ctx) => {
    ctx.editMessageText("😵 *FORCA MULTIJOGADOR*\n\nQuantos usuários vão jogar? (2 a 6)\n\nDigite: `/forca [quantidade]`", { parse_mode: 'Markdown' });
});

bot.command('forca', (ctx) => {
    const qtd = parseInt(ctx.payload);
    if (qtd >= 2 && qtd <= 6) {
        ctx.reply(`✅ Jogo da Forca iniciado para ${qtd} jogadores!\nO criador deve escolher a palavra agora.`);
    } else {
        ctx.reply("❌ Escolha entre 2 e 6 jogadores.");
    }
});

// Jogo da Velha
bot.action('menu_velha', (ctx) => {
    ctx.editMessageText("❌ *JOGO DA VELHA*\n\nDesafie alguém no grupo!", Markup.inlineKeyboard([
        [Markup.button.callback('Desafiar!', 'velha_start')]
    ]));
});

// --- CORREÇÃO DO /AVISO (FILA) ---
bot.command('aviso', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Use: /aviso [texto]");

    const targets = Object.keys(users);
    ctx.reply(`📢 Enviando para ${targets.length} usuários...`);

    for (const t of targets) {
        try {
            await bot.telegram.sendMessage(t, `📢 *AVISO*\n\n${msg}`);
            await new Promise(r => setTimeout(r, 100)); 
        } catch (e) {}
    }
    ctx.reply("✅ Envio concluído!");
});

// --- COMANDOS DA IMAGEM ---
bot.start((ctx) => {
    const id = ctx.from.id;
    if (!users[id]) { users[id] = { nome: ctx.from.first_name, ind: 0 }; save(); }
    ctx.reply("🚀 *VOLX CHEATS REGISTRADO!*");
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    let m = "📦 *CATÁLOGO VOLX*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}* | ID: \`${mod.id}\`\n\n`);
    ctx.reply(m || "Vazio", { parse_mode: 'Markdown' });
});

bot.command('ranking', (ctx) => {
    const r = Object.entries(users).sort((a,b) => b[1].ind - a[1].ind).slice(0, 10);
    let m = "🏆 *RANKING*\n\n";
    r.forEach(([id, u], i) => m += `${i+1}º - ${u.nome} - ${u.ind}\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 Link: \`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.launch();

