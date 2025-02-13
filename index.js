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

// IDs dos cargos e canais
const CHANNEL_WL_RESULTS = "1338158706810159134";
const ROLE_MEMBER = "1336379079494205521";
const ROLE_INITIAL = "1336514204575862825"; // Cargo que deve ser removido

client.once("ready", async () => {
    await sequelize.sync();
    console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isModalSubmit() && interaction.customId === "wl_form") {
        const nome = interaction.fields.getTextInputValue("nome");
        const id = interaction.fields.getTextInputValue("id");
        const recrutadorNome = interaction.fields.getTextInputValue("recrutadorNome");
        const recrutadorId = interaction.fields.getTextInputValue("recrutadorId");
        const user = interaction.user;

        await Whitelist.upsert({
            userId: user.id,
            nome,
            id,
            recrutadorNome,
            recrutadorId,
        });

        const guild = interaction.guild;
        const member = await guild.members.fetch(user.id);

        // Atribuir o cargo de Membro
        const role = guild.roles.cache.get(ROLE_MEMBER);
        if (role) {
            await member.roles.add(role).catch((err) => console.error(`Erro ao adicionar cargo: ${err}`));
        } else {
            console.error(`Cargo '${ROLE_MEMBER}' não encontrado!`);
        }

        // Remover o cargo inicial se o usuário o possuir
        const initialRole = guild.roles.cache.get(ROLE_INITIAL);
        if (initialRole && member.roles.cache.has(ROLE_INITIAL)) {
            await member.roles.remove(initialRole).then(() => {
                console.log(`✅ Cargo inicial removido de ${member.user.tag}`);
            }).catch((err) => console.error(`❌ Erro ao remover cargo inicial:`, err));
        }

        // Alterar o nome do usuário
        await member.setNickname(`${nome} | ${id}`).catch(console.error);

        // Enviar resultado
        const resultsChannel = guild.channels.cache.get(CHANNEL_WL_RESULTS);
        if (resultsChannel) {
            await resultsChannel.send(
                `✅ ${user} foi aprovado na WL! Nome: **${nome}** | ID: **${id}** | Recrutador: **${recrutadorNome}** (ID: ${recrutadorId})`,
            );
        }

        await interaction.reply({
            content: "✅ Whitelist enviada com sucesso! Cargo de Membro adicionado e cargo inicial removido.",
            ephemeral: true,
        });
    }
});

// Verifica se membros com ROLE_MEMBER ainda possuem ROLE_INITIAL e remove
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
        if (newMember.roles.cache.has(ROLE_MEMBER) && newMember.roles.cache.has(ROLE_INITIAL)) {
            const roleToRemove = newMember.guild.roles.cache.get(ROLE_INITIAL);
            if (roleToRemove) {
                await newMember.roles.remove(roleToRemove);
                console.log(`✅ Cargo inicial removido de ${newMember.user.tag}`);
            }
        }
    } catch (error) {
        console.error("❌ Erro ao remover cargo inicial em atualização:", error);
    }
});

// Logar o bot
client.login(process.env.TOKEN);
