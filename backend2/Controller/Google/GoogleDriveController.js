const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

class GoogleDriveController {
    async initializeAuth() {
        let credentials = null;

        // Priority 1: Check for new GOOGLE_SERVICE_ACCOUNT_NORSE environment variable
        if (process.env.GOOGLE_SERVICE_ACCOUNT_NORSE) {
            try {
                credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_NORSE);
            } catch (error) {
                console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_NORSE:', error.message);
            }
        }

        // Priority 2: Check for legacy GOOGLE_DRIVE_CREDENTIALS environment variable
        if (!credentials && process.env.GOOGLE_DRIVE_CREDENTIALS) {
            try {
                credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
            } catch {
                credentials = JSON.parse(Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS, 'base64').toString('utf8'));
            }
        }

        // Priority 3: Try local credentials file
        if (!credentials) {
            let keyFile = path.join(__dirname, '../../config/norse-study-479913-b7-00b6903f8f4f.json');
            if (fs.existsSync(keyFile)) {
                credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
            }
        }

        if (!credentials) {
            throw new Error("Google Drive credentials not found. Set GOOGLE_SERVICE_ACCOUNT_NORSE environment variable or place credentials file at backend2/config/norse-study-479913-b7-00b6903f8f4f.json");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        return google.drive({ version: 'v3', auth });
    }

    async checkFolderExists(folderId) {
        try {
            const drive = await this.initializeAuth();
            const folder = await drive.files.get({
                fileId: folderId,
                fields: 'name, mimeType, trashed, driveId',
                supportsAllDrives: true  // Support Shared Drives
            });

            const data = folder.data;

            if (data.mimeType !== 'application/vnd.google-apps.folder') {
                return { exists: false, error: "File ID is not a folder" };
            }

            if (data.trashed) {
                return { exists: false, error: "Folder is in trash" };
            }

            return { exists: true, folderName: data.name, isSharedDrive: !!data.driveId };
        } catch (error) {
            console.error('Error checking folder:', error.message);
            return { exists: false, error: error.message };
        }
    }

    async uploadPdfToGoogleDrive(fileBuffer, fileName, folderId, mimeType = 'application/pdf') {
        try {
            const drive = await this.initializeAuth();

            // Convert Buffer to readable stream
            const stream = Readable.from(fileBuffer);

            const response = await drive.files.create({
                resource: {
                    name: fileName,
                    parents: [folderId]
                },
                media: {
                    mimeType: mimeType,
                    body: stream
                },
                fields: 'id, name, webViewLink, createdTime',
                supportsAllDrives: true  // Support Shared Drives
            });

            return {
                success: true,
                fileId: response.data.id,
                fileName: response.data.name,
                fileLink: response.data.webViewLink,
                uploadedAt: response.data.createdTime
            };
        } catch (error) {
            console.error('Error uploading file to Google Drive:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

}

module.exports = GoogleDriveController;
