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
import dotenv from "dotenv";

dotenv.config();

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

client.once("ready", async () => {
    await sequelize.sync();
    console.log(`Bot online como ${client.user.tag}`);

    // Enviar o botão de Whitelist automaticamente no canal correto
    const channel = await client.channels.fetch("1338158040767139923");
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

    // Iniciar o loop de Keep-Alive
    keep_alive_loop();
});

// IDs dos canais e cargo
const CHANNEL_WL_BUTTON = "1338158040767139923";
const CHANNEL_WL_REQUESTS = "1338158041958191175";
const CHANNEL_WL_RESULTS = "1338158706810159134";
const CHANNEL_KEEP_ALIVE = "1338192023244509195"; // Canal para Keep-Alive
const ROLE_MEMBER = "1336379079494205521";

// Keep-Alive: Envia uma mensagem a cada 2 minutos no canal especificado
async function keep_alive_loop() {
    setInterval(async () => {
        const channel = await client.channels.fetch(CHANNEL_KEEP_ALIVE);
        if (channel) {
            await channel
                .send("✅ Bot ativo! (Keep-Alive)")
                .catch(console.error);
        }
    }, 120000); // A cada 2 minutos (120000 ms)
}

client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton() && interaction.customId === "start_wl") {
        const modal = new ModalBuilder()
            .setCustomId("wl_form")
            .setTitle("Whitelist")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("nome")
                        .setLabel("Digite seu nome")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("id")
                        .setLabel("Digite seu ID")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("recrutadorNome")
                        .setLabel("Nome do Recrutador")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("recrutadorId")
                        .setLabel("ID do Recrutador")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                ),
            );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "wl_form") {
        const nome = interaction.fields.getTextInputValue("nome");
        const id = interaction.fields.getTextInputValue("id");
        const recrutadorNome =
            interaction.fields.getTextInputValue("recrutadorNome");
        const recrutadorId =
            interaction.fields.getTextInputValue("recrutadorId");
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
            await member.roles
                .add(role)
                .catch((err) =>
                    console.error(`Erro ao adicionar cargo: ${err}`),
                );
        } else {
            console.error(`Cargo '${ROLE_MEMBER}' não encontrado!`);
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
            content:
                "✅ Whitelist enviada com sucesso! Cargo de Membro adicionado.",
            ephemeral: true,
        });
    }
});

client.login(process.env.TOKEN);
