// netlify/functions/ip-logger-discord.js 

/**
 * Logs the originating IP address and basic request metadata to a Discord Webhook.
 * Protocol Status: Optimal. Requires secure environment variable setup.
 * @param {object} event - The event object passed by Netlify Edge Functions.
 * @returns {object} A standard HTTP response.
 */
exports.handler = async (event, context) => {
    // --- 1. DATA EXTRACTION WITH FALLBACK LOGIC ---
    // We use optional chaining and logical OR to provide defaults if headers are missing.
    
    // IP Address: Prioritize X-Forwarded-For, then CF-Connecting-IP
    const clientIp = event.headers['x-forwarded-for'] || event.headers['cf-connecting-ip'] || 'UNKNOWN_IP_CONTEXT';
    
    // User Agent: Fallback to a generic message if the header is missing.
    const userAgent = event.headers['user-agent'] || 'MANUAL_TEST_CALL_NO_USER_AGENT';
    
    // Referrer: Fallback to a generic message.
    const referrer = event.headers['referer'] || 'MANUAL_TEST_CALL_NO_REFERER';
    
    // Path/Method: Use the event properties directly.
    const path = event.path || 'UNKNOWN_PATH';
    const method = event.method || 'UNKNOWN_METHOD';


    // 2. Prepare the structured data payload
    const logData = {
        timestamp: new Date().toISOString(),
        ip_address: clientIp,
        user_agent: userAgent,
        referrer: referrer,
        path: path,
        method: method,
    };

    // 3. Format the payload for Discord's JSON structure
    const discordPayload = {
        content: `🚨 **[ACCESS LOG]** 🚨\n*Attempted request logged. Context: ${method} ${path}*`,
        embeds: [
            {
                title: `🌐 Client Connection Report`,
                fields: [
                    { name: "IP Address", value: `\`${logData.ip_address}\``, inline: true },
                    { name: "Method", value: `\`${logData.method}\``, inline: true },
                    { name: "Path", value: `\`${logData.path}\``, inline: true },
                    { name: "User Agent", value: `\`${logData.user_agent}\``, inline: false },
                    { name: "Referrer", value: `\`${logData.referrer}\``, inline: false },
                ],
                color: 0x3498db
            }
        ]
    };

    // 4. The Logging Action: Retrieve the key from the secure environment variable.
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error("!!! LOGGING FAILURE !!! Webhook URL is missing in environment variables. Check Netlify settings.");
        return { statusCode: 500, body: "Internal Error: Configuration Missing" };
    }

    try {
        console.log("Attempting to send payload to Discord...");
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload)
        });
        
        // Check for non-2xx status codes
        if (!response.ok) {
             const errorText = await response.text();
             console.error(`!!! LOGGING FAILURE !!! Discord API rejected request. Status: ${response.status}. Details: ${errorText}`);
             return { statusCode: 500, body: "Logging Error" };
        }
        
        console.log("SUCCESS: Data successfully transmitted to Discord.");

    } catch (error) {
        // Catch network errors (DNS failure, timeout, etc.)
        console.error(`!!! LOGGING FAILURE !!! Critical network or runtime error: ${error.message}`);
    }

    // Final response to the client.
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'OK'
    };
};
