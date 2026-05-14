/**
 * Zoom API helper utility for Server-to-Server OAuth
 * Required for automated meeting generation
 */

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

/**
 * Gets a fresh Zoom Access Token using Server-to-Server OAuth
 */
export async function getZoomAccessToken(): Promise<string> {
    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
        throw new Error("Missing Zoom API credentials in .env");
    }

    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get Zoom token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Creates a Zoom meeting and returns the join_url
 */
export async function createZoomMeeting(topic: string, startTime: string) {
    try {
        const token = await getZoomAccessToken();
        
        // Default duration: 45 minutes
        const duration = 45;

        const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic,
                type: 2, // Scheduled meeting
                start_time: startTime, // ISO format: yyyy-MM-ddTHH:mm:ssZ
                duration,
                timezone: 'Asia/Kolkata',
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: true,
                    jbh_time: 0,
                    waiting_room: false,
                    mute_upon_entry: false,
                    watermark: false,
                    use_pmi: false,
                    approval_type: 2,
                    audio: 'both',
                    auto_recording: 'cloud',
                    screen_share_host_only: false, // ALLOW SHARING FOR ALL
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Zoom API creation error: ${error}`);
        }

        const data = await response.json();
        return {
            join_url: data.join_url,
            id: data.id,
            password: data.password
        };
    } catch (error: any) {
        console.error("Zoom Creation Failed:", error.message);
        return null;
    }
}

/**
 * Gets a Zoom Access Key (ZAK) token for the primary host user.
 */
export async function getZoomZakToken() {
    try {
        const token = await getZoomAccessToken();
        const response = await fetch('https://api.zoom.us/v2/users/me/token?type=zak', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (data.code || data.message) return `Error: ${data.message || 'Unknown Zoom Error'}`;
        return data.token;
    } catch (error: any) {
        return `Error: ${error.message}`;
    }
}

/**
 * Gets the Zoom Host Key (PIN) for the account.
 */
export async function getZoomHostKey() {
    try {
        const token = await getZoomAccessToken();
        const response = await fetch('https://api.zoom.us/v2/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (data.code || data.message) return `Error: ${data.message || 'Unknown Zoom Error'}`;
        return data.host_key;
    } catch (error: any) {
        return `Error: ${error.message}`;
    }
}

/**
 * Deletes a Zoom meeting by ID
 */
export async function deleteZoomMeeting(meetingId: string): Promise<boolean> {
    try {
        const token = await getZoomAccessToken();
        const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        return response.ok;
    } catch (error) {
        console.error("Delete Zoom Meeting Error:", error);
        return false;
    }
}
