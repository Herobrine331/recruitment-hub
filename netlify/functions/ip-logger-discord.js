// netlify/functions/ip-logger-discord.js 

/**
 * Logs the originating IP address and basic request metadata to a Discord Webhook.
 * 
 * PROTOCOL STATUS: Optimal. This function requires the DISCORD_WEBHOOK_URL 
 * environment variable to be set in the Netlify Site Settings.
 * 
 * @param {object} event - The event object passed by Netlify Edge Functions.
 * @returns {object} A standard HTTP response.
 */
exports.handler = async (event, context) => {
    // --- 1. DATA EXTRACTION AND FALLBACK LOGIC ---
    // We use optional chaining and logical OR to provide default context 
    // if the headers are missing (critical for manual testing/sparse input).
    
    // IP Address: Prioritize X-Forwarded-For, then CF-Connecting-IP.
    const clientIp = event.headers['x-forwarded-for'] || event.headers['cf-connecting-ip'] || 'UNKNOWN_IP_CONTEXT';
    
    // User Agent: Fallback for manual/sparse calls.
    const userAgent = event.headers['user-agent'] || 'MANUAL_TEST_CALL_NO_USER_AGENT';
    
    // Referrer: Fallback for manual/sparse calls.
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
        content: `🚨 **[ACCESS LOG]** 🚨\n*Request detected from ${logData.ip_address} at ${logData.timestamp}*`,
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
        console.error("!!! LOGGING FAILURE !!! Webhook URL is missing. Check Netlify environment variables.");
        return { statusCode: 500, body: "Internal Error: Configuration Missing" };
    }

    try {
        console.log("Attempting to send payload to Discord...");
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload)
        });
        
        // Check for non-2xx status codes (API rejection, rate limiting, etc.)
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

    // Always return a clean, successful response to the client, regardless of logging outcome.
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'OK'
    };
};
