var express = require('express');
var router = express.Router();
const GoogleDriveController = require('../Controller/Google/GoogleDriveController');

router.post('/', async function(req, res, next) 
{
    try {
        const { purpose, courseType, folderId, fileId } = req.body;
        
        // Handle getFlyers purpose
        if (purpose === 'getFlyers') {
            console.log("Retrieving flyers for course type:", courseType, "folderId:", folderId);

            // If folderId is provided, use it directly for nested folder browsing
            let targetFolderId = folderId;

            // If no folderId provided, validate courseType and map to folder ID
            if (!targetFolderId) {
                if (!courseType) {
                    return res.status(400).json({
                        success: false,
                        message: "Course type is required (nsa) or folderId must be provided",
                        files: null
                    });
                }

                // Map course types to Google Drive folder IDs
                const folderIds = {
                    nsa: '1UDrCWRxg3eB2fDfO393uUWLf_RuRekcJ', // NSA folder ID
                    ilp: '1VxH93qn-pFNyXaxkcKq0Bi1Nu3tQ_IQN', // ILP folder ID
                };

                targetFolderId = folderIds[courseType.toLowerCase()];

                if (!targetFolderId) {
                    return res.status(400).json({
                        success: false,
                        message: `Course type '${courseType}' is not supported. Only 'nsa' and 'ilp' are available.`,
                        files: null
                    });
                }
            }

            const googleDriveController = new GoogleDriveController();
            const result = await googleDriveController.listFilesInFolder(targetFolderId);

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.error,
                    files: null
                });
            }

            return res.json({
                success: true,
                message: `Successfully retrieved ${result.fileCount} items`,
                courseType: courseType ? courseType.toUpperCase() : 'BROWSING',
                fileCount: result.fileCount,
                files: result.files || []
            });
        }
        
        // Handle download purpose
        else if (purpose === 'download') {
            if (!fileId) {
                return res.status(400).json({
                    success: false,
                    message: "fileId is required"
                });
            }

            console.log("Downloading file/folder:", fileId);

            const googleDriveController = new GoogleDriveController();
            
            // First, check if it's a folder or file
            const checkResult = await googleDriveController.checkFolderExists(fileId);
            
            console.log("Check result:", checkResult);
            
            let result;
            if (checkResult.exists) {
                // It's a folder, download as ZIP
                console.log("Detected as folder, creating ZIP...");
                result = await googleDriveController.downloadFolderAsZip(fileId);
            } else {
                // It's a file, download directly
                console.log("Detected as file, downloading directly...");
                result = await googleDriveController.downloadFile(fileId);
            }

            console.log("Download result:", { success: result.success, fileName: result.fileName, bufferSize: result.fileBuffer?.length });

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.error
                });
            }

            // Set response headers for file download
            res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
            res.setHeader('Content-Length', result.fileBuffer.length);

            return res.send(result.fileBuffer);
        }
        
        // Handle bulk download purpose (downloads multiple files/folders as one ZIP)
        else if (purpose === 'bulkDownload') {
            const { fileIds } = req.body;
            
            if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "fileIds array is required and cannot be empty"
                });
            }

            console.log(`Bulk downloading ${fileIds.length} items as ZIP`);

            const googleDriveController = new GoogleDriveController();
            const result = await googleDriveController.downloadMultipleFilesAsZip(fileIds);

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.error
                });
            }

            // Set response headers for file download
            res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
            res.setHeader('Content-Length', result.fileBuffer.length);

            return res.send(result.fileBuffer);
        }
        
        else {
            return res.status(400).json({
                success: false,
                message: "Invalid purpose. Expected 'getFlyers' or 'download'",
                files: null
            });
        }
    } catch (error) {
        console.error("Courses endpoint error:", error);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            files: null
        });
    }
});

module.exports = router;
