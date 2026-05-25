// netlify/functions/ip-logger-discord.js

/**
 * Logs the originating IP address and basic request metadata to a Discord Webhook.
 * WARNING: This code assumes the Webhook URL is set as the DISCORD_WEBHOOK_URL 
 * environment variable.
 * @param {object} event - The event object passed by Netlify Edge Functions.
 * @returns {object} A standard HTTP response.
 */
exports.handler = async (event, context) => {
    // 1. Extraction
    const clientIp = event.headers['x-forwarded-for'] || event.headers['cf-connecting-ip'] || 'UNKNOWN';
    const userAgent = event.headers['user-agent'] || 'N/A';
    const referrer = event.headers['referer'] || 'N/A';

    // 2. Prepare the structured data payload
    const logData = {
        timestamp: new Date().toISOString(),
        ip_address: clientIp,
        user_agent: userAgent,
        referrer: referrer,
        path: event.path,
        method: event.method,
    };

    // 3. Format the payload for Discord's JSON structure
    const discordPayload = {
        content: `🚨 **[ACCESS LOG]** 🚨\n*A new request was logged from the edge.*`,
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

    // 4. The Logging Action: Fetch the secret URL from the environment.
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error("FATAL: DISCORD_WEBHOOK_URL environment variable is missing. Logging failed.");
        return {
            statusCode: 500,
            body: "Internal Server Error: Logging service misconfigured."
        };
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(discordPayload)
        });
    } catch (error) {
        console.error("Failed to send data to Discord:", error.message);
    }

    // 5. Return a clean, non-suspicious response
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/plain',
            'X-Powered-By': 'Netlify'
        },
        body: 'OK'
    };
};
