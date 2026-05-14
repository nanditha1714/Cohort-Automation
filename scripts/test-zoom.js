const Buffer = require('buffer').Buffer;
const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

async function testZoom() {
    console.log("--- Zoom Credential Diagnostic Tool ---");
    console.log("Checking environment variables...");
    
    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
        console.error("❌ ERROR: Missing credentials in .env file.");
        console.log("Expecting: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET");
        return;
    }

    console.log("ZOOM_ACCOUNT_ID:", ZOOM_ACCOUNT_ID.substring(0, 5) + "...");
    console.log("ZOOM_CLIENT_ID:", ZOOM_CLIENT_ID.substring(0, 5) + "...");
    
    try {
        console.log("\n1. Testing OAuth Token Generation...");
        const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
        
        const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const tokenData = await tokenRes.json();
        
        if (!tokenRes.ok) {
            console.error("❌ Token Failed:", tokenData);
            return;
        }

        console.log("✅ Token generated successfully.");
        const token = tokenData.access_token;

        console.log("\n2. Testing Meeting Creation Scopes...");
        const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: "Diagnostic Test Meeting",
                type: 2,
                start_time: new Date().toISOString(),
                duration: 30,
            }),
        });

        const meetingData = await meetingRes.json();
        
        if (!meetingRes.ok) {
            console.error("❌ Meeting Creation Failed:", meetingData);
            if (meetingData.code === 4700) {
                console.log("\n💡 SUGGESTION: This error usually means your Zoom App lacks the 'meeting:write:admin' scope.");
            } else if (meetingData.code === 1001) {
                console.log("\n💡 SUGGESTION: The 'me' user might not be available for this account type. Try checking your Zoom User context.");
            }
            return;
        }

        console.log("✅ Meeting created successfully!");
        console.log("Join URL:", meetingData.join_url);
        
    } catch (error) {
        console.error("❌ System Error:", error.message);
    }
}

testZoom();
