import express from "express";
import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField,
} from "discord.js";
import { Sequelize, DataTypes } from "sequelize";
import axios from "axios";
import dotenv from "dotenv";
import moment from "moment-timezone"; // Biblioteca para formatar data/hora

dotenv.config();

// Criar servidor Express para evitar erro de "Port Scan Timeout" na Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot está rodando!");
});

app.listen(PORT, () => {
    console.log(`🌍 Servidor HTTP rodando na porta ${PORT}`);
});

// Criar cliente do bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ],
});

// Conectar ao banco de dados SQLite
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "whitelist.db",
});

const Whitelist = sequelize.define("Whitelist", {
    userId: { type: DataTypes.STRING, unique: true, primaryKey: true },
    nome: DataTypes.STRING,
    id: DataTypes.STRING,
    recrutadorNome: DataTypes.STRING,
    recrutadorId: DataTypes.STRING,
});

// Mapeamento de cargos e iniciais
const rolePrefixes = {
    "1281863970676019253": "[REC]",
    "1336412910582366349": "🎯[Resp.Elite]",
    "1336379564766527582": "🏅[G.G]",
    "1336410539663949935": "🎯[ELITE]",
    "1336379726675050537": "🥇[Sub]",
};

client.once("ready", async () => {
    await sequelize.sync();
    console.log(`✅ Bot online como ${client.user.tag}`);

    // Enviar o botão de Whitelist automaticamente no canal correto
    const channel = await client.channels.fetch("1338158040767139923").catch(console.error);
    if (channel) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("start_wl")
                .setLabel("📋 Iniciar Whitelist")
                .setStyle(ButtonStyle.Primary),
        );
        await channel.send({
            content: "**Clique no botão abaixo para iniciar a Whitelist!**",
            components: [row],
        });
    }
});

// Evento para detectar mudanças de cargo e atualizar o apelido
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        const userId = newMember.id;
        const whitelistEntry = await Whitelist.findOne({ where: { userId } });

        if (!whitelistEntry) return; // Se o usuário não estiver na WL, não faz nada

        let highestRole = null;
        let highestPrefix = "";

        // Verifica qual é o cargo mais alto do usuário com base na lista de iniciais
        newMember.roles.cache.forEach((role) => {
            if (rolePrefixes[role.id]) {
                highestRole = role;
                highestPrefix = rolePrefixes[role.id];
            }
        });

        // Atualiza o apelido com a inicial do cargo
        const newNickname = highestRole
            ? `${highestPrefix} ${whitelistEntry.nome} | ${whitelistEntry.id}`
            : `${whitelistEntry.nome} | ${whitelistEntry.id}`;

        await newMember.setNickname(newNickname).catch(console.error);
        console.log(`🔄 Apelido atualizado para: ${newNickname}`);
    } catch (error) {
        console.error("❌ Erro ao atualizar apelido:", error);
    }
});

// Logar o bot
client.login(process.env.TOKEN);
