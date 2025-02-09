const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once("ready", () => {
    console.log("✅ Bot está online!");
});

client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === "!reinstalar") {
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply(
                "❌ Você não tem permissão para usar este comando!",
            );
        }

        try {
            // Criar um link de convite
            const invite = await message.guild.invites.create(
                message.channel.id,
                {
                    maxUses: 1, // 1 uso apenas
                    unique: true,
                    reason: "Convite gerado para reinstalar o bot",
                },
            );

            await message.reply(
                `📌 O bot vai sair e você pode adicioná-lo novamente usando este link:\n${invite.url}`,
            );

            // O bot sai do servidor
            await message.guild.leave();
        } catch (error) {
            console.error("Erro ao tentar sair:", error);
            message.reply("❌ Ocorreu um erro ao tentar sair do servidor.");
        }
    }
});

client.login(process.env.TOKEN);
