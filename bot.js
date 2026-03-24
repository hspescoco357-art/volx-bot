import telebot
from tinydb import TinyDB, Query
import random

# --- CONFIGURAÇÕES ---
TOKEN = '7629557685:AAF8M1A5-uU-yX6_F6W6Y5M8Z7X9Y4M3X1'
OWNER_ID = 6365451230 # Seu UID

db = TinyDB('usuarios.json')
User = Query()
bot = telebot.TeleBot(TOKEN)

# Função para checar acesso
def tem_acesso(user_id):
    if user_id == OWNER_ID: return True
    return db.search(User.id == user_id)

# --- COMANDOS DE INÍCIO E ACESSO ---
@bot.message_handler(commands=['start'])
def start(message):
    uid = message.from_user.id
    if tem_acesso(uid):
        bot.reply_to(message, "✅ **Bot Volx Online!**\n\nUse /menu para ver os comandos.")
    else:
        bot.send_message(message.chat.id, "❌ **ACESSO NEGADO.**\nFale com @Volxcheatsofc")

@bot.message_handler(commands=['add'])
def add(message):
    if message.from_user.id != OWNER_ID: return
    try:
        new_id = int(message.text.split()[1])
        if not db.search(User.id == new_id):
            db.insert({'id': new_id, 'credits': 0, 'wins': 0})
            bot.reply_to(message, f"✅ Usuário {new_id} registrado!")
        else:
            bot.reply_to(message, "⚠️ Já registrado.")
    except:
        bot.reply_to(message, "Use: /add ID")

# --- COMANDOS DE UTILIDADE & MODS ---
@bot.message_handler(commands=['id'])
def get_id(message):
    if not tem_acesso(message.from_user.id): return
    bot.reply_to(message, f"🆔 Seu ID: `{message.from_user.id}`", parse_mode="Markdown")

@bot.message_handler(commands=['mods'])
def mods(message):
    if not tem_acesso(message.from_user.id): return
    menu_text = (
        "🛠️ **MENU MODS VOLX** 🛠️\n\n"
        "1. Regedit Mobile\n"
        "2. Aimlock Script\n"
        "3. No Recoil Config\n\n"
        "Solicite o arquivo com o dono!"
    )
    bot.reply_to(message, menu_text, parse_mode="Markdown")

# --- SISTEMA DE GAMES & RANKING ---
@bot.message_handler(commands=['games'])
def games(message):
    if not tem_acesso(message.from_user.id): return
    bot.reply_to(message, "🎮 **GAMES DISPONÍVEIS:**\n\n/quiz - Teste seus conhecimentos\n/velha - Tic-Tac-Toe")

@bot.message_handler(commands=['ranking'])
def ranking(message):
    if not tem_acesso(message.from_user.id): return
    all_users = db.all()
    # Ordena por vitórias (se existir no seu DB)
    ranking_list = sorted(all_users, key=lambda x: x.get('wins', 0), reverse=True)[:5]
    
    txt = "🏆 **TOP 5 RANKING VOLX** 🏆\n\n"
    for i, u in enumerate(ranking_list, 1):
        txt += f"{i}º | ID: `{u['id']}` - Wins: {u.get('wins', 0)}\n"
    bot.reply_to(message, txt, parse_mode="Markdown")

# --- FILTRO ANTI-LOOP (O que corrige o erro da print) ---
@bot.message_handler(func=lambda message: True)
def filter_loop(message):
    uid = message.from_user.id
    # Se não for registrado, ignora qualquer mensagem que não seja comando
    if not tem_acesso(uid):
        return 
    
    # Resposta padrão para mensagens aleatórias de usuários registrados
    if message.text.lower() == "oi":
        bot.reply_to(message, "Salve! Digite /menu para ver o que posso fazer.")

print("🚀 Volx Bot rodando com todos os comandos!")
bot.polling(non_stop=True)

