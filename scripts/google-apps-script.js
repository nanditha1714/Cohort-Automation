/**
 * GOOGLE APPS SCRIPT: Direct Supabase Integration (Storage + Database)
 * 
 * INSTRUCTIONS:
 * 1. Open your existing Google Form.
 * 2. Click the three dots (More) in the top right -> "Script editor".
 * 3. Delete any default code and paste this entire script.
 * 4. Configure the 4 variables below with your Supabase credentials.
 * 5. Create a Storage Bucket in your Supabase Dashboard named exactly what you put in `SUPABASE_BUCKET_NAME`.
 *    Make sure the bucket is set to "Public".
 * 6. Click the "Save" icon.
 * 7. Click the "Triggers" clock icon on the left menu -> "Add Trigger" (bottom right).
 * 8. Set up the trigger:
 *    - Function to run: `onFormSubmit`
 *    - Event source: `From form`
 *    - Event type: `On form submit`
 * 9. Click "Save" and authorize the script permissions.
 */

// ==============================================
// CONFIGURATION - FILL THESE IN!
// ==============================================
var SUPABASE_URL = "https://knnwanyinjigkzospcna.supabase.co"; // e.g. https://xyz.supabase.co
var SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
// IMPORTANT: Use the ANON_KEY if RLS is enabled and allows anon inserts,
// Or use the SERVICE_ROLE_KEY if you want the script to bypass all RLS policies.
var SUPABASE_BUCKET_NAME = "form-uploads"; // The name of your public Storage bucket
var NEXTJS_APP_URL = "https://your-deployed-nextjs-app.com"; // Provide your Vercel URL to auto-trigger AI

// ==============================================

function onFormSubmit(e) {
    try {
        var itemResponses = e.response.getItemResponses();
        var formPayload = {};
        var uploadedSupabaseFileUrl = null;
        var companyName = "Unknown Startup";

        // 1. Loop through all 35 form answers
        for (var i = 0; i < itemResponses.length; i++) {
            var itemResponse = itemResponses[i];
            var questionText = itemResponse.getItem().getTitle();
            var answer = itemResponse.getResponse();

            // 2. Extract Document/File Uploads
            if (itemResponse.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) {
                var fileIds = answer;
                if (fileIds && fileIds.length > 0) {
                    var driveFileId = fileIds[0];

                    // Upload the Google Drive file directly into Supabase Storage
                    uploadedSupabaseFileUrl = uploadFileToSupabaseStorage(driveFileId);
                }
            } else {
                // Standard form answers
                formPayload[questionText] = answer;

                // Try to guess which question is the startup name
                var qLow = questionText.toLowerCase().trim();
                if (qLow.indexOf('start up name') !== -1 || qLow.indexOf('startup name') !== -1 || qLow.indexOf('company name') !== -1) {
                    companyName = String(answer);
                }
            }
        }

        // 3. Prepare the Database row Payload
        var dbRow = {
            company_name: companyName,
            form_data: formPayload,
            file_url: uploadedSupabaseFileUrl
        };

        // 4. Send the 35 fields into the 'form_submissions' table
        insertIntoSupabaseDatabase(dbRow);

        // 5. Automatically trigger the AI to analyze this new entry!
        triggerAiAnalysis();

    } catch (error) {
        Logger.log('Critical Error in onFormSubmit: ' + error.message);
    }
}

/**
 * Grabs the file out of your Google Drive and `POST`s it directly 
 * to your Supabase Storage Bucket.
 */
function uploadFileToSupabaseStorage(driveFileId) {
    try {
        // Requires DriveApp authorization when saving the trigger
        var file = DriveApp.getFileById(driveFileId);
        var blob = file.getBlob();
        var filename = Date.now() + "_" + file.getName().replace(/\s+/g, '_');

        // Supabase Storage REST URL: /storage/v1/object/bucketName/filename
        var storageUrl = SUPABASE_URL + "/storage/v1/object/" + SUPABASE_BUCKET_NAME + "/" + filename;

        var options = {
            method: "post",
            contentType: blob.getContentType(),
            payload: blob.getBytes(),
            headers: {
                "Authorization": "Bearer " + SUPABASE_ANON_KEY,
                "apikey": SUPABASE_ANON_KEY,
            },
            muteHttpExceptions: true
        };

        var response = UrlFetchApp.fetch(storageUrl, options);

        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
            Logger.log("File uploaded successfully to Supabase Storage");
            // Return the correct Public URL of the uploaded file
            return SUPABASE_URL + "/storage/v1/object/public/" + SUPABASE_BUCKET_NAME + "/" + filename;
        } else {
            Logger.log("Failed to upload file. Response: " + response.getContentText());
            return null;
        }
    } catch (err) {
        Logger.log("Error uploading file to Storage: " + err.message);
        return null;
    }
}

/**
 * `POST`s the 35 form questions directly to your Supabase PostgREST API
 */
function insertIntoSupabaseDatabase(rowData) {
    try {
        // Supabase PostgREST Table URL: /rest/v1/tableName
        var dbUrl = SUPABASE_URL + "/rest/v1/form_submissions";

        var options = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(rowData),
            headers: {
                "Authorization": "Bearer " + SUPABASE_ANON_KEY,
                "apikey": SUPABASE_ANON_KEY,
                "Prefer": "return=minimal" // Don't demand the inserted row back
            },
            muteHttpExceptions: true
        };

        var response = UrlFetchApp.fetch(dbUrl, options);

        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
            Logger.log("Form data successfully inserted into Database");
        } else {
            Logger.log("Database insert failed. Response: " + response.getContentText());
        }
    } catch (err) {
        Logger.log("Error inserting into Database: " + err.message);
    }
}

/**
 * Pings your Next.js application to immediately start analyzing the newest database row.
 */
function triggerAiAnalysis() {
    try {
        var url = NEXTJS_APP_URL + "/api/cron/process-queue";
        var options = {
            method: "get",
            muteHttpExceptions: true
        };
        UrlFetchApp.fetch(url, options);
        Logger.log("Successfully triggered AI Analysis queue.");
    } catch (err) {
        Logger.log("Error triggering AI Analysis: " + err.message);
    }
}
