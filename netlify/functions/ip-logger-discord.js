// netlify/functions/ip-logger-discord.js (V3 - The Nuclear Option)

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

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        // This is a hard, explicit failure log.
        console.error("!!! LOGGING FAILURE !!! Webhook URL is missing in environment variables.");
        return { statusCode: 500, body: "Internal Error: Config Missing" };
    }

    try {
        console.log("Attempting to send payload to Discord...");
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(discordPayload)
        });
        
        // Check for HTTP status codes that are NOT 200/204
        if (!response.ok) {
             // If the API returns an error (e.g., 400 Bad Request, 429 Rate Limit)
             const errorText = await response.text();
             console.error(`!!! LOGGING FAILURE !!! Discord API rejected request. Status: ${response.status}. Details: ${errorText}`);
             // Return a failure state to the client, but keep it clean.
             return { statusCode: 500, body: "Logging Error" };
        }
        
        console.log("SUCCESS: Data sent to Discord.");

    } catch (error) {
        // This catches network failures (DNS, timeout, etc.)
        console.error(`!!! LOGGING FAILURE !!! Critical network or runtime error: ${error.message}`);
    }

    // Always return the clean success response to the client.
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'OK'
    };
};
