var express = require('express');
var router = express.Router();
var RegistrationController = require('../Controller/Registration/RegistrationController');
var ParticipantsController = require('../Controller/Participants/ParticipantsController');
var receiptGenerator = require('../Others/Pdf/receiptGenerator');
var invoiceGenerator = require('../Others/Pdf/invoiceGenerator');
const { sendOneSignalNotification } = require('../services/notificationService');

function getCurrentDateTime() {
    // Create a Date object and adjust for Singapore Standard Time (UTC+8)
    const now = new Date();
    const singaporeOffset = 8 * 60; // SST is UTC+8, in minutes
    const localOffset = now.getTimezoneOffset(); // Local timezone offset in minutes
    const adjustedTime = new Date(now.getTime() + (singaporeOffset - localOffset) * 60000);

    // Get day, month, year, hours, minutes, and seconds
    const day = String(adjustedTime.getDate()).padStart(2, '0'); // Ensure two digits
    const month = String(adjustedTime.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = adjustedTime.getFullYear();

    const hours = String(adjustedTime.getHours()+8).padStart(2, '0'); // Ensure two digits
    const minutes = String(adjustedTime.getMinutes()).padStart(2, '0'); // Ensure two digits
    const seconds = String(adjustedTime.getSeconds()).padStart(2, '0'); // Ensure two digits

    // Format date and time
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    console.log("Now (SST):", formattedDate, formattedTime);

    return {
        date: formattedDate,
        time: formattedTime,
    };
}

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    // Get current year from getCurrentDateTime()
    const currentYear = new Date().getFullYear();
    
    // Extract year from dateOfBirth (assuming format DD/MM/YYYY)
    let birthYear;
    
    if (dateOfBirth.includes('/')) {
        // Format: DD/MM/YYYY or MM/DD/YYYY
        const parts = dateOfBirth.split('/');
        birthYear = parseInt(parts[2]); // Year is the third part
    } else if (dateOfBirth.includes('-')) {
        // Format: YYYY-MM-DD
        const parts = dateOfBirth.split('-');
        birthYear = parseInt(parts[0]); // Year is the first part
    } else {
        // Try to parse as a year directly
        birthYear = parseInt(dateOfBirth);
    }
    
    if (isNaN(birthYear) || birthYear < 1900 || birthYear > currentYear) {
        return null; // Invalid year
    }
    
    return currentYear - birthYear;
}

// Example usage in your existing code:
// const age = calculateAge(participantsParticulars.participant.dateOfBirth);
// console.log("Participant age:", age);

// Helper function to generate success messages based on AI analysis
function generateSuccessMessage(duplicateCheck) {
    if (duplicateCheck.duplicateFound && duplicateCheck.method === 'TRADITIONAL') {
        return "Registration successful - AI-enhanced participant profile updated with latest registration date";
    } else if (duplicateCheck.recommendation === 'FLAG_FOR_REVIEW') {
        return "Registration successful - AI flagged participant for review but allowed registration";
    } else if (duplicateCheck.method === 'HYBRID') {
        return "Registration successful - AI analysis completed with no blocking duplicates";
    } else {
        return "Registration successful";
    }
}


router.post('/', async function(req, res, next) 
{
    // Initialize controllers once at the top
    const participantsController = new ParticipantsController();
    const registrationController = new RegistrationController();
    
    if(req.body.purpose === "insert")
    {
        const io = req.app.get('io');
        var participantsParticulars = req.body.participantDetails;
        console.log("Participant Details:", participantsParticulars);

        // Set registration date and official info
        participantsParticulars.registrationDate = getCurrentDateTime().date;
        participantsParticulars.official = {
            name: "", // Set as needed
            date: "",
            time: "",
            receiptNo: "",
            remarks: ""
        };

        // Proceed with registration creation first
        result1 = await registrationController.newParticipant(participantsParticulars);
        
        if(!result1.success) {
            return res.json({ 
                result: {
                    success: false,
                    message: "Failed to create registration",
                    error: result1.message
                }
            });
        }
         await sendOneSignalNotification({
                        title: 'New Course Registration',
                        message: `${participantsParticulars.participant.name} has registered for ${participantsParticulars.course.courseEngName}`,
                        web_url: "https://salmon-wave-09f02b100.6.azurestaticapps.net/"
                    });
                    console.log('Registration notification sent successfully');
        if (io) {
                console.log("Emitting registration event to all connected clients");
                io.emit('registration', {
                    participant: participantsParticulars.participant,
                    course: participantsParticulars.course,
                    registrationDate: participantsParticulars.registrationDate
                });
         }

        var result2, duplicateCheck;
        // Use enhanced approach: traditional exact matching + smart name similarity
        duplicateCheck = await participantsController.checkForHybridDuplicates(participantsParticulars.participant);

        console.log("Enhanced duplicate check result:", {
            found: duplicateCheck.duplicateFound,
            type: duplicateCheck.duplicateType,
            method: duplicateCheck.method,
            recommendation: duplicateCheck.recommendation
        });

        if (duplicateCheck.duplicateFound) {
            console.log("Enhanced duplicate detection found potential match");
            
            // Handle exact traditional duplicates (highest priority)
            if (duplicateCheck.recommendation === 'UPDATE_EXISTING_PROFILE') {
                console.log("Exact duplicate found - updating existing participant profile");
                const existingParticipant = duplicateCheck.participants[0];
                
                // Merge new data with existing participant data, keeping the existing _id
                const updatedParticipantData = {
                    ...existingParticipant,
                    ...participantsParticulars.participant,
                    _id: existingParticipant._id,
                    registrationDate: participantsParticulars.registrationDate || getCurrentDateTime().date,
                    lastUpdated: getCurrentDateTime().date,
                    updateHistory: [
                        ...(existingParticipant.updateHistory || []),
                        {
                            date: getCurrentDateTime().date,
                            time: getCurrentDateTime().time,
                            action: "Enhanced profile update during registration",
                            previousData: {
                                name: existingParticipant.participantName || existingParticipant.name,
                                email: existingParticipant.email,
                                address: existingParticipant.address
                            }
                        }
                    ]
                };
                
                const updateResult = await participantsController.update(updatedParticipantData);
                
                if (updateResult.success) {
                    participantsParticulars.participant = updatedParticipantData;
                    console.log("Enhanced participant profile updated successfully, proceeding with registration");
                } else {
                    return res.json({ 
                        result: {
                            success: false,
                            message: "Failed to update existing participant profile",
                            error: updateResult.message
                        }
                    });
                }
            }
            // Handle NRIC conflicts (block registration)
            else if (duplicateCheck.recommendation === 'BLOCK_REGISTRATION_NRIC_CONFLICT') {
                return res.json({ 
                    result: {
                        success: false,
                        message: `Registration blocked: Participant already exists with this NRIC but different phone number`,
                        duplicateFound: true,
                        duplicateType: duplicateCheck.duplicateType,
                        method: 'ENHANCED_TRADITIONAL',
                        recommendation: 'Registration blocked due to NRIC conflict',
                        existingParticipants: duplicateCheck.participants || duplicateCheck.traditionalResult?.participants
                    }
                });
            }
            // Handle phone conflicts requiring manual review
            else if (duplicateCheck.recommendation === 'MANUAL_REVIEW_PHONE_CONFLICT') {
                return res.json({ 
                    result: {
                        success: false,
                        message: `Manual review required: Participant already exists with this phone number but different NRIC`,
                        duplicateFound: true,
                        duplicateType: duplicateCheck.duplicateType,
                        method: 'ENHANCED_TRADITIONAL',
                        recommendation: 'Manual review required before proceeding',
                        requiresReview: true,
                        existingParticipants: duplicateCheck.participants || duplicateCheck.traditionalResult?.participants
                    }
                });
            }
            // Handle name similarity flags
            else if (duplicateCheck.recommendation === 'FLAG_FOR_REVIEW') {
                console.log("Name similarity detected but allowing registration with flag:", duplicateCheck.message);
                // Continue with registration but log the similarity for review
            }
        }

        // Proceed with registration if no blocking duplicates found
        console.log("Enhanced analysis complete - proceeding with registration");
        if (duplicateCheck.recommendation === 'FLAG_FOR_REVIEW') {
            console.log("Name similarity flagged for review but allowing registration:", duplicateCheck.message);
        }
        
        result2 = await participantsController.addParticipant(participantsParticulars.participant);
        
        if(result2.success) {
            // Handle participant addition based on enhanced analysis results
            const shouldAddNewParticipant = !duplicateCheck.duplicateFound || 
                (duplicateCheck.recommendation === 'UPDATE_EXISTING_PROFILE');
            
            if (shouldAddNewParticipant) {
                if (duplicateCheck.duplicateFound && duplicateCheck.recommendation === 'UPDATE_EXISTING_PROFILE') {
                    console.log("Registration completed with enhanced updated participant profile");
                } else {
                    // Add new participant to participants collection
                    console.log("Adding new participant after enhanced duplicate analysis");
                
                    if (!result2.success) {
                        return res.json({ 
                            result: {
                                success: false,
                                message: "Registration created but failed to add participant to database",
                                error: result2.message,
                                enhancedAnalysis: duplicateCheck.recommendation === 'FLAG_FOR_REVIEW' ? 
                                    "Name similarity flagged for review but registration was allowed" : null
                            }
                        });
                    }
                }
            
                
                return res.json({ 
                    result: {
                        success: true,
                        message: generateSuccessMessage(duplicateCheck),
                        registrationData: result1,
                        participantUpdated: duplicateCheck.duplicateFound && duplicateCheck.method === 'TRADITIONAL',
                        registrationDate: participantsParticulars.registrationDate,
                        aiAnalysis: {
                            method: duplicateCheck.method || 'NONE',
                            confidence: duplicateCheck.confidence || 'N/A',
                            recommendation: duplicateCheck.recommendation || 'PROCEED_WITH_REGISTRATION',
                            flaggedForReview: duplicateCheck.recommendation === 'FLAG_FOR_REVIEW',
                            duplicateDetected: duplicateCheck.duplicateFound || false,
                            analysis: duplicateCheck.aiAnalysis?.report || null
                        }
                    }
                });
            }
        } else {
            return res.json({ 
                result: {
                    success: false,
                    message: "Failed to create registration",
                    error: result1.message
                }
            });
        }  
    }
    else if(req.body.purpose === "retrieve")
    {
        var {role, siteIC, name} = req.body;
        console.log("Request Body:", role, siteIC, name);
        console.log("Retrieve From Database")
        var result = await registrationController.allParticipants(role, siteIC, name);
        //console.log("Retrieve Registration Records:", result);
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "delete")
    {
        var {id} = req.body;
        var result = await registrationController.deleteParticipant(id);
        //console.log("Retrieve Registration Records:", result);
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "portOver")
    {
        var {id, selectedLocation} = req.body;
        var result = await registrationController.portOverParticipant(id, selectedLocation);
        //console.log("Retrieve Registration Records:", result);
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "update")
    {
        var id = req.body.id;
        var newStatus = req.body.status;
        var result = await registrationController.updateParticipant(id, newStatus);
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "edit")
    {
        var id = req.body.id;
        var field = req.body.field;
        var editedValue = req.body.editedValue;
        console.log("Body:", req.body)
        var result = await registrationController.updateParticipantParticulars(id, field, editedValue);
        //console.log("Update Particulars:", result) 
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "updatePaymentStatus")
    {
        console.log("Official Use", req.body);
        var id = req.body.id;  
        var name = req.body.staff;
        var status = req.body.newUpdateStatus;
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        const message = await registrationController.updateOfficialUse(id, name, date, time, status);
        return res.json({"result": message});
        //console.log("Message:", message);
        // After the PDF is sent, you can send a confirmation response if necessary
        //res.json({ message }); // Send confirmation response
    }
    else if(req.body.purpose === "updateConfirmationStatus")
    {
        console.log("Update Confirmation Status:", req.body);
        var id = req.body.id;  
        var name = req.body.staff;
        var status = req.body.newConfirmation;
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        const message = await registrationController.updateConfirmationUse(id, name, date, time, status);
        //console.log(message);
        return res.json({"result": message});
    }
    else if(req.body.purpose === "addReceiptNumber")
    {
        console.log("Receipt body:", req.body); 
                
        // Update the receipt number
        var result = await registrationController.updateReceiptNumber(req.body.id, req.body.receiptNo);
        console.log("updateReceiptNumber:", result); 

        // Logging the row data from the request
        console.log("Array:", req.body.rowData);

        // Get current date and time
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;

        console.log("Check:", req.body._id, req.body.staff, date, time, req.body.status);

        // Update the official use details
        await registrationController.updateOfficialUse(req.body._id, req.body.staff, date, time, req.body.status);

        // Return the result message
        return res.json({ "result": "Success" }); // Replace "Success" with a proper message if needed
    }
    else if(req.body.purpose === "receipt")
    {
        console.log("Body trasffered:", req.body);
        //console.log("OfficialInfo:", req.body.officialInfo);

        var receipt = new receiptGenerator();
        var array = []
        array.push({
            id: req.body.id,
            participant: req.body.participant,
            course: req.body.course,
            official: req.body.officialInfo
        });
        console.log("Array:", array);
        await receipt.generateReceipt(res, array, req.body.staff, req.body.receiptNo);
    }
    else if(req.body.purpose === "addInvoiceNumber")
    {
        console.log("Receipt body:", req.body); 
        var result = await registrationController.updateReceiptNumber(req.body.id, req.body.receiptNo);
        console.log("updateReceiptNumber:", result); 
        console.log("Array:", req.body.rowData);
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        console.log("Check:", req.body._id,  req.body.staff, date, time, req.body.status);
        await registrationController.updateOfficialUse(req.body._id, req.body.staff, date, time, req.body.status);
        return res.json({ "result": "Success" }); 
    }
    else if(req.body.purpose === "invoice")
    {
        console.log("Invoice:",req.body);
        var age = calculateAge(req.body.participant.dateOfBirth);
        console.log("Participant age:", age);

        var invoice = new invoiceGenerator();
        var array = []
        array.push({
            id: req.body.id,
            participant: req.body.participant,
            course: req.body.course
        });
        await invoice.generateInvoice(res, array, req.body.staff, req.body.receiptNo, age);
    }
    else if(req.body.purpose === "updatePaymentMethod")
    {
        console.log("updatePaymentMethod:", req.body);
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        var result = await registrationController.updatePaymentMethod(req.body.id, req.body.newUpdatePayment, req.body.staff, date, time);
        //console.log("Update Remarks:". result);
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "addRefundedDate")
    {
        //console.log("Add Refunded Date:", req.body);
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var result = await registrationController.addRefundedDate(req.body.id, date);
        return res.json({"result": result});
    }
    else if(req.body.purpose === "removedRefundedDate")
    {
        //console.log("Add Refunded Date:", req.body);
        const currentDateTime = getCurrentDateTime();
        var result = await registrationController.addRefundedDate(req.body.id, "");
        return res.json({"result": result});
    }
    else if(req.body.purpose === "sendDetails")
    {
        var result = await registrationController.sendDetails(req.body.id);
        return res.json({"result": result});
    }
    else if(req.body.purpose === "addCancelRemarks")
    {
        //console.log(req.body);
        var result = await registrationController.addCancellationRemarks(req.body.id, req.body.editedValue);
        return res.json({"result": result});
    }
    else if(req.body.purpose === "bulkUpdate")
    {
        console.log("Bulk Update Request:", req.body);
        const { updates, staff } = req.body;
        const currentDateTime = getCurrentDateTime();
        const date = currentDateTime.date;
        const time = currentDateTime.time;
        
        try {
            // Use the registration controller's bulk update method
            const result = await registrationController.bulkUpdateParticipants(updates, staff, date, time);
            
            if (result.success) {
                return res.json({
                    result: true,
                    message: result.message || `Successfully updated ${updates.length} records`,
                    successCount: result.successCount || updates.length,
                    errorCount: result.errorCount || 0,
                    errors: result.errors || []
                });
            } else {
                return res.json({
                    result: false,
                    message: result.message || "Bulk update failed",
                    successCount: result.successCount || 0,
                    errorCount: result.errorCount || updates.length,
                    errors: result.errors || []
                });
            }
        } catch (error) {
            console.error("Bulk update error:", error);
            return res.json({
                result: false,
                message: "Bulk update failed due to system error",
                error: error.message
            });
        }
    }
});

module.exports = router

