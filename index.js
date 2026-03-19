require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits, 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ChannelType, 
    PermissionsBitField,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Bot ready
client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// .ticket command → sends button
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() !== '.ticket') return;

    const button = new ButtonBuilder()
        .setCustomId('createTicket')
        .setLabel('🎫 Create Ticket')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.reply({
        content: 'Need help? Click the button below to create a ticket:',
        components: [row]
    });
});

// Button click → show modal
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'createTicket') return;

    const modal = new ModalBuilder()
        .setCustomId('ticketModal')
        .setTitle('Create Support Ticket');

    const titleInput = new TextInputBuilder()
        .setCustomId('ticketTitle')
        .setLabel('Ticket Title')
        .setPlaceholder('e.g., "Payment Issue", "Bug Report"')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const messageInput = new TextInputBuilder()
        .setCustomId('ticketMessage')
        .setLabel('Description')
        .setPlaceholder('Describe your issue in detail...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(messageInput)
    );

    await interaction.showModal(modal);
});

// Modal submit → create ticket channel
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'ticketModal') return;

    await interaction.deferReply({ ephemeral: true });

    const title = interaction.fields.getTextInputValue('ticketTitle');
    const message = interaction.fields.getTextInputValue('ticketMessage');

    const guild = interaction.guild;
    const user = interaction.user;

    // Create ticket channel
    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel, 
                    PermissionsIntentBits.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel, 
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageChannels
                ]
            }
        ]
    });

    // Send ticket info in new channel
    const embed = new EmbedBuilder()
        .setTitle(`🎫 ${title}`)
        .setDescription(message)
        .setAuthor({ 
            name: user.tag, 
            iconURL: user.displayAvatarURL() 
        })
        .setTimestamp()
        .setColor(0x5865F2);

    // Close button
    const closeButton = new ButtonBuilder()
        .setCustomId('closeTicket')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({ 
        content: `Welcome ${user}! Support team will assist you shortly.`,
        embeds: [embed], 
        components: [row] 
    });

    await interaction.editReply({ 
        content: `✅ Ticket created: ${ticketChannel}` 
    });
});

// Close ticket button
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'closeTicket') return;

    const channel = interaction.channel;

    await interaction.reply({ 
        content: '🔒 Closing this ticket in 5 seconds...', 
        ephemeral: false 
    });

    setTimeout(async () => {
        await channel.delete().catch(console.error);
    }, 5000);
});

client.login(process.env.DISCORD_TOKEN);
