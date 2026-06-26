var express = require('express');
var router = express.Router();
var RegistrationController = require('../Controller/Registration/RegistrationController');
var ParticipantsController = require('../Controller/Participants/ParticipantsController');
var InvoiceController = require('../Controller/Invoice/InvoiceController');
var receiptGenerator = require('../Others/Pdf/receiptGenerator');
var invoiceGenerator = require('../Others/Pdf/invoiceGenerator');
const { sendOneSignalNotification } = require('../services/notificationService');

// Reuse controller instances across requests so Mongo clients can stay warm.
const participantsController = new ParticipantsController();
const registrationController = new RegistrationController();
const invoiceController = new InvoiceController();

// ── In-memory cache for registration data ─────────────────────────────────────
// Survives browser refreshes (server-side). TTL = 15 seconds.
// // 90 s TTL keeps the in-memory cache warm across typical page navigations while
// // still reflecting any direct DB edits within a reasonable window.
// const CACHE_TTL_MS = 90 * 1000;
// const _regCache = new Map(); // key → { data: [], total: N, ts: Date.now() }

// function _cacheKey(role, siteIC) {
//     return `${role || 'all'}::${JSON.stringify(siteIC ?? null)}`;
// }
// function _getCached(role, siteIC) {
//     const entry = _regCache.get(_cacheKey(role, siteIC));
//     if (!entry) return null;
//     if (Date.now() - entry.ts > CACHE_TTL_MS) { _regCache.delete(_cacheKey(role, siteIC)); return null; }
//     return entry;
// }
// function _setCache(role, siteIC, data) {
//     _regCache.set(_cacheKey(role, siteIC), { data, total: data.length, ts: Date.now() });
// }
// function _invalidateCache() { _regCache.clear(); }
// ──────────────────────────────────────────────────────────────────────────────

function getCurrentDateTime() {
    // Format the current instant in Singapore Standard Time (UTC+8) using the IANA
    // "Asia/Singapore" zone. This is correct regardless of the server's own timezone
    // (the previous manual offset math double-counted the offset and rolled the date
    // forward by a day on machines already running in SGT).
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Singapore',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(now);

    const lookup = (type) => parts.find((p) => p.type === type)?.value || '';
    let hours = lookup('hour');
    if (hours === '24') hours = '00'; // Some environments emit 24 for midnight

    const formattedDate = `${lookup('day')}/${lookup('month')}/${lookup('year')}`;
    const formattedTime = `${hours}:${lookup('minute')}:${lookup('second')}`;

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

function parseConfirmationBoolean(value) {
    if (value === true || value === false) return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'confirmed' || normalized === 'yes' || normalized === 'true' || normalized === '1') return true;
    if (normalized === 'not confirmed' || normalized === 'no' || normalized === 'false' || normalized === '0') return false;
    return false;
}

function sanitizeStaffName(value) {
    return String(value ?? '').replace(/\s*\(Approved\)\s*$/i, '').trim();
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
    const io = req.app.get('io');

    // Invalidate the registration cache for any write operation
    const READ_PURPOSES = new Set(['retrieve', 'retrievePaged', 'retrieveById', 'receipt', 'invoice']);
    if (!READ_PURPOSES.has(req.body.purpose)) {
        // _invalidateCache();
    }

    if(req.body.purpose === "insert")
    {
        var participantsParticulars = req.body.participantDetails;
        console.log("Participant Details:", participantsParticulars);

        // Set registration date and official info
        participantsParticulars.registrationDate = getCurrentDateTime().date;
        participantsParticulars.official = {
            name: "", // Set as needed
            date: "",
            time: "",
            receiptNo: "",
            remarks: "",
            registration_status: "Submitted"
        };

        // Ensure the new record includes course.finalPaymentMethod
        participantsParticulars.course = {
            ...(participantsParticulars.course || {}),
            finalPaymentMethod: participantsParticulars.course?.finalPaymentMethod || participantsParticulars.course?.payment || '',
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
    else if(req.body.purpose === "retrievePaged")
    {
        var { role, siteIC, skip = 0, limit } = req.body;
        skip  = parseInt(skip)  || 0;
        limit = (limit != null && limit !== '') ? parseInt(limit) : null;

        // let cached = _getCached(role, siteIC);
        // if (!cached) {
        const all = await registrationController.allParticipants(role, siteIC);
        const allArr = Array.isArray(all) ? all : [];
        //     _setCache(role, siteIC, allArr);
        //     cached = { data: allArr, total: allArr.length };
        // }

        const slice = limit != null ? allArr.slice(skip, skip + limit) : allArr.slice(skip);
        const total = skip === 0 ? allArr.length : null; // only send total on first page
        return res.json({ result: slice, total });
    }
    else if(req.body.purpose === "retrieve")
    {
        var {role, siteIC, name} = req.body;
        console.log("Request Body:", role, siteIC, name);
        console.log("Retrieve From Database")
        var result = await registrationController.allParticipants(role, siteIC);
        //console.log("Retrieve Registration Records:", result);
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "retrieveById")
    {
        var { id } = req.body;
        if (!id) return res.status(400).json({ result: null, message: 'Missing id' });
        var result = await registrationController.getParticipantById(id);
        return res.json({ result });
    }
    else if(req.body.purpose === "delete")
    {
        var {id} = req.body;
        var result = await registrationController.deleteParticipant(id);
        //console.log("Retrieve Registration Records:", result);

        // Notify all connected clients so the frontend table stays in sync and the
        // deleted row is removed immediately.
        if (io && result) {
            console.log("Emitting registration-delete event to all connected clients for id:", id);
            io.emit('registration', {
                type: 'registration-delete',
                id,
            });
        }

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
        console.log("Edit Body:", req.body);
        var id = req.body.id;
        var field = req.body.field;
        var editedValue = req.body.editedValue;
        var rowCourseType = req.body.rowCourseType; // New parameter to determine course type
        console.log("Body:", req.body)
        console.log("Attempting to update field:", field, "with value:", editedValue, "for id:", id);
        var result = await registrationController.updateParticipantParticulars(id, field, editedValue, rowCourseType);
        console.log("updateParticipantParticulars result:", result);
        if (io) {
            io.emit('registration', {
                type: 'registration-edit',
                id,
                field,
                value: editedValue,
            });
        }
        //console.log("Update Particulars:", result) 
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "editRemarks")
    {
        console.log("Edit Remarks Body:", req.body);
        var id = req.body.id;
        var field = req.body.field;
        var editedValue = req.body.editedValue;
        console.log("Body:", req.body)
        var result = await registrationController.updateParticipantRemarks(id, field, editedValue);
        console.log("updateParticipantRemarks result:", result);
        if (io) {
            io.emit('registration', {
                type: 'registration-edit',
                id,
                field,
                value: editedValue,
            });
        }
        //console.log("Update Particulars:", result) 
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "updatePaymentStatus")
    {
        console.log("Official Use", req.body);
        var id = req.body.id;  
        var name = sanitizeStaffName(req.body.staff);
        var status = req.body.newUpdateStatus;
        
        // Date/time must come from the frontend (SGT, UTC+8). No backend fallback.
        var date = req.body.date;
        var time = req.body.time;
        const message = await registrationController.updateOfficialUse(id, name, date, time, status);
        
        // Emit progress tracking steps based on payment status
        if (io) {
            console.log(`🔄 [Step 1] Payment Status Updated to ${status}`);
            io.emit('registration', {
                type: 'registration-payment-status',
                id,
                status,
                step: 1,
                stepName: `Payment Status Updated to ${status}`,
            });
            
            // For Paid (Cash/PayNow), registration status is set via official.registration_status
            // For SkillsFuture Done, registration status is set via official.registration_status
        }
        return res.json({"result": message});
        //console.log("Message:", message);
        // After the PDF is sent, you can send a confirmation response if necessary
        //res.json({ message }); // Send confirmation response
    }
    else if(req.body.purpose === "updateConfirmationStatus")
    {
        console.log("Update Confirmation Status:", req.body);
        var id = req.body.id;  
        var name = sanitizeStaffName(req.body.staff);
        var status = parseConfirmationBoolean(req.body.newConfirmation);
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        const message = await registrationController.updateConfirmationUse(id, name, date, time, status);
        if (io) {
            io.emit('registration', {
                type: 'registration-confirmation',
                id,
                status,
            });
        }
        //console.log(message);
        return res.json({"result": message});
    }
    else if(req.body.purpose === "addReceiptNumber")
    {
        console.log("Receipt body:", req.body); 
        var staffName = sanitizeStaffName(req.body.staff);
                
        // Update the receipt number for the single registration identified by `id`.
        const registrationId = req.body.id;
        if (!registrationId) {
            return res.status(400).json({ result: false, message: 'Missing registration id' });
        }

        const result = await registrationController.updateReceiptNumber(registrationId, req.body.receiptNo);

        // Use frontend-provided SGT date/time if sent, otherwise fall back to backend computation
        let date, time;
        if (req.body.date && req.body.time) {
            date = req.body.date;
            time = req.body.time;
        } else {
            const currentDateTime = getCurrentDateTime();
            date = currentDateTime.date;
            time = currentDateTime.time;
        }

        // Update the official use details for the same registration id (do not use row numbers)
        await registrationController.updateOfficialUse(registrationId, staffName, date, time, req.body.status);

        if (io) {
            console.log(`🔄 [Step 4] Receipt Number Generated and Displayed: ${req.body.receiptNo}`);
            io.emit('registration', {
                type: 'registration-receipt-added',
                id: registrationId,
                receiptNo: req.body.receiptNo,
                step: 4,
                stepName: 'Receipt Number Generated and Displayed',
            });
            
            console.log(`🔄 [Step 5] Payment Date and Time Recorded: ${date} ${time}`);
            io.emit('registration', {
                type: 'registration-payment-datetime-recorded',
                id: registrationId,
                paymentDate: date,
                paymentTime: time,
                step: 5,
                stepName: 'Payment Date and Time Recorded',
            });
        }

        return res.json({ result: true, message: 'Receipt number and official use updated' });
    }
    else if(req.body.purpose === "receipt")
    {
        console.log("Body trasffered:", req.body);
        var staffName = sanitizeStaffName(req.body.staff);
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
        await receipt.generateReceipt(res, array, staffName, req.body.receiptNo);
    }
    else if(req.body.purpose === "addInvoiceNumber")
    {
        try {
            console.log("Invoice body:", req.body); 
            var staffName = sanitizeStaffName(req.body.staff);
            const registrationId = req.body.id;
            const invoiceNo = req.body.receiptNo;
            
            if (!registrationId) {
                return res.status(400).json({ result: false, message: 'Missing registration id' });
            }
            
            if (!invoiceNo) {
                console.warn("⚠️  [Invoice] Warning: invoiceNo is missing or null", { invoiceNo, body: req.body });
            }

            console.log("📝 [Invoice] Updating invoice number:", { registrationId, invoiceNo, status: req.body.status });
            const currentDateTime = getCurrentDateTime();
            const date = currentDateTime.date;
            const time = currentDateTime.time;

            // The frontend does not send a separate `location`; derive it from the course
            // payload so the stored invoice record is not left with an empty location.
            const invoiceLocation = req.body.location
                || req.body.course?.courseLocation
                || req.body.course?.location
                || '';

            const invoiceRecordResult = await invoiceController.createInvoice(
                invoiceNo,
                registrationId,
                req.body.url || '',
                staffName,
                date,
                time,
                invoiceLocation,
                req.body.status || 'Paid'
            );
            console.log("✅ [Invoice] Invoice record persisted:", invoiceRecordResult);

            const registrationUpdateResult = await registrationController.updateDocumentNumber(registrationId, invoiceNo);
            console.log("✅ [Invoice] Registration document number updated:", registrationUpdateResult);

            const officialUpdateResult = await registrationController.updateOfficialUse(registrationId, staffName, date, time, req.body.status);
            console.log("✅ [Invoice] Official use updated:", officialUpdateResult);

            if (io) {
                io.emit('registration', {
                    type: 'registration-invoice-added',
                    id: registrationId,
                });
            }

            return res.json({ result: true, message: 'Invoice number and official use updated', invoiceNo }); 
        } catch (error) {
            console.error("❌ [Invoice] Error updating invoice:", error);
            return res.status(500).json({ 
                result: false, 
                message: 'Error updating invoice number',
                error: error.message
            });
        }
    }
    else if(req.body.purpose === "clearPaymentDetails")
    {
        const registrationId = req.body.id;
        if (!registrationId) {
            return res.status(400).json({ result: false, message: 'Missing registration id' });
        }

        const cleared = await registrationController.clearPaymentDetails(registrationId);

        if (io) {
            io.emit('registration', {
                type: 'registration-payment-cleared',
                id: registrationId,
            });
        }

        return res.json({ result: cleared, message: 'Payment details cleared' });
    }
    else if(req.body.purpose === "invoice")
    {
        console.log("Invoice:",req.body);
        var staffName = sanitizeStaffName(req.body.staff);
        var age = calculateAge(req.body.participant.dateOfBirth);
        console.log("Participant age:", age);

        var invoice = new invoiceGenerator();
        var array = []
        array.push({
            id: req.body.id,
            participant: req.body.participant,
            course: req.body.course
        });
        await invoice.generateInvoice(res, array, staffName, req.body.receiptNo, age);
    }
    else if(req.body.purpose === "updatePaymentMethod")
    {
        console.log("updatePaymentMethod:", req.body);
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        var result = await registrationController.updatePaymentMethod(req.body.id, req.body.newUpdatePayment, sanitizeStaffName(req.body.staff), date, time);
        if (io) {
            io.emit('registration', {
                type: 'registration-payment-method',
                id: req.body.id,
                paymentMethod: req.body.newUpdatePayment,
            });
        }
        //console.log("Update Remarks:". result);
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "addRefundedDate")
    {
        //console.log("Add Refunded Date:", req.body);
        var date = req.body.date;
        var time = req.body.time;
        var result = await registrationController.addRefundedDate(req.body.id, date, time);
        if (io) {
            io.emit('registration', {
                type: 'registration-refunded-date',
                id: req.body.id,
                refundedDate: date,
                refundedTime: time,
            });
        }
        return res.json({"result": result});
    }
    else if(req.body.purpose === "removedRefundedDate")
    {
        //console.log("Add Refunded Date:", req.body);
        var result = await registrationController.addRefundedDate(req.body.id, "", "");
        if (io) {
            io.emit('registration', {
                type: 'registration-refunded-date',
                id: req.body.id,
                refundedDate: '',
                refundedTime: '',
            });
        }
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
        if (io) {
            io.emit('registration', {
                type: 'registration-remarks',
                id: req.body.id,
                remarks: req.body.editedValue || '',
            });
        }
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
                if (io) {
                    console.log("Emitting registration event to all connected clients");
                    io.emit('registration', {
                    date: date,
                    time: time
                });
                }
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

