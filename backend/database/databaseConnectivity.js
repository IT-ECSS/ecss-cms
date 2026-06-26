const { MongoClient, ObjectId } = require('mongodb');
const { generateReceiptNumber } = require('../numbering/receiptNumber');
const { getNextInvoiceNumber } = require('../numbering/invoiceNumber');

// MongoDB connection string - should use environment variable ok
//const uri = 'mongodb+srv://moseslee:Mlxy6695@ecss-course.hejib.mongodb.net/?retryWrites=true&w=majority&appName=ECSS-Course';
const uri =  "mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System"
// MongoDB connection options for better performance and stability
const mongoOptions = {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds (increased)
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    connectTimeoutMS: 30000, // Give more time to establish connection (increased)
    heartbeatFrequencyMS: 10000, // Check server health every 10 seconds
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    // Note: bufferMaxEntries and bufferCommands are Mongoose-specific, not native MongoDB driver options
    // useUnifiedTopology is now default and deprecated as an option
};

// ─── Receipt Year Boundary Configuration ────────────────────────────────────
// Receipts are counted within a financial/calendar year window.
// Change YEAR_START and YEAR_END below when a new year begins.
// Format: new Date(YYYY, MM-1, DD, HH, MM, SS)  (month is 0-indexed)
const RECEIPT_YEAR_CONFIG = {
    YEAR_START: new Date(2026, 0, 1, 0, 0, 0),    // 1 Jan 2026 00:00:00
    YEAR_END:   new Date(2026, 11, 31, 23, 59, 59), // 31 Dec 2026 23:59:59
};
// ─────────────────────────────────────────────────────────────────────────────

// Helper: returns the two-digit year (e.g. 26) if now is within the configured
// window, otherwise falls back to the actual current year.
function getConfiguredYear() {
    const now = new Date();
    if (now >= RECEIPT_YEAR_CONFIG.YEAR_START && now <= RECEIPT_YEAR_CONFIG.YEAR_END) {
        return RECEIPT_YEAR_CONFIG.YEAR_START.getFullYear();
    }
    return now.getFullYear();
}

function sanitizeStaffName(value) {
    return String(value ?? '').replace(/\s*\(Approved\)\s*$/i, '').trim();
}

class DatabaseConnectivity {
    constructor() {
        this.client = new MongoClient(uri, mongoOptions);
        this.isConnected = false;
        this.connectionPromise = null;
    }

    _makeObjectId(id) {
        if (!id) return null;
        if (typeof id === 'object' && id !== null) {
            return new ObjectId(String(id.$oid ?? id.id ?? id));
        }
        return new ObjectId(String(id));
    }

    // Connect to the database with improved error handling and connection reuse
    async initialize()
    {
        try 
        {
            if (!this.isConnected && !this.connectionPromise) 
            {
                console.log("Attempting to connect to MongoDB Atlas...");
                // Create connection promise to avoid multiple simultaneous connections
                this.connectionPromise = this.client.connect();
                
                // Set a timeout for connection with more generous timeout for Azure
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('MongoDB connection timeout after 30 seconds')), 30000)
                );
                
                await Promise.race([this.connectionPromise, timeoutPromise]);
                this.isConnected = true;
                this.connectionPromise = null;
                console.log("Connected to MongoDB Atlas successfully!");
                return "Connected to MongoDB Atlas!";
            } else if (this.isConnected) {
                console.log("Using existing MongoDB connection");
                return "Connected to MongoDB Atlas!";
            } else if (this.connectionPromise) {
                console.log("Waiting for existing connection attempt...");
                await this.connectionPromise;
                this.isConnected = true;
                this.connectionPromise = null;
                return "Connected to MongoDB Atlas!";
            }   
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            this.isConnected = false;
            this.connectionPromise = null;
            throw error;
        }
    }

    // Add connection health check with automatic reconnection
    async ensureConnection() {
        try {
            if (!this.isConnected) {
                await this.initialize();
            } else {
                // Test the connection with a simple ping
                await this.client.db('admin').command({ ping: 1 });
            }
        } catch (error) {
            console.log("Connection test failed, reinitializing...", error.message);
            this.isConnected = false;
            await this.initialize();
        }
    }

    async login(dbname, collectionName, email, password, date, time)
    {
        await this.ensureConnection(); // Ensure we have a good connection
        const db = this.client.db(dbname);
        try
        {
            var table = db.collection(collectionName);
            // Find a user with matching email and password
            const user = await table.findOne({ email: email, password: password });
            if (user) {
                await table.updateOne(
                    { _id: user._id }, // Filter to find the user
                    {
                        $set: {
                            date_log_in: date,
                            time_log_in: time
                        }
                    }
                );
    
            // User found, login successful
            return {
                success: true,
                message: 'Login successful',
                user: user // or you can choose to return specific user details
            };
            } else {
            // No user found, login failed
            return {
                success: false,
                message: 'Invalid email or password'
            };
            }
        }
        catch(error)
        {
            console.log("Login error:", error);
            throw error; // Re-throw to let caller handle
        }
    }

    async participantsLogin(dbname, collectionName, username, password)
    {
        const db = this.client.db(dbname);
        try
        {
            var table = db.collection(collectionName);
            
            // Find a user where contactNumber matches both username AND password
            const userByUsername = await table.findOne({ 
                contactNumber: username // This checks if contactNumber equals password too
            });

            if (userByUsername.contactNumber === password) {
                // User found, login successful
                return {
                    success: true,
                    message: 'Login successful',
                    user: userByUsername
                };
            } else {
                // No user found, login failed
                return {
                    success: false,
                    message: 'Invalid contact number or contact number does not match'
                };
            }
        }
        catch(error)
        {
            console.error("Participants login error:", error);
            return {
                success: false,
                message: 'Login error occurred',
                error: error.message
            };
        }
    }

    async updateParticipant(databaseName, collectionName, participantId, updateData)
    {
        const db = this.client.db(databaseName);
        try
        {
            var table = db.collection(collectionName);
            
            // Remove _id from updateData to avoid modifying the MongoDB _id field
            const { _id, ...fieldsToUpdate } = updateData;
            
            // Filter out undefined or null values
            const filteredUpdateData = {};
            for (const key in fieldsToUpdate) {
                if (fieldsToUpdate[key] !== undefined && fieldsToUpdate[key] !== null && fieldsToUpdate[key] !== '') {
                    filteredUpdateData[key] = fieldsToUpdate[key];
                }
            }
            
            const filter = { _id: new ObjectId(participantId) };
            const update = { $set: filteredUpdateData };
            
            console.log("Update filter:", filter);
            console.log("Update operation:", update);
            
            const result = await table.updateOne(filter, update);
            
            if (result.modifiedCount === 1) {
                return {
                    success: true,
                    message: "Participant updated successfully"
                };
            } else if (result.matchedCount === 1) {
                return {
                    success: true,
                    message: "No changes made - data was already up to date"
                };
            } else {
                return {
                    success: false,
                    message: "Participant not found with the provided ID"
                };
            }
        }
        catch(error)
        {
            console.error("Update participant error:", error);
            return {
                success: false,
                message: "Error updating participant"
            };
        }
    }

    async logout(dbname, collectionName, accountId, date, time)
    {
        const db = this.client.db(dbname);
        try
        {
            var table = db.collection(collectionName);
            // Find a user with matching email and password
            const user = await table.findOne({ _id: new ObjectId(accountId) });
            if (user) {
                await table.updateOne(
                    { _id: user._id }, // Filter to find the user
                    {
                        $set: {
                            date_log_out: date,
                            time_log_out: time
                        }
                    }
                );
    
            // User found, login successful
            return {
                success: true,
                message: 'Logout successful',
            };
            } else {
            // No user found, login failed
            return {
                success: false,
                message: 'Invalid email or password'
            };
            }
        }
        catch(error)
        {
            console.log(error);
        }
    }
    
    // Add this method to your DatabaseConnectivity class
    async findCoursesRegisteredByNRIC(databaseName, collectionName, nric) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            // Find all courses registered by the participant with the given NRIC
            const courses = await table.find({ 
                "participant.nric": nric 
            }).toArray();
            
            console.log(`Found ${courses.length} courses for NRIC: ${nric}`);
            return courses;
        } catch (error) {
            console.error("Error retrieving courses by NRIC:", error);
            throw error;
        }
    }
    
    async getAllMembershipRecords(databaseName, collectionName) {  
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const records = await table.find().toArray(); // Convert cursor to array
            
            return {
                success: true,
                message: `Found ${records.length} membership records`,
                data: records
            };
        } catch (error) {
            console.error("Error retrieving membership records:", error);
            return {
                success: false,
                message: "Error retrieving membership records",
                error: error.message
            };
        } 
    }

    async insertAttendanceRecord(databaseName, collectionName, attendanceData) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const result = await table.insertOne(attendanceData);
    
            if (result.insertedId) {
                return {
                    success: true,
                    message: "Attendance record inserted successfully",
                    details: {
                        insertedId: result.insertedId,
                        attendanceData: attendanceData
                    }
                };
            } else {
                return {
                    success: false,
                    message: "Failed to insert attendance record"
                };
            }
        } catch (error) {
            console.error("Error inserting attendance record:", error);
            return {
                success: false,
                message: "Error inserting attendance record",
                error: error.message
            };
        }
    }

    async insertParticipant(databaseName, collectionName, participantData) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const result = await table.insertOne(participantData);
    
            if (result.insertedId) {
                return {
                    success: true,
                    message: "Participant inserted successfully",
                    details: {
                        insertedId: result.insertedId,
                        participantData: participantData
                    }
                };
            } else {
                return {
                    success: false,
                    message: "Failed to insert participant"
                };
            }
        } catch (error) {
            console.error("Error inserting participant:", error);
            return {
                success: false,
                message: "Error inserting participant",
                error: error.message
            };
        }
    }

    // Method to find existing participants by NRIC and phone for duplicate checking
    async findParticipantByNricAndPhone(databaseName, collectionName, nric, phone) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
        
        try {
            await this.ensureConnection();
            
            // Check for exact match with both NRIC and phone
            if (nric && nric.trim() && phone && phone.trim()) {
                const exactMatch = await table.find({ 
                    "nric": nric.trim().toUpperCase(), // Use exact match instead of regex
                    "phone": phone.trim()
                }).limit(10).toArray(); // Add limit to prevent large result sets
                
                if (exactMatch.length > 0) {
                    return {
                        success: true,
                        found: true,
                        participants: exactMatch,
                        duplicateType: "both",
                        message: `Found exact match with same NRIC and phone number`,
                        canUpdate: true
                    };
                }
            }
            
            // Check for NRIC duplicates only
            if (nric && nric.trim()) {
                const nricResults = await table.find({ 
                    "nric": nric.trim().toUpperCase() // Use exact match instead of regex
                }).limit(10).toArray();
                
                if (nricResults.length > 0) {
                    return {
                        success: true,
                        found: true,
                        participants: nricResults,
                        duplicateType: "nric",
                        message: `Found ${nricResults.length} existing participant(s) with same NRIC`,
                        canUpdate: false
                    };
                }
            }
            
            // Check for phone duplicates only
            if (phone && phone.trim()) {
                const phoneResults = await table.find({ 
                    "phone": phone.trim()
                }).toArray();
                
                if (phoneResults.length > 0) {
                    return {
                        success: true,
                        found: true,
                        participants: phoneResults,
                        duplicateType: "phone",
                        message: `Found ${phoneResults.length} existing participant(s) with same phone number`,
                        canUpdate: false
                    };
                }
            }
            
            // No duplicates found
            return {
                success: true,
                found: false,
                participants: [],
                duplicateType: null,
                message: "No existing participants found",
                canUpdate: false
            };
            
        } catch (error) {
            console.error("Error finding participant by NRIC/phone:", error);
            return {
                success: false,
                found: false,
                participants: [],
                duplicateType: null,
                message: "Error searching for existing participants",
                canUpdate: false,
                error: error.message
            };
        }
    }

    // Method to find participants by NRIC only
    async findParticipantsByNRIC(databaseName, collectionName, nric) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
        
        try {
            if (!nric || !nric.trim()) {
                return {
                    success: true,
                    found: false,
                    participants: [],
                    message: "No NRIC provided"
                };
            }

            const nricResults = await table.find({ 
                "nric": { $regex: new RegExp(`^${nric.trim()}$`, 'i') }
            }).toArray();
            
            if (nricResults.length > 0) {
                return {
                    success: true,
                    found: true,
                    participants: nricResults,
                    message: `Found ${nricResults.length} participant(s) with NRIC: ${nric.trim()}`
                };
            } else {
                return {
                    success: true,
                    found: false,
                    participants: [],
                    message: `No participants found with NRIC: ${nric.trim()}`
                };
            }
            
        } catch (error) {
            console.error("Error finding participants by NRIC:", error);
            return {
                success: false,
                found: false,
                participants: [],
                message: "Error searching for participants by NRIC",
                error: error.message
            };
        }
    }

    // Method to find participants by phone number only
    async findParticipantsByPhone(databaseName, collectionName, phoneNumber) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
        
        try {
            if (!phoneNumber || !phoneNumber.trim()) {
                return {
                    success: true,
                    found: false,
                    participants: [],
                    message: "No phone number provided"
                };
            }

            const phoneResults = await table.find({ 
                "phone": phoneNumber.trim()
            }).toArray();
            
            if (phoneResults.length > 0) {
                return {
                    success: true,
                    found: true,
                    participants: phoneResults,
                    message: `Found ${phoneResults.length} participant(s) with phone: ${phoneNumber.trim()}`
                };
            } else {
                return {
                    success: true,
                    found: false,
                    participants: [],
                    message: `No participants found with phone: ${phoneNumber.trim()}`
                };
            }
            
        } catch (error) {
            console.error("Error finding participants by phone:", error);
            return {
                success: false,
                found: false,
                participants: [],
                message: "Error searching for participants by phone",
                error: error.message
            };
        }
    }

    async getAllAttendanceRecords(databaseName, collectionName) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const records = await table.find().toArray(); // Convert cursor to array
            
            return {
                success: true,
                message: `Found ${records.length} attendance records`,
                data: records
            };
        } catch (error) {
            console.error("Error retrieving attendance records:", error);
            return {
                success: false,
                message: "Error retrieving attendance records",
                error: error.message
            };
        }
    }

    // Method to get all participants for AI duplicate analysis
    async getAllParticipants(databaseName, collectionName) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const participants = await table.find().toArray();
            
            return {
                success: true,
                message: `Retrieved ${participants.length} participants for AI analysis`,
                participants: participants
            };
        } catch (error) {
            console.error("Error retrieving participants for AI analysis:", error);
            return {
                success: false,
                message: "Error retrieving participants for AI analysis",
                error: error.message,
                participants: []
            };
        }
    }
    
    async getAttendanceRecords(databaseName, collectionName, filterData = {}) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const records = await table.find(filterData).toArray();
            
            return {
                success: true,
                message: `Found ${records.length} attendance records`,
                data: records
            };
        } catch (error) {
            console.error("Error retrieving attendance records:", error);
            return {
                success: false,
                message: "Error retrieving attendance records",
                error: error.message
            };
        }
    }
    
    async updateAttendanceRecord(databaseName, collectionName, attendanceId, updateData) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const { _id, ...fieldsToUpdate } = updateData;
            
            const filter = { _id: new ObjectId(attendanceId) };
            const update = { $set: fieldsToUpdate };
            
            const result = await table.updateOne(filter, update);
            
            if (result.modifiedCount === 1) {
                return {
                    success: true,
                    message: "Attendance record updated successfully",
                    details: fieldsToUpdate
                };
            } else if (result.matchedCount === 1) {
                return {
                    success: true,
                    message: "No changes made - data was already up to date",
                    details: fieldsToUpdate
                };
            } else {
                return {
                    success: false,
                    message: "Attendance record not found with the provided ID"
                };
            }
        } catch (error) {
            console.error("Error updating attendance record:", error);
            return {
                success: false,
                message: "Error updating attendance record",
                error: error.message
            };
        }
    }

    async changePassword(dbname, collectionName, accountId, newPassword)
    {
        const db = this.client.db(dbname);
        try
        {
            var table = db.collection(collectionName);
            // Find a user with matching email and password
            const result = await table.updateOne(
                { _id: accountId }, // Filter
                { $set: { password: newPassword,
                            first_time_log_in: "No"
                 } } // Update
            );

            if (result) {
            // User found, login successful
            return {
                success: true,
                message: 'Change Password Successful',
            };
            } else {
            // No user found, login failed
            return {
                success: false,
                message: 'Change Password Failure'
            };
            }
        }
        catch(error)
        {
            console.log(error);
        }
    }

    async resetPassword(dbname, collectionName, username, password)
    {
        const db = this.client.db(dbname);
        try
        {
            var table = db.collection(collectionName);
            // Find a user with matching email and password
            const result = await table.updateOne(
                {email: username }, // Filter
                { $set: {   password: password,
                            first_time_log_in: "No"
                 } } // Update
            );
            console.log(result);
            if (result) {
            // User found, login successful
            return {
                success: true,
                message: 'Change Password Successful',
            };
            } else {
            // No user found, login failed
            return {
                success: false,
                message: 'Change Password Failure'
            };
            }
        }
        catch(error)
        {
            console.log(error);
        }
    }

    async insertToDatabase(dbname, collectionName, data) {
        console.log("Database:", dbname);
        console.log("Data:", data);
    
        const db = this.client.db(dbname); // Get the database object
        let result;
    
        try {
            if (db) {
                const table = db.collection(collectionName);
    
                // Ensure registration_id / inventory_id is an ObjectId for collections that store a reference.
                if (collectionName === "Receipts" || collectionName === "Invoices") {
                    const regIdStr = String(data.registration_id ?? '').trim();
                    const candidateRegistrationIds = [];
                    if (regIdStr) {
                        candidateRegistrationIds.push(regIdStr);
                        if (/^[0-9a-f]{24}$/i.test(regIdStr)) {
                            candidateRegistrationIds.push(new ObjectId(regIdStr));
                        }
                    }

                    const invIdStr = String(data.inventory_id ?? '').trim();
                    const candidateInventoryIds = [];
                    if (invIdStr) {
                        candidateInventoryIds.push(invIdStr);
                        if (/^[0-9a-f]{24}$/i.test(invIdStr)) {
                            candidateInventoryIds.push(new ObjectId(invIdStr));
                        }
                    }

                    const duplicateFilters = [];
                    if (collectionName === "Receipts" && data.receiptNo) {
                        duplicateFilters.push({ receiptNo: data.receiptNo });
                    }
                    if (collectionName === "Invoices" && data.invoiceNo) {
                        duplicateFilters.push({ invoiceNo: data.invoiceNo });
                    }
                    if (candidateRegistrationIds.length > 0 && data.staff && data.location) {
                        duplicateFilters.push({
                            registration_id: { $in: candidateRegistrationIds },
                            staff: data.staff,
                            location: data.location,
                        });
                    }
                    if (candidateInventoryIds.length > 0 && data.staff && data.location) {
                        duplicateFilters.push({
                            inventory_id: { $in: candidateInventoryIds },
                            staff: data.staff,
                            location: data.location,
                        });
                    }

                    const duplicateFilter = duplicateFilters.length > 1 ? { $or: duplicateFilters } : duplicateFilters[0];
                    console.log(`📝 [DB] Checking for duplicate ${collectionName.toLowerCase()} document:`, duplicateFilter);

                    const existingDocument = duplicateFilter ? await table.findOne(duplicateFilter, { projection: { _id: 1 } }) : null;
                    if (existingDocument) {
                        console.log(`⚠️ [DB] ${collectionName} already exists with same document reference, skipping insert:`, duplicateFilter);
                        return {
                            acknowledged: true,
                            skipped: true,
                            reason: `${collectionName.toLowerCase()} already exists for this reference, staff, and location combination`,
                        };
                    }

                    if (regIdStr && /^[0-9a-f]{24}$/i.test(regIdStr)) {
                        data.registration_id = new ObjectId(regIdStr);
                        console.log("✅ [DB] registration_id normalized to ObjectId:", data.registration_id);
                    } else if (regIdStr) {
                        console.log("ℹ️ [DB] registration_id is not a 24-char ObjectId string, keeping original value:", data.registration_id);
                    }
                    if (invIdStr && /^[0-9a-f]{24}$/i.test(invIdStr)) {
                        data.inventory_id = new ObjectId(invIdStr);
                        console.log("✅ [DB] inventory_id normalized to ObjectId:", data.inventory_id);
                    }
                }
    
                // Directly insert the data without any checks
                console.log("📝 [DB] Inserting document into collection:", { collectionName, dataKeys: Object.keys(data) });
                result = await table.insertOne(data);
                console.log("✅ [DB] Insert successful:", { acknowledged: result.acknowledged, insertedId: result.insertedId });
                
                // Verify the insert worked by retrieving the document
                if (collectionName === "Receipts" && result.insertedId) {
                    console.log("📝 [DB] Verifying insert by querying inserted document...");
                    const verifyResult = await table.findOne({ _id: result.insertedId });
                    if (verifyResult) {
                        console.log("✅ [DB] VERIFICATION SUCCESSFUL - Document found in collection with receiptNo:", verifyResult.receiptNo);
                    } else {
                        console.error("❌ [DB] VERIFICATION FAILED - Document NOT found after insert!");
                        return { acknowledged: false, error: "Document inserted but verification query returned null" };
                    }
                }
    
                // Return the result based on the collection name
                if (collectionName === "Accounts") {
                    return { acknowledged: result.acknowledged, accountId: result.insertedId, insertedId: result.insertedId };
                } else {
                    return { acknowledged: result.acknowledged, insertedId: result.insertedId };
                }
            } else {
                console.error("❌ [DB] Database object is null/undefined");
                return { acknowledged: false, error: "Database connection failed" };
            }
        } catch (error) {
            console.error('❌ [DB] Error during database operation:', error.message);
            console.error('❌ [DB] Error stack:', error.stack);
            return { acknowledged: false, error: error.message }; // Return error status
        }
    }
    
    async retrieveFromDatabase(dbname, collectionName)
    {
        var db = this.client.db(dbname); // return the db object
        try
        {
            if(db)
            {
                var table = db.collection(collectionName);
                var result = await table.find().toArray();
                return result;
            }
        }
        catch(error)
        {
            console.log(error);
        }
    }

    // Fields needed by the frontend row mapper — excludes large/unused fields to
    // reduce network transfer and MongoDB serialisation overhead.
    // Add a field here if you see undefined values in the table.
    static get REGISTRATION_PROJECTION() {
        return {
            participant: 1, course: 1, status: 1,
            official: 1, officialInfo: 1,
            paymentMethod: 1, finalPaymentMethod: 1,
            recinvNo: 1, agreement: 1,
            registrationDate: 1, sendingWhatsappMessage: 1,
            marriageDetails: 1, spouse: 1,
            consent: 1, marriagePrepConsent: 1,
            sn: 1, sN: 1,
        };
    }

    async retrieveCourseRegistration(dbname, collectionName, role, siteIC) 
    {
        var db = this.client.db(dbname); // Return the db object
        try {
            if (db) {
                var table = db.collection(collectionName);
                
                // Define query object
                let query = {};

                // Verbose debug logs are gated behind DB_DEBUG env var to avoid
                // heavy logging and large result output during regular operations.
                if (process.env.DB_DEBUG === 'true') {
                    console.log("=== RETRIEVE COURSE REGISTRATION DEBUG ===");
                    console.log("Database Name:", dbname);
                    console.log("Collection Name:", collectionName);
                    console.log("Role:", role);
                    console.log("SiteIC Type:", typeof siteIC);
                    console.log("SiteIC Value:", siteIC);
                    console.log("SiteIC JSON:", JSON.stringify(siteIC));
                }

                // Handle different roles and their specific filters
                if (role === "Site in-charge") {
                    console.log("Processing Site in-charge filtering...");
                    if (siteIC != null) {
                        let allowedLocations = [];
                        
                        // Handle different types of siteIC input
                        if (Array.isArray(siteIC)) {
                            // Already an array
                            allowedLocations = siteIC;
                            console.log("Site IC is array:", allowedLocations);
                        } else if (typeof siteIC === 'string') {
                            // Check if it's comma-separated
                            if (siteIC.includes(',')) {
                                allowedLocations = siteIC.split(',').map(site => site.trim());
                                console.log("Site IC is comma-separated:", allowedLocations);
                            } else {
                                allowedLocations = [siteIC.trim()];
                                console.log("Site IC is single string:", allowedLocations);
                            }
                        }
                        
                        // Use $in operator for multiple sites or single site
                        if (allowedLocations.length > 1) {
                            query["course.courseLocation"] = { $in: allowedLocations };
                            console.log("Using $in query for multiple sites:", allowedLocations);
                        } else if (allowedLocations.length === 1) {
                            query["course.courseLocation"] = allowedLocations[0];
                            console.log("Using exact match for single site:", allowedLocations[0]);
                        }
                    } else {
                        console.log("SiteIC is null, not filtering by location");
                    }
                } 
                else if (role === "NSA in-charge") {
                    console.log("Processing NSA in-charge filtering...");
                    // NSA in-charge can only see NSA courses
                    query["course.courseType"] = "NSA";
                    console.log("Filtering for NSA courses only");
                }else if (role === "Social Worker") {
                    console.log("Processing Social Worker filtering...");
                    // Social Workers can only see Talks And Seminar and Marriage Preparation Programme courses
                    query["course.courseType"] = {
                        $in: [
                            "Talks And Seminar",
                            "Marriage Preparation Programme"
                        ]
                    };
                    console.log("Filtering for Talks And Seminar and Marriage Preparation Programme courses only");
                } else {
                    console.log("Role has no specific filters, returning all documents");
                }
                // If role has no specific filters, return all documents (empty query retrieves all)
                
                if (process.env.DB_DEBUG === 'true') {
                    console.log("Final MongoDB query:", JSON.stringify(query));
                }

                var result = await table.find(query, { projection: DatabaseConnectivity.REGISTRATION_PROJECTION }).toArray();

                if (process.env.DB_DEBUG === 'true') {
                    console.log("Query result count:", result.length);
                    // Log sample results for debugging
                    if (result.length > 0) {
                        console.log("Sample results:");
                        result.slice(0, 3).forEach((record, index) => {
                            console.log(`Record ${index + 1}:`, {
                                name: record.participant?.name,
                                location: record.course?.courseLocation,
                                course: record.course?.courseEngName,
                                _id: record._id
                            });
                        });
                    } else {
                        console.log("No records found matching the query");
                        // Let's also check total records without filter
                        const totalCount = await table.countDocuments({});
                        console.log("Total documents in collection:", totalCount);
                        // Check what locations exist in the database
                        const locationSample = await table.aggregate([
                            { $group: { _id: "$course.courseLocation", count: { $sum: 1 } } },
                            { $sort: { count: -1 } }
                        ]).toArray();
                        console.log("Available locations in database:", locationSample);
                    }
                }

                return result;
            }
        } catch (error) {
            console.log("Database query error:", error);
        }
    }


    // ── Single-document retrieval by _id ─────────────────────────────────────

    async retrieveRegistrationById(dbname, collectionName, id) {
        var db = this.client.db(dbname);
        try {
            if (db) {
                var table = db.collection(collectionName);
                var result = await table.findOne(
                    { _id: this._makeObjectId(id) },
                    { projection: DatabaseConnectivity.REGISTRATION_PROJECTION }
                );
                return result;
            }
        } catch (error) {
            console.log('retrieveRegistrationById error:', error);
            return null;
        }
    }

    // ── Paged retrieval for parallel batch loading ────────────────────────────
    async retrieveCourseRegistrationPaged(dbname, collectionName, role, siteIC, skip = 0, limit = 300) {
        var db = this.client.db(dbname);
        try {
            if (db) {
                var table = db.collection(collectionName);
                let query = {};

                if (role === "Site in-charge") {
                    if (siteIC != null) {
                        let allowedLocations = [];
                        if (Array.isArray(siteIC)) {
                            allowedLocations = siteIC;
                        } else if (typeof siteIC === 'string') {
                            allowedLocations = siteIC.includes(',')
                                ? siteIC.split(',').map(s => s.trim())
                                : [siteIC.trim()];
                        }
                        if (allowedLocations.length > 1) {
                            query["course.courseLocation"] = { $in: allowedLocations };
                        } else if (allowedLocations.length === 1) {
                            query["course.courseLocation"] = allowedLocations[0];
                        }
                    }
                } else if (role === "NSA in-charge") {
                    query["course.courseType"] = "NSA";
                } else if (role === "Social Worker") {
                    query["course.courseType"] = { $in: ["Talks And Seminar", "Marriage Preparation Programme"] };
                }

                // Run count and page fetch in parallel
                const [data, total] = await Promise.all([
                    table.find(query).skip(skip).limit(limit).toArray(),
                    skip === 0 ? table.countDocuments(query) : Promise.resolve(null),
                ]);

                return { data, total };
            }
        } catch (error) {
            console.log("Paged query error:", error);
            return { data: [], total: 0 };
        }
    }

    async retrieveOneFromDatabase(dbname, collectionName, id) {
        console.log("Selected One");
        console.log("Id:", id);
        var db = this.client.db(dbname); // Return the db object
        try {
            if (db) {
                var table = db.collection(collectionName);
                // Use findOne to get the document by nested field
                var result = await table.findOne({ "Account Details.Account ID": this._makeObjectId(id)}); // Convert id to ObjectId
                console.log("Retrieve:", result); // Log the result
                return result; // Return the single document
            }
        } catch (error) {
            console.log(error);
        }
    }
    
            
    async updateInDatabase(dbname, id, newStatus) {
        var db = this.client.db(dbname); // return the db object
        try {
            if (db) {
                var tableName = "Registration Forms";
                var table = db.collection(tableName);
    
                // Use updateOne to update a single document
                const filter = { _id: this._makeObjectId(id) };

                const update = {
                    $set: {
                        status: newStatus,
                    }
                };

               // Call updateOne
                const result = await table.updateOne(filter, update);
    
                return result;
            }
        } catch (error) {
            console.log("Error updating database:", error);
        }
    }

                
    async updateParticipantParticulars(dbname, id, field, editedParticulars, rowCourseType) {
        console.log("Update Participant Particulars", id, field, editedParticulars, rowCourseType);
        var db = this.client.db(dbname); // Return the db object
        try {
            if (db) {
                const tableName = "Registration Forms";
                const table = db.collection(tableName);
                
                // Use updateOne to update a single document
                const filter = { _id: this._makeObjectId(id) };
    
                const normalizedField = String(field || '').trim();
                console.log("Normalized field:", normalizedField);

                let fieldPathMap = {};

                if(rowCourseType === 'NSA') {
               fieldPathMap = {
                    // Participant information fields
                    name: 'participant.name',
                    nric: 'participant.nric',
                    contactNo: 'participant.contactNumber',
                    contactNumber: 'participant.contactNumber',
                    email: 'participant.email',
                    gender: 'participant.gender',
                    dateOfBirth: 'participant.dateOfBirth',
                    residentialStatus: 'participant.residentialStatus',
                    race: 'participant.race',
                    postalCode: 'participant.postalCode',
                    educationLevel: 'participant.educationLevel',
                    workStatus: 'participant.workStatus',

                    // Existing editable non-participant fields
                    remarks: 'official.remarks',
                    paymentDate: 'official.date',
                    paymentTime: 'official.time',
                    refundedDate: 'official.refundedDate',
                    refundedTime: 'official.refundedTime',
                    registrationStatus: 'official.registration_status',
                    location: 'course.courseLocation',
                    course: 'course.courseEngName',
                    courseMode: 'course.courseMode',
                    courseDuration: 'course.courseDuration',
                    courseTime: 'course.courseTime',
                    finalPaymentMethod: 'course.finalPaymentMethod',
                };
            }

            else if(rowCourseType === "ILP" || rowCourseType === "Talks And Seminar" || rowCourseType === "Others" || rowCourseType === "Marriage Preparation Programme") {
                fieldPathMap = {
                    // Participant information fields
                    name: 'participant.name',
                    nric: 'participant.nric',
                    contactNo: 'participant.contactNumber',
                    contactNumber: 'participant.contactNumber',
                    email: 'participant.email',
                    gender: 'participant.gender',
                    dateOfBirth: 'participant.dateOfBirth',
                    residentialStatus: 'participant.residentialStatus',
                    race: 'participant.race',
                    postalCode: 'participant.postalCode',
                    educationLevel: 'participant.educationLevel',
                    workStatus: 'participant.workStatus',
                    status: 'status',

                    // Existing editable non-participant fields
                    remarks: 'official.remarks',
                    paymentDate: 'official.date',
                    paymentTime: 'official.time',
                    refundedDate: 'official.refundedDate',
                    refundedTime: 'official.refundedTime',
                    registrationStatus: 'official.registration_status',
                    location: 'course.courseLocation',
                    course: 'course.courseEngName',
                    courseMode: 'course.courseMode',
                    courseDuration: 'course.courseDuration',
                    courseTime: 'course.courseTime',
                    finalPaymentMethod: 'course.finalPaymentMethod',
                };
            }

            else {
                // Catch-all for any other course type (regular community courses, etc.)
                // so common fields like paymentDate/paymentTime/remarks remain editable
                // instead of being rejected as "Unsupported participant field".
                fieldPathMap = {
                    // Participant information fields
                    name: 'participant.name',
                    nric: 'participant.nric',
                    contactNo: 'participant.contactNumber',
                    contactNumber: 'participant.contactNumber',
                    email: 'participant.email',
                    gender: 'participant.gender',
                    dateOfBirth: 'participant.dateOfBirth',
                    residentialStatus: 'participant.residentialStatus',
                    race: 'participant.race',
                    postalCode: 'participant.postalCode',
                    educationLevel: 'participant.educationLevel',
                    workStatus: 'participant.workStatus',
                    status: 'status',

                    // Existing editable non-participant fields
                    remarks: 'official.remarks',
                    paymentDate: 'official.date',
                    paymentTime: 'official.time',
                    refundedDate: 'official.refundedDate',
                    refundedTime: 'official.refundedTime',
                    registrationStatus: 'official.registration_status',
                    location: 'course.courseLocation',
                    course: 'course.courseEngName',
                    courseMode: 'course.courseMode',
                    courseDuration: 'course.courseDuration',
                    courseTime: 'course.courseTime',
                    finalPaymentMethod: 'course.finalPaymentMethod',
                };
            }

                const allowedParticipantFields = new Set([
                    'name',
                    'nric',
                    'contactNumber',
                    'email',
                    'gender',
                    'dateOfBirth',
                    'residentialStatus',
                    'race',
                    'postalCode',
                    'educationLevel',
                    'workStatus',
                ]);

                // Keep compatibility for legacy participant fields, while rejecting unsafe keys.
                let mappedPath = fieldPathMap[normalizedField];
                if (!mappedPath) {
                    if (!allowedParticipantFields.has(normalizedField)) {
                        throw new Error(`Unsupported participant field: ${normalizedField}`);
                    }
                    mappedPath = `participant.${normalizedField}`;
                }

                let normalizedValue = editedParticulars;

                if (typeof normalizedValue === 'string') {
                    normalizedValue = normalizedValue.trim();
                }

                // Ensure date/time fields are always strings (never null or undefined)
                if (normalizedField === 'refundedDate' || normalizedField === 'refundedTime' || 
                    normalizedField === 'paymentDate' || normalizedField === 'paymentTime') {
                    normalizedValue = String(normalizedValue || '').trim();
                }

                // Accept ISO date input and store as DD/MM/YYYY for consistency.
                if (normalizedField === 'dateOfBirth' && typeof normalizedValue === 'string') {
                    const isoDate = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (isoDate) {
                        const [, yyyy, mm, dd] = isoDate;
                        normalizedValue = `${dd}/${mm}/${yyyy}`;
                    }
                }

                // Normalize common short-form values to the bilingual labels used in UI.
                if (normalizedField === 'residentialStatus') {
                    const value = String(normalizedValue || '').toLowerCase();
                    if (value === 'sc' || value === 'singapore citizen') normalizedValue = 'SC 新加坡公民';
                    if (value === 'pr' || value === 'permanent resident') normalizedValue = 'PR 永久居民';
                }

                if (normalizedField === 'gender') {
                    const value = String(normalizedValue || '').toLowerCase();
                    if (value === 'm' || value === 'male') normalizedValue = 'M 男';
                    if (value === 'f' || value === 'female') normalizedValue = 'F 女';
                }

                // Build update object - always update the mapped path
                const updateSet = {
                    [mappedPath]: normalizedValue,
                };

                const update = {
                    $set: updateSet,
                };
    
                // Call updateOne
                console.log("Executing MongoDB updateOne with filter:", filter, "and update:", update);
                const result = await table.updateOne(filter, update);
                console.log("Update Result:", result);
                console.log("Matched count:", result.matchedCount, "Modified count:", result.modifiedCount);
                
                // Log specific field updates for verification
                if (normalizedField === 'registrationStatus') {
                    console.log(`✅ [Registration Status Update] Field: ${normalizedField} | Mapped Path: ${mappedPath} | New Value: ${normalizedValue} | Matched: ${result.matchedCount} | Modified: ${result.modifiedCount}`);
                }
                
                return result;
            }
        } catch (error) {
            console.error("Error updating database:", error);
            throw error; // Re-throw the error to handle it in the calling function
        }
    }

    async updateILPParticipantParticulars(dbname, id, field, editedParticulars) {
        console.log("Update Request:", id, field, editedParticulars);
        var db = this.client.db(dbname); // Return the db object
        try {
            if (db) {
                const tableName = "Registration Forms";
                const table = db.collection(tableName);
                
                // Use updateOne to update a single document
                const filter = { _id: this._makeObjectId(id) };
    
                const normalizedField = String(field || '').trim();

                const fieldPathMap = {
                    // Participant information fields
                    name: 'participant.name',
                    nric: 'participant.nric',
                    contactNo: 'participant.contactNumber',
                    contactNumber: 'participant.contactNumber',
                    email: 'participant.email',
                    gender: 'participant.gender',
                    dateOfBirth: 'participant.dateOfBirth',
                    residentialStatus: 'participant.residentialStatus',
                    race: 'participant.race',
                    postalCode: 'participant.postalCode',
                    educationLevel: 'participant.educationLevel',
                    workStatus: 'participant.workStatus',

                    // Existing editable non-participant fields
                    remarks: 'official.remarks',
                    paymentDate: 'official.date',
                    paymentTime: 'official.time',
                    refundedDate: 'official.refundedDate',
                    refundedTime: 'official.refundedTime',
                    registrationStatus: 'official.registration_status',
                    location: 'course.courseLocation',
                    course: 'course.courseEngName',
                    courseMode: 'course.courseMode',
                    courseDuration: 'course.courseDuration',
                    courseTime: 'course.courseTime',
                    finalPaymentMethod: 'course.finalPaymentMethod',
                    status: 'status'
                };

                const allowedParticipantFields = new Set([
                    'name',
                    'nric',
                    'contactNumber',
                    'email',
                    'gender',
                    'dateOfBirth',
                    'residentialStatus',
                    'race',
                    'postalCode',
                    'educationLevel',
                    'workStatus',
                ]);

                // Keep compatibility for legacy participant fields, while rejecting unsafe keys.
                let mappedPath = fieldPathMap[normalizedField];
                if (!mappedPath) {
                    if (!allowedParticipantFields.has(normalizedField)) {
                        throw new Error(`Unsupported participant field: ${normalizedField}`);
                    }
                    mappedPath = `participant.${normalizedField}`;
                }

                let normalizedValue = editedParticulars;

                if (typeof normalizedValue === 'string') {
                    normalizedValue = normalizedValue.trim();
                }

                // Ensure date/time fields are always strings (never null or undefined)
                if (normalizedField === 'refundedDate' || normalizedField === 'refundedTime' || 
                    normalizedField === 'paymentDate' || normalizedField === 'paymentTime') {
                    normalizedValue = String(normalizedValue || '').trim();
                }

                // Accept ISO date input and store as DD/MM/YYYY for consistency.
                if (normalizedField === 'dateOfBirth' && typeof normalizedValue === 'string') {
                    const isoDate = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (isoDate) {
                        const [, yyyy, mm, dd] = isoDate;
                        normalizedValue = `${dd}/${mm}/${yyyy}`;
                    }
                }

                // Normalize common short-form values to the bilingual labels used in UI.
                if (normalizedField === 'residentialStatus') {
                    const value = String(normalizedValue || '').toLowerCase();
                    if (value === 'sc' || value === 'singapore citizen') normalizedValue = 'SC 新加坡公民';
                    if (value === 'pr' || value === 'permanent resident') normalizedValue = 'PR 永久居民';
                }

                if (normalizedField === 'gender') {
                    const value = String(normalizedValue || '').toLowerCase();
                    if (value === 'm' || value === 'male') normalizedValue = 'M 男';
                    if (value === 'f' || value === 'female') normalizedValue = 'F 女';
                }

                // Build update object - always update the mapped path
                const updateSet = {
                    [mappedPath]: normalizedValue,
                };

                const update = {
                    $set: updateSet,
                };
    
                // Call updateOne
                console.log("Executing MongoDB updateOne with filter:", filter, "and update:", update);
                const result = await table.updateOne(filter, update);
                console.log("Update Result:", result);
                console.log("Matched count:", result.matchedCount, "Modified count:", result.modifiedCount);
                
                // Log specific field updates for verification
                if (normalizedField === 'registrationStatus') {
                    console.log(`✅ [Registration Status Update] Field: ${normalizedField} | Mapped Path: ${mappedPath} | New Value: ${normalizedValue} | Matched: ${result.matchedCount} | Modified: ${result.modifiedCount}`);
                }
                
                return result;
            }
        } catch (error) {
            console.error("Error updating database:", error);
            throw error; // Re-throw the error to handle it in the calling function
        }
    }

    async updateParticipantRemarks(dbname, id, field, editedRemarks) {
        console.log("Update Request:", id, field, editedParticulars);
        var db = this.client.db(dbname); // Return the db object
        try {
            if (db) {
                const tableName = "Registration Forms";
                const table = db.collection(tableName);
                
                // Use updateOne to update a single document
                const filter = { _id: this._makeObjectId(id) };
    
                const normalizedField = String(field || '').trim();

                let fieldPathMap = {};

                if(rowCourseType === 'NSA') {
               fieldPathMap = {
                    remarks: 'official.remarks'
                };
            }

            else if(rowCourseType === "ILP" || rowCourseType === "Talks And Seminar" || rowCourseType === "Others" || rowCourseType === "Marriage Preparation Programme") {
                fieldPathMap = {
                  remarks: 'official.remarks'
                };
            }

                const allowedParticipantFields = new Set([
                    'name',
                    'nric',
                    'contactNumber',
                    'email',
                    'gender',
                    'dateOfBirth',
                    'residentialStatus',
                    'race',
                    'postalCode',
                    'educationLevel',
                    'workStatus',
                ]);

                // Keep compatibility for legacy participant fields, while rejecting unsafe keys.
                let mappedPath = fieldPathMap[normalizedField];
                if (!mappedPath) {
                    if (!allowedParticipantFields.has(normalizedField)) {
                        throw new Error(`Unsupported participant field: ${normalizedField}`);
                    }
                    mappedPath = `participant.${normalizedField}`;
                }

                let normalizedValue = editedParticulars;

                if (typeof normalizedValue === 'string') {
                    normalizedValue = normalizedValue.trim();
                }

                // Ensure date/time fields are always strings (never null or undefined)
                if (normalizedField === 'refundedDate' || normalizedField === 'refundedTime' || 
                    normalizedField === 'paymentDate' || normalizedField === 'paymentTime') {
                    normalizedValue = String(normalizedValue || '').trim();
                }

                // Accept ISO date input and store as DD/MM/YYYY for consistency.
                if (normalizedField === 'dateOfBirth' && typeof normalizedValue === 'string') {
                    const isoDate = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (isoDate) {
                        const [, yyyy, mm, dd] = isoDate;
                        normalizedValue = `${dd}/${mm}/${yyyy}`;
                    }
                }

                // Normalize common short-form values to the bilingual labels used in UI.
                if (normalizedField === 'residentialStatus') {
                    const value = String(normalizedValue || '').toLowerCase();
                    if (value === 'sc' || value === 'singapore citizen') normalizedValue = 'SC 新加坡公民';
                    if (value === 'pr' || value === 'permanent resident') normalizedValue = 'PR 永久居民';
                }

                if (normalizedField === 'gender') {
                    const value = String(normalizedValue || '').toLowerCase();
                    if (value === 'm' || value === 'male') normalizedValue = 'M 男';
                    if (value === 'f' || value === 'female') normalizedValue = 'F 女';
                }

                // Build update object - always update the mapped path
                const updateSet = {
                    [mappedPath]: normalizedValue,
                };

                const update = {
                    $set: updateSet,
                };
    
                // Call updateOne
                console.log("Executing MongoDB updateOne with filter:", filter, "and update:", update);
                const result = await table.updateOne(filter, update);
                console.log("Update Result:", result);
                console.log("Matched count:", result.matchedCount, "Modified count:", result.modifiedCount);
                
                // Log specific field updates for verification
                if (normalizedField === 'registrationStatus') {
                    console.log(`✅ [Registration Status Update] Field: ${normalizedField} | Mapped Path: ${mappedPath} | New Value: ${normalizedValue} | Matched: ${result.matchedCount} | Modified: ${result.modifiedCount}`);
                }
                
                return result;
            }
        } catch (error) {
            console.error("Error updating database:", error);
            throw error; // Re-throw the error to handle it in the calling function
        }
    }

    async updateParticipantRemarks(dbname, id, field, editedRemarks, rowCourseType) 
    {
        console.log("Update Request:", id, field, editedRemarks);

        const db = this.client.db(dbname);

        try {
            if (!db) return;

            const tableName = "Registration Forms";
            const table = db.collection(tableName);

            const filter = { _id: this._makeObjectId(id) };

            const normalizedField = String(field || '').trim();

            let mappedPath;

            // ===============================
            // OFFICIAL FIELDS (NOT participant)
            // ===============================
            const officialFields = new Set([
                'remarks'
            ]);

            if (officialFields.has(normalizedField)) {
                mappedPath = `official.${normalizedField}`;
            }

            // ===============================
            // PARTICIPANT FIELDS
            // ===============================
            else {
                const allowedParticipantFields = new Set([
                    'name',
                    'nric',
                    'contactNumber',
                    'email',
                    'gender',
                    'dateOfBirth',
                    'residentialStatus',
                    'race',
                    'postalCode',
                    'educationLevel',
                    'workStatus',
                ]);

                if (!allowedParticipantFields.has(normalizedField)) {
                    throw new Error(`Unsupported participant field: ${normalizedField}`);
                }

                mappedPath = `participant.${normalizedField}`;
            }

            // ===============================
            // NORMALIZE VALUE
            // ===============================
            let normalizedValue = editedRemarks;

            if (typeof normalizedValue === 'string') {
                normalizedValue = normalizedValue.trim();
            }

            // Ensure date/time fields are always strings
            if (
                normalizedField === 'refundedDate' ||
                normalizedField === 'refundedTime' ||
                normalizedField === 'paymentDate' ||
                normalizedField === 'paymentTime'
            ) {
                normalizedValue = String(normalizedValue || '').trim();
            }

            // Convert ISO date to DD/MM/YYYY
            if (normalizedField === 'dateOfBirth' && typeof normalizedValue === 'string') {
                const isoDate = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (isoDate) {
                    const [, yyyy, mm, dd] = isoDate;
                    normalizedValue = `${dd}/${mm}/${yyyy}`;
                }
            }

            // Normalize residential status
            if (normalizedField === 'residentialStatus') {
                const value = String(normalizedValue || '').toLowerCase();
                if (value === 'sc' || value === 'singapore citizen') {
                    normalizedValue = 'SC 新加坡公民';
                }
                if (value === 'pr' || value === 'permanent resident') {
                    normalizedValue = 'PR 永久居民';
                }
            }

            // Normalize gender
            if (normalizedField === 'gender') {
                const value = String(normalizedValue || '').toLowerCase();
                if (value === 'm' || value === 'male') normalizedValue = 'M 男';
                if (value === 'f' || value === 'female') normalizedValue = 'F 女';
            }

            // ===============================
            // UPDATE
            // ===============================
            const update = {
                $set: {
                    [mappedPath]: normalizedValue,
                },
            };

            console.log("Executing MongoDB updateOne:", filter, update);

            const result = await table.updateOne(filter, update);

            console.log("Update Result:", result);
            console.log("Matched:", result.matchedCount, "Modified:", result.modifiedCount);

            if (normalizedField === 'remarks') {
                console.log(
                    `✅ Remarks Updated | Path: ${mappedPath} | Value: ${normalizedValue}`
                );
            }

            return result;

        } catch (error) {
            console.error("Error updating database:", error);
            throw error;
        }
    }

    /**
     * Clears receipt/invoice number, payment date, and payment time for a registration.
     * Used when switching final payment method from Cash/PayNow to SkillsFuture.
     */
    async clearPaymentDetails(dbname, id) {
        var db = this.client.db(dbname);
        try {
            if (db) {
                var table = db.collection("Registration Forms");
                const filter = { _id: this._makeObjectId(id) };
                const update = {
                    $set: {
                        "official.receiptNo": "",
                        "official.date": "",
                        "official.time": "",
                    }
                };
                const result = await table.updateOne(filter, update);
                return result;
            }
        } catch (error) {
            console.log("Error clearing payment details:", error);
        }
    }

    async updateRegistrationDocumentNumber(dbname, id, documentNumber) {
        const db = this.client.db(dbname);
        try {
            if (!db) {
                return { acknowledged: false, error: 'Database connection failed' };
            }

            const table = db.collection('Registration Forms');
            const filter = { _id: this._makeObjectId(id) };
            const update = {
                $set: {
                    'official.receiptNo': documentNumber || ''
                }
            };

            const result = await table.updateOne(filter, update);
            return {
                acknowledged: result.acknowledged,
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
            };
        } catch (error) {
            console.error('Error updating registration document number:', error);
            return { acknowledged: false, error: error.message };
        }
    }

    async updatePaymentOfficialUse(dbname, id, name, date, time, status) {
        name = sanitizeStaffName(name);
        var db = this.client.db(dbname); // return the db object
        try {
            if (db) {
                console.log("Update Payment Official Use123:", id, name, date, time, status);
                var tableName = "Registration Forms";
                var table = db.collection(tableName);
    
                // Use updateOne to update a single document
                const filter = { _id: this._makeObjectId(id) };
    
                // Fetch the current record to check old status and payment method
                const currentRecord = await table.findOne(filter);
                const oldStatus = currentRecord?.status || '';
                const paymentMethod = currentRecord?.finalPaymentMethod || currentRecord?.paymentMethod || '';
                const registrationStatus = String(currentRecord?.registrationStatus || '').trim();
    
                // Define the update object conditionally based on status
                let update = null;
                
                console.log("Update Payment Official Use:", { status, oldStatus, paymentMethod, registrationStatus });
                const shouldConfirmSlot = status === "Paid" || status === "SkillsFuture Done";
                const isToRefundToRefundedForSkillsFuture = oldStatus === "To refund" && status === "Refunded" && paymentMethod === "SkillsFuture";
                const shouldPreserveConfirmationStatusForRefund = status === "Refunded" && (registrationStatus === "Cancellation for duplication" || registrationStatus === "Withdrawn");
                
                if (status === "Paid") {
                    console.log("OK");
                    update = {
                        $set: {
                            "status": status,
                            "official.name": name,
                            "official.date": date,
                            "official.time": time,
                            ...(shouldConfirmSlot ? { "official.registration_status": "Confirmed Slot" } : {}),
                        }
                    };
                }
                else if (status === "Generating SkillsFuture Invoice") {
                    // Only update the status field — do NOT record staff name, payment date, or payment time.
                    // These fields are only set when the final status "SkillsFuture Done" is applied.
                    update = {
                        $set: {
                            "status": status,
                        }
                    };
                }
                else if (status === "SkillsFuture Done") {
                    // SkillsFuture Done: Now record the final date/time and staff name for the completed transaction
                    update = {
                        $set: {
                            "status": status,
                            "official.name": name,
                            "official.date": date,
                            "official.time": time,
                            ...(shouldConfirmSlot ? { "official.registration_status": "Confirmed Slot" } : {}),
                        }
                    };
                }
                else if(status === "Cancelled")
                {
                    update = {
                        $set: {
                            "status": status,
                            "official.confirmed": false
                        }
                    };
                }
                else if (status === "Refunded") {
                    // When refunding (for Cancelled for duplication or Withdrawn registrations):
                    // 1. Update payment status to "Refunded"
                    // 2. Record staff member name and refund date/time for audit trail
                    // 3. ❌ DO NOT modify official.confirmed - leave it unchanged
                    // 4. ❌ DO NOT modify official.date or official.time (original payment info)
                    // 5. ❌ DO NOT modify official.receiptNo (original receipt/invoice info)
                    // 
                    // The confirmation status toggle should remain in its current state when refunding
                    // only the payment status updates to "Refunded" and refund date/time is recorded
                    const refundUpdate = {
                        "status": status,
                        "official.name": name,
                    };
                    
                    // Add refund date/time if provided
                    if (date !== undefined) refundUpdate["official.refundedDate"] = date;
                    if (time !== undefined) refundUpdate["official.refundedTime"] = time;
                
                    
                    update = {
                        $set: refundUpdate
                    };
                }
                else if (status === "To refund") {
                    // When marking payment as "To refund" (pending refund processing):
                    // Set confirmed = false to indicate payment is not confirmed while refund is pending
                    // ⚠️ NOTE: This is different from "Refunded" status where confirmed is left unchanged
                    const toRefundUpdate = {
                        "status": status,
                        "official.confirmed": false,  // Mark as unconfirmed while refund is processing
                        "official.name": name,
                    };
                    if (date !== undefined) toRefundUpdate["official.date"] = date;
                    if (time !== undefined) toRefundUpdate["official.time"] = time;
                    update = {
                        $set: toRefundUpdate
                    };
                }
                else {
                    update = {
                        $set: {
                            "status": status,
                            "official.name": name,
                            "official.confirmed": false
                        }
                    };
                }
    
                // Call updateOne
                const result = await table.updateOne(filter, update);
    
                return result;
            }
        } catch (error) {
            console.log("Error updating database:", error);
        }
    }

    async updateConfirmationOfficialUse(dbname, id, name, date, time, status) {
        console.log("Update Confirmation Official Use:", id, name, date, time, status);
        name = sanitizeStaffName(name);
        var db = this.client.db(dbname); // return the db object
        try {
            if (db) {
                var tableName = "Registration Forms";
                var table = db.collection(tableName);
        
                // Use updateOne to update a single document
                const filter = { _id: this._makeObjectId(id) };

                // Define the update object conditionally based on confirmation value:
                // - Confirming (true): only update official fields; leave status and receiptNo untouched
                //   (frontend's subsequent updatePaymentStatus call handles the status change)
                // - Un-confirming (false): update official fields AND reset status to Pending + clear receiptNo
                const normalizedStatus = (() => {
                    if (status === true || status === false) return status;
                    const normalized = String(status ?? '').trim().toLowerCase();
                    if (normalized === 'confirmed' || normalized === 'yes' || normalized === 'true' || normalized === '1') return true;
                    if (normalized === 'not confirmed' || normalized === 'no' || normalized === 'false' || normalized === '0') return false;
                    return false;
                })();

                let update;
                if (normalizedStatus === true) {
                    // Confirming a participant only flips the confirmation flag.
                    // Payment fields (official.name / official.date / official.time) represent
                    // the actual PAYMENT, and must stay empty until the payment is completed
                    // ("Paid" for Cash/PayNow, "SkillsFuture Done" for SkillsFuture).
                    update = {
                        $set: {
                            "official.confirmed": true,
                        }
                    };
                } else {
                    update = {
                        $set: {
                            "official.confirmed": false,
                            "official.name": "",
                            "official.date": "",
                            "official.time": "",
                            "status": "Pending",
                            "official.receiptNo": ""
                        }
                    };
                }
        
                // Call updateOne
                const result = await table.updateOne(filter, update);
        
                return result;
            }
        } catch (error) {
            console.log("Error updating database:", error);
            throw error; // rethrow the error to handle it at the calling function
        }
    }
    

    async updatePaymentMethod(dbname, id, newPaymentMethod, staff, date, time) 
    {
        staff = sanitizeStaffName(staff);
        var db = this.client.db(dbname); // return the db object ok
        try {
            console.log("Id:", id);
            console.log("New Payment Method:", newPaymentMethod);
            
            if (!db) {
                console.error("Database connection failed");
                return {
                    acknowledged: false,
                    modifiedCount: 0,
                    updatedDocument: null,
                    error: "Database connection failed"
                };
            }
            
            var tableName = "Registration Forms";
            var table = db.collection(tableName);
    
            // Use updateOne to update a single document
            const filter = { _id: this._makeObjectId(id) };

            // ─────────────────────────────────────────────────────────────────────────
            // SEQUENTIAL WORKFLOW - STEP 1 (Participant Update)
            // ─────────────────────────────────────────────────────────────────────────
            // This is the FIRST step: Participant indicates their payment method.
            // UPDATE:
            // - course.payment (participant's choice)
            // - course.finalPaymentMethod (auto-sync to participant's choice)
            // - status → "Pending" (default payment status based on new payment method)
            // - official.registration_status → "Submitted" (default registration status)
            // - official.confirmed → false (reset confirmation)
            // 
            // This ensures that when payment method changes:
            // - Cash/PayNow → Default status is "Pending" (ready for approval)
            // - SkillsFuture → Default status is "Pending" (ready for approval)
            // 
            // DO NOT UPDATE:
            // - Receipt numbers, dates, times (cleared when method changes)
            // - Confirmed flag once SkillsFuture invoice is generated
            // ─────────────────────────────────────────────────────────────────────────
            
            var update = {
                $set: {
                    "course.payment": newPaymentMethod,
                    "course.finalPaymentMethod": newPaymentMethod,  // Auto-sync
                    "status": "Pending",  // Default payment status based on method change
                    "official.registration_status": "Submitted",  // Default registration status
                    "official.confirmed": false,  // Reset confirmation flag
                }
            };
            
            // Call updateOne
            const result = await table.updateOne(filter, update);
            console.log("💳 [Payment Method Update] STEP 1 - Participant Changed Method:", {
                newPaymentMethod,
                statusSet: "Pending",
                official_registrationStatusSet: "Submitted",
                confirmedReset: false,
                modifiedCount: result.modifiedCount
            });
    
            // Fetch and return the full updated document so frontend has all fields including remarks
            const updatedDocument = await table.findOne(filter);
            console.log("✅ [Payment Method Update] Document updated:", {
                paymentMethod: updatedDocument?.course?.payment,
                finalPaymentMethod: updatedDocument?.course?.finalPaymentMethod,
                status: updatedDocument?.status,
                registration_status: updatedDocument?.official?.registration_status
            });
            
            return {
                acknowledged: result.acknowledged,
                modifiedCount: result.modifiedCount,
                updatedDocument: updatedDocument
            };
        } catch (error) {
            console.error("Error updating payment method:", error);
            return {
                acknowledged: false,
                modifiedCount: 0,
                updatedDocument: null,
                error: error.message
            };
        }
    }

    async updateRegistrationEntry(dbname, participantDetails) {
        var db = this.client.db(dbname); // return the db object ok
        try {
            if (db) {
                var tableName = "Registration Forms";
                var table = db.collection(tableName);

                console.log("Participants Details:", participantDetails);
    
                // Use updateOne to update a single document
                const filter = { _id: this._makeObjectId(participantDetails.id) };
    
                // Define the update object conditionally based on status
                var update = {
                            $set: {
                                "participant.name": participantDetails.name,
                                "participant.nric": participantDetails.nric,
                                "participant.residentialStatus": participantDetails.residentialStatus,
                                "participant.race": participantDetails.race,
                                "participant.gender": participantDetails.gender,
                                "participant.contactNumber": participantDetails.contactNumber,
                                "participant.email": participantDetails.email,
                                "participant.postalCode": participantDetails.postalCode,
                                "participant.educationLevel": participantDetails.educationLevel,
                                "participant.workStatus": participantDetails.workStatus
                            }
                        };
    
                // Call updateOne
                const result = await table.updateOne(filter, update);
    
                return result;
            }
        } catch (error) {
            console.log("Error updating database:", error);
        }
    }
    
    async deleteAccount(databaseName, collectionName, id) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const filter = { _id: this._makeObjectId(id) }; // Find document by ID
            const result = await table.deleteOne(filter);
    
            if (result.deletedCount === 1) {
                console.log("Successfully deleted the document.");
                return { success: true, message: "Document deleted successfully." };
            } else {
                console.log("No document found with that ID.");
                return { success: false, message: "No document found with that ID." };
            }
        } catch (error) {
            console.log("Error deleting document:", error);
            return { success: false, error };
        }
    }
    
    async getNextReceiptNumber(databaseName, collectionName, course, paymentMethod) {
        const db = this.client.db(databaseName);
        const collection = db.collection(collectionName);

        console.log("Generating receipt number for course:", collectionName, course, paymentMethod);

        // A SkillsFuture claim is an INVOICE, not a receipt. Route it to the invoice
        // generator so the item code (SFC) and the running series come from the
        // Invoices collection instead of producing a receipt-style NSA number.
        const normalizedPaymentMethod = String(paymentMethod ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (normalizedPaymentMethod === 'SKILLSFUTURE' || normalizedPaymentMethod === 'SKILLSFUTUREPAYMENT') {
            console.log("Payment method is SkillsFuture — generating an INVOICE number instead of a receipt.");
            return this.getNextInvoiceNumber(databaseName, 'Invoices', { course, paymentMethod });
        }

        const { courseLocation, courseType, courseEngName } = course || {};
        const centreLocation = courseLocation;

        const currentYear = parseInt(getConfiguredYear().toString().slice(-2));
        const fullYear = getConfiguredYear();

        // The running series number is the highest number across the ENTIRE Receipts
        // collection (not per-location), so the next receipt is always last + 1
        // (00001 when none exist). Match both receiptNo and receiptNumber field names.
        const existingReceipts = await collection.find({
            $or: [
                { receiptNo: { $regex: '^ECSS-' } },
                { receiptNumber: { $regex: '^ECSS-' } }
            ]
        }).toArray();

        const formattedReceiptNumber = await generateReceiptNumber({
            course,
            paymentMethod,
            existingReceipts,
            currentYear,
            fullYear,
        });

        return formattedReceiptNumber;
    }

    async getNextMarriagePrepReceiptNumber(databaseName, collectionName, courseLocation, centreLocation, courseType, courseEngName) {
        const db = this.client.db(databaseName);
        const collection = db.collection(collectionName);
    
        // Validate that this is indeed a Marriage Preparation Programme Group Class - using flexible matching
        const isMarriagePrep = courseType && courseType.trim() === "Marriage Preparation Programme";
        const isGroupClass = courseEngName && (
            courseEngName.includes("Marriage Preparation Programme Group Class") ||
            (courseEngName.includes("P/E MPrep") && courseEngName.includes("Marriage Preparation Programme"))
        );
        
        if (!isMarriagePrep || !isGroupClass) {
            throw new Error("This function is only for Marriage Preparation Programme Group Class");
        }
    
        // Get current month and year
        const currentDate = new Date();
        const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // 01-12
        const currentYear = currentDate.getFullYear().toString().slice(-2); // Last 2 digits of year
    
        // Create the receipt prefix: PE(Group)_courseLocation_MMYY
        const receiptPrefix = `PE(Group)_${courseLocation}_${currentMonth}${currentYear}`;
        
        console.log("Receipt Prefix:", receiptPrefix);
    
        try {
            // Create regex pattern to find existing receipts with this prefix
            // Escape special characters in the prefix for regex
            const escapedPrefix = receiptPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regexPattern = `^${escapedPrefix}_\\d+$`;
            
            console.log("Regex Pattern for Marriage Prep:", regexPattern);
    
            // Find all existing receipts matching this pattern for the specific location
            const existingReceipts = await collection.find({
                receiptNo: { $regex: regexPattern },
                location: centreLocation
            }).toArray();
    
            console.log("Existing Marriage Prep Receipts:", existingReceipts);
    
            // Extract running numbers from existing receipts
            const runningNumbers = existingReceipts.map(receipt => {
                // Create regex to extract the running number
                const numberRegex = new RegExp(`^${escapedPrefix}_(\\d+)$`);
                const match = receipt.receiptNo.match(numberRegex);
                
                if (match && match[1]) {
                    const number = parseInt(match[1], 10);
                    console.log(`Extracted running number: ${number} from ${receipt.receiptNo}`);
                    return number;
                }
                return null;
            }).filter(num => num !== null && !isNaN(num));
    
            console.log("Valid Running Numbers:", runningNumbers);
    
            // Determine the next running number
            let nextRunningNumber;
            if (runningNumbers.length === 0) {
                // No existing receipts, start with 001
                nextRunningNumber = 1;
                console.log("No existing receipts found, starting with 001");
            } else {
                // Find the maximum and increment
                const maxNumber = Math.max(...runningNumbers);
                nextRunningNumber = maxNumber + 1;
                console.log(`Max existing number: ${maxNumber}, next number: ${nextRunningNumber}`);
            }
    
            // Format the running number with leading zeros (3 digits)
            const formattedRunningNumber = String(nextRunningNumber).padStart(3, '0');
            
            // Create the complete receipt number
            const completeReceiptNumber = `${receiptPrefix}_${formattedRunningNumber}`;
            
            console.log("Generated Marriage Prep Receipt Number:", completeReceiptNumber);
    
            return completeReceiptNumber;
    
        } catch (error) {
            console.error("Error generating Marriage Prep receipt number:", error);
            throw new Error(`Failed to generate Marriage Preparation Programme receipt number: ${error.message}`);
        }
    }
    
    getNextReceiptNumberForSkillsFuture(centreReceiptNumbers, centreLocation, centreSuffix, currentYear) 
    {
        // centreReceiptNumbers contains ONLY the current year's receipt numbers for this centre
        // (filtered upstream), so year reset is automatic:
        // if it's a new year, centreReceiptNumbers will be empty and we start from 1.
        let nextNumber;
        console.log("Debug - Centre Receipt Numbers:", centreReceiptNumbers, "Centre Location:", centreLocation, "Current Year:", currentYear);

        if (centreReceiptNumbers.length > 0) {
            // Continue from the last invoice number for this centre + year
            nextNumber = Math.max(...centreReceiptNumbers) + 1;
        } else if (currentYear === 25) {
            // 2025 first-time setup: continue from historical starting numbers per centre
            if (centreLocation === "CT Hub")                              nextNumber = 109;
            else if (centreLocation === "Tampines 253 Centre")            nextNumber = 91;
            else if (centreLocation === "Pasir Ris West Wellness Centre") nextNumber = 13;
            else if (centreLocation === "Sree Narayana Mission")          nextNumber = 1;
            else if (centreLocation === "Renewal Christian Church")       nextNumber = 16;
            else                                                           nextNumber = 1;
        } else {
            // New year or new centre: always reset to 1
            nextNumber = 1;
        }

        console.log("Debug - Next Number before formatting:", nextNumber);

        const paddedNumber = nextNumber.toString().padStart(3, '0');
        return `ECSS/SFC/${centreSuffix}${paddedNumber}/${currentYear}`;
    }
    
    
    getNextReceiptNumberForPayNowCash(courseLocation, existingReceipts, centreLocation, currentYear) {
        let nextNumber;
        const fullYear = getConfiguredYear(); // 4-digit year from RECEIPT_YEAR_CONFIG
    
        console.log("=== PayNow/Cash Receipt Generation Debug ===");
        console.log("Course Location:", courseLocation);
        console.log("Centre Location:", centreLocation);
        console.log("Current Year:", currentYear);
        console.log("Full Year:", fullYear);
        console.log("Existing Receipts Count:", existingReceipts.length);
        console.log("Existing Receipts:", existingReceipts.map(r => ({ receiptNo: r.receiptNo, location: r.location })));

        // Filter by location AND current year (new format: yyyy - CourseLocation - NNNN)
        const filteredReceipts = existingReceipts.filter(receipt =>
            receipt.location === centreLocation &&
            receipt.receiptNo.startsWith(`${fullYear} - `)
        );
        console.log("Filtered Receipts for Centre Location (current year):", filteredReceipts.length);

        // Extract the numeric part (last segment after the final " - ")
        const centreReceiptNumbers = filteredReceipts.map(receipt => {
                const parts = receipt.receiptNo.split(" - ");
                const receiptNumberMatch = parts[parts.length - 1]; // Last part = number e.g. "0001"
                return receiptNumberMatch ? parseInt(receiptNumberMatch, 10) : null;
            }).filter(num => num !== null && !isNaN(num));

        //console.log("Centre Receipt Numbers11:", centreReceiptNumbers);

        const maxReceiptNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) : 0;
    
        console.log("Latest Receipt Numbers for", centreLocation, ":", maxReceiptNumber);
        console.log("Centre Receipt Numbers:", centreReceiptNumbers);
        
       // Handle specific logic for each centre location
        if (centreLocation === "Tampines 253 Centre") {
            // Custom logic for Tampines 253 Centre
            nextNumber =  maxReceiptNumber + 1;
        } 
        else if (centreLocation === "Pasir Ris West Wellness Centre") {
            // Custom logic for Pasir Ris West Centre
            nextNumber =  maxReceiptNumber + 1;
        } 
        else if (centreLocation === "CT Hub") {
            // For CT Hub, it uses the same logic as the others
            nextNumber =  maxReceiptNumber + 1;
        } 
    
        else if (centreLocation === "Renewal Christian Church") {
            // For Renewal Christian Church, it uses the same logic as the others
            console.log("This is Renewal Christian Church");
            nextNumber =  maxReceiptNumber + 1;
        } 
        else if (centreLocation === "Sree Narayana Mission") {
            // For Sree Narayana Mission, ensure proper incremental numbering
            console.log("This is Sree Narayana Mission - PayNow/Cash");
            // If no existing receipts, start from 1, otherwise increment from the maximum
            nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 1;
        } 
        else {
            // Default case for any other centre location
            nextNumber = maxReceiptNumber + 1;
        }
    
        // Format the next number with consistent 4-digit padding (0001, 0002, etc.)
        let formattedNextNumber = String(nextNumber).padStart(4, '0');
        console.log(`Generated Receipt Number for ${centreLocation}: ${fullYear} - ${courseLocation} - ${formattedNextNumber}`);
    
        // Return the formatted receipt number in the format: "yyyy - courseLocation - 0001"
        return `${fullYear} - ${courseLocation} - ${formattedNextNumber}`;
    }
     
    async newInvoice(databaseName, collectionName, invoiceNumber, month, username, date, time) {
        try {
            // Connect to the database and collection
            const db = this.client.db(databaseName);
            const collection = db.collection(collectionName);
    
            // Prepare the invoice document to insert
            const invoiceDocument = {
                invoiceNumber: invoiceNumber,
                month: month,
                username: username,
                date: date,
                time: time,
            };
    
            // Insert the document into the collectionm
            const result = await collection.insertOne(invoiceDocument);
    
            console.log("Invoice inserted successfully:", result.insertedId);
            return { success: true, id: result.insertedId }; // Return success with the inserted document ID
        } catch (error) {
            console.error("Error inserting new invoice:", error);
            return { success: false, error: "Failed to insert new invoice. Please try again." }; // Return failure with an error message
        }
    }

    async getNextInvoiceNumber(databaseName, collectionName, options = {}) {
        try {
            const db = this.client.db(databaseName);
            const collection = db.collection(collectionName);

            const year = new Date().getFullYear().toString().slice(-2); // e.g. "26"
            // The running series number is the highest number across the ENTIRE Invoices
            // collection, so the next invoice is always last + 1 (00001 when none exist).
            // Invoices are stored under invoiceNo; match invoiceNumber too for safety.
            const existingInvoices = await collection.find({
                $or: [
                    { invoiceNo: { $regex: '^ECSS-' } },
                    { invoiceNumber: { $regex: '^ECSS-' } }
                ]
            }).toArray();

            console.log("Current Invoices:", existingInvoices);
            const generatedInvoiceNumber = await getNextInvoiceNumber({
                existingInvoices,
                year,
                itemCode: options.itemCode,
                course: options.course,
                paymentMethod: options.paymentMethod,
            });
            console.log("Latest Invoice Number:", generatedInvoiceNumber);
            return generatedInvoiceNumber;
        } catch (error) {
            console.error("Error in getNextInvoiceNumber:", error);
            throw new Error("Unable to generate the next invoice number. Please try again.");
        }
    }

    async getInvoiceNumber(databaseName, collectionName, selectedMonth) {
        try {
            const db = this.client.db(databaseName);
            const collection = db.collection(collectionName);
    
            // Query to find the document with the specified month
            const invoice = await collection.findOne({ month: selectedMonth });
            console.log(invoice);
    
            if (!invoice) {
                console.log(`No invoice found for the month: ${selectedMonth}`);
                return null; // Return null if no document matches the query
            }
    
            console.log("Found Invoice:", invoice.invoiceNumber);
            return invoice.invoiceNumber; // Return the found document
        } catch (error) {
            console.error("Error in getInvoiceNumber:", error);
            throw new Error("Unable to retrieve the invoice. Please try again.");
        }
    }
    
    async deleteAccount(databaseName, collectionName, id) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const filter = { _id: this._makeObjectId(id) }; // Find document by ID
            const result = await table.deleteOne(filter);
    
            if (result.deletedCount === 1) {
                console.log("Successfully deleted the document.");
                return { success: true, message: "Document deleted successfully." };
            } else {
                console.log("No document found with that ID.");
                return { success: false, message: "No document found with that ID." };
            }
        } catch (error) {
            console.log("Error deleting document:", error);
            return { success: false, error };
        }
    }

    async deleteFromDatabase(databaseName, collectionName, id)
     {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const filter = { 
                registration_id: this._makeObjectId(id) }; // Find document by ID
            const result = await table.deleteOne(filter);
    
            if (result.deletedCount === 1) {
                console.log("Successfully deleted the document.");
                return { success: true, message: "Document deleted successfully." };
            } else {
                console.log("No document found with that ID.");
                return { success: false, message: "No document found with that ID." };
            }
        } catch (error) {
            console.log("Error deleting document:", error);
            return { success: false, error };
        }
    }

    async deleteFromParticipant(databaseName, collectionName, id)
     {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const filter = { 
                _id: this._makeObjectId(id) }; // Find document by ID
            const result = await table.deleteOne(filter);
    
            if (result.deletedCount === 1) {
                console.log("Successfully deleted the document.");
                return { success: true, message: "Document deleted successfully." };
            } else {
                console.log("No document found with that ID.");
                return { success: false, message: "No document found with that ID." };
            }
        } catch (error) {
            console.log("Error deleting document:", error);
            return { success: false, error };
        }
    }
    
    async portOverParticipant(databaseName, collectionName, id, selectedLocation) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
      
        try {
          const filter = { _id: this._makeObjectId(id) }; // Find document by ID
          const update = { $set: { "course.courseLocation": selectedLocation } }; // Update nested field
      
          // Perform the update operation
          const result = await table.updateOne(filter, update);
      
          if (result.modifiedCount === 1) {
            console.log("Successfully ported over the document.");
            return { success: true, message: "Document ported over successfully." };
          } else if (result.matchedCount === 0) {
            console.log("No document found with that ID.");
            return { success: false, message: "No document found with that ID." };
          } else {
            console.log("Document found but not modified.");
            return { success: false, message: "Document was found but no changes were made." };
          }
        } catch (error) {
          console.log("Error porting over document:", error);
          return { success: false, error: error.message || error };
        }
    }

    async sendDetails(databaseName, collectionName, id) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            const filter = { _id: this._makeObjectId(id) }; 
            const update = { $set: { "sendingWhatsappMessage": true } };
    
            const existingDoc = await table.findOne(filter);
            console.log("Existing Document Before Update:", existingDoc);
    
            const result = await table.updateOne(filter, update);
            
            if (result.matchedCount === 0) {
                console.log("No document found with the given ID.");
                return { success: false, message: "No document found." };
            }
            
            if (result.modifiedCount === 1) {
                console.log("Successfully updated the document.");
                return { success: true, message: "Send Payment Details successfully." };
            } else {
                console.log("Document found but not modified.");
                return { success: false, message: "Document exists but no changes were made." };
            }
        } catch (error) {
            console.log("Error updating document:", error);
            return { success: false, error: error.message || error };
        }
    }
    
    async massImport(databaseName, collectionName, formattedData) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            // Insert many documents at once
            const result = await table.insertMany(formattedData);
    
            console.log(`${result.insertedCount} documents were inserted.`);
            return { success: true, message: `${result.insertedCount} documents inserted successfully.` };
        } catch (error) {
            console.log("Error inserting documents:", error);
            return { success: false, error };
        }
    }
    
      

    async deleteAccessRights(databaseName, collectionName, id) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            // Using bracket notation to access 'Account ID' under 'Account Details'
            const filter = { "Account Details.Account ID": this._makeObjectId(id) }; 
    
            const result = await table.deleteOne(filter);
    
            if (result.deletedCount === 1) {
                console.log("Successfully deleted the access right.");
                return { success: true, message: "Document deleted successfully." };
            } else {
                console.log("No document found with that ID.");
                return { success: false, message: "No document found with that ID." };
            }
        } catch (error) {
            console.log("Error deleting document:", error);
            return { success: false, error };
        }
    }
      
    async addRefundedDate(databaseName, collectionName, id, date, time) 
    {
        //console.log("Database:::", databaseName, collectionName, id, date);
        try {
            const db = this.client.db(databaseName);
            const table = db.collection(collectionName);
    
            const result = await table.updateOne(
                { _id: this._makeObjectId(id) }, // Convert `id` to ObjectId
                { $set: { "official.refundedDate": date, "official.refundedTime": time } } // Add `official.refundedDate` and `official.refundedTime`
            );
    
            console.log("Update Result:", result);
            return result;
        } catch (error) {
            console.error("Error updating refunded date:", error);
            throw error;
        }
    }

          
    async addCancellationRemarks(databaseName, collectionName, id, remarks) 
    {
        //console.log("Database:::", databaseName, collectionName, id, date);
        try {
            const db = this.client.db(databaseName);
            const table = db.collection(collectionName);

            const filter = { _id: this._makeObjectId(id) };
            const incoming = String(remarks ?? '').trim();

            // Explicit clear path.
            if (!incoming) {
                const clearResult = await table.updateOne(filter, { $set: { "official.remarks": '' } });
                console.log("Update Result:", clearResult);
                return clearResult;
            }

            const row = await table.findOne(filter, { projection: { "official.remarks": 1 } });
            const existing = String(row?.official?.remarks || '').trim();

            let nextRemarks;
            // If the incoming text is already a fully-formatted remarks block — i.e.
            // role-prefixed ("[System]: 1) ..."), bare-numbered ("1) ...") or a
            // multi-line block — overwrite it as-is. This is what the RemarksEditor
            // sends on add/edit/remove, and overwriting prevents doubled prefixes
            // ("[System]: 1) [System]: 1) ...") and stale lines after a removal.
            const looksLikeFormattedBlock =
                /^\[[^\]]*\]:\s*\d+\)/.test(incoming) ||
                /^\d+\)\s+/.test(incoming) ||
                /\r?\n/.test(incoming);
            if (looksLikeFormattedBlock) {
                nextRemarks = incoming;
            } else if (!existing) {
                nextRemarks = `1) ${incoming}`;
            } else {
                const lines = existing
                    .split(/\r?\n/)
                    .map((line) => String(line || '').trim())
                    .filter(Boolean);

                let maxNo = 0;
                for (const line of lines) {
                    const m = line.match(/^(\d+)\)\s+/);
                    if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10) || 0);
                }

                nextRemarks = `${existing}\n${maxNo + 1}) ${incoming}`;
            }
    
            const result = await table.updateOne(filter, { $set: { "official.remarks": nextRemarks } });
    
            console.log("Update Result:", result);
            return result;
        } catch (error) {
            console.error("Error updating cancellation remarks:", error);
            throw error;
        }
    }
    
    

    async updateAccessRight(databaseName, collectionName, id1, updateAccessRight) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
    
        try {
            // Define your filter to find the correct document
            const filter = { _id: new ObjectId(id1) };
            console.log("Filter:", filter);

            //console.log("Update Access Right:", updateAccessRight);

        const keyMapping = {
                accounts: "Account",
                regPay: "Registration And Payment",
                qRCode: "QR Code",
                courses: "Courses",
                reports: "Reports",
                attendance: "Attendances",
                fitness: "Fitness", 
                fundraising: "Fundraising",
                membership: "Membership"
              };
    
           // Exclude _id from the updateAccessRight if it exists
            const { id, accType, name, sn, ...filteredUpdateAccessRight } = updateAccessRight;
            
            // Remove duplicate lowercase keys that conflict with proper case versions
            const cleanedData = {};
            for (const [key, value] of Object.entries(filteredUpdateAccessRight)) {
                const mappedKey = keyMapping[key] || key;
                // Only add if we don't already have this key (prevents duplicates)
                if (!cleanedData[mappedKey]) {
                    cleanedData[mappedKey] = value;
                }
            }
            
            console.log("Cleaned update data:", cleanedData);
    
            // Prepare the update object
            const update = {
                $set: {}
            };

    
            // Add any other fields from cleanedData
            for (const key in cleanedData) {
                update.$set[key] = cleanedData[key];
            }
    
            console.log("Update object:", update);
    
            // Perform the update operation
            const result = await table.updateOne(filter, update);
            console.log("Update Result:", result);
    
            if (result.modifiedCount === 1) {
                console.log("Successfully updated the access right.");
                return { success: true, message: "Document updated successfully." };
            } else {
                console.log("No document found with that ID or no changes made.");
                return { success: false, message: "No document found with that ID or no changes made." };
            }
        } catch (error) {
            console.log("Error updating document:", error);
            return { success: false, error };
        }
    }

    async findAllParticipants(databaseName, collectionName) 
    {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
        const participantsSet = new Set();
        var participantsDetails = [];
        var duplicateStats = {
            totalRecords: 0,
            uniqueParticipants: 0,
            duplicatesRemoved: 0
        };

        try {
            // Retrieve all participants from the collection
            const participants = await table.find({}).toArray();
            duplicateStats.totalRecords = participants.length;
            
            console.log(`Found ${participants.length} participants in ${collectionName}`);
            
            for (const participant of participants) {
                const participantDetails = participant.participant;
                
                if (!participantDetails) {
                    console.log("Warning: Participant details not found in document:", participant._id);
                    continue;
                }
                
                // Create a unique key based on the entire participantDetails object
                const participantDetailsKey = JSON.stringify(participantDetails);
                
                if (!participantsSet.has(participantDetailsKey)) {
                    participantsSet.add(participantDetailsKey);
                    participantsDetails.push({
                        participantDetails,
                        metadata: {
                            documentId: participant._id,
                            registrationDate: participant._id.getTimestamp()
                        }
                    });
                } else {
                    console.log(`Duplicate participant details found for document: ${participant._id}`);
                    console.log("Duplicate participant details:", JSON.stringify(participantDetails, null, 2));
                }
            }
            
            // Calculate final statistics
            duplicateStats.uniqueParticipants = participantsDetails.length;
            duplicateStats.duplicatesRemoved = duplicateStats.totalRecords - duplicateStats.uniqueParticipants;
            
            // Log comprehensive summary
            console.log("=== DUPLICATE PROCESSING SUMMARY ===");
            console.log(`Total records processed: ${duplicateStats.totalRecords}`);
            console.log(`Unique participants retained: ${duplicateStats.uniqueParticipants}`);
            console.log(`Total duplicates removed: ${duplicateStats.duplicatesRemoved}`);
            console.log("=====================================");
            
            return {
                participants: participantsDetails,
                statistics: duplicateStats
            };
            
        } catch (error) {
            console.error("Error retrieving all participants:", error);
            throw error;
        }   
    }

    // Close the connection to the database - only for application shutdown
    async close() {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            this.connectionPromise = null;
            console.log("MongoDB connection closed.");
        }
    }

    // Method for request-level cleanup (doesn't actually close connection)
    async cleanup() {
        // In a connection pool model, we don't close connections after each request
        // The connection pool handles connection lifecycle automatically
        console.log("Request completed - connection pool maintained");
    }

    // Enhanced method to find participants by NRIC, phone, and name with smart matching
    async findParticipantByNricPhoneAndName(databaseName, collectionName, nric, phone, name) {
        const db = this.client.db(databaseName);
        const table = db.collection(collectionName);
        
        try {
            // First check for exact matches (highest priority)
            if (nric && nric.trim() && phone && phone.trim()) {
                const exactMatch = await table.find({ 
                    "nric": { $regex: new RegExp(`^${nric.trim()}$`, 'i') },
                    "phone": phone.trim()
                }).toArray();
                
                if (exactMatch.length > 0) {
                    return {
                        success: true,
                        found: true,
                        participants: exactMatch,
                        duplicateType: "both",
                        message: `Found exact match with same NRIC and phone number`,
                        canUpdate: true,
                        recommendation: 'UPDATE_EXISTING_PROFILE'
                    };
                }
            }
            
            // Check for NRIC duplicates only
            if (nric && nric.trim()) {
                const nricResults = await table.find({ 
                    "nric": { $regex: new RegExp(`^${nric.trim()}$`, 'i') }
                }).toArray();
                
                if (nricResults.length > 0) {
                    return {
                        success: true,
                        found: true,
                        participants: nricResults,
                        duplicateType: "nric",
                        message: `Found ${nricResults.length} existing participant(s) with same NRIC`,
                        canUpdate: false,
                        recommendation: 'BLOCK_REGISTRATION_NRIC_CONFLICT'
                    };
                }
            }
            
            // Check for phone duplicates only
            if (phone && phone.trim()) {
                const phoneResults = await table.find({ 
                    "phone": phone.trim()
                }).toArray();
                
                if (phoneResults.length > 0) {
                    return {
                        success: true,
                        found: true,
                        participants: phoneResults,
                        duplicateType: "phone",
                        message: `Found ${phoneResults.length} existing participant(s) with same phone number`,
                        canUpdate: false,
                        recommendation: 'MANUAL_REVIEW_PHONE_CONFLICT'
                    };
                }
            }

            // Smart name similarity checking using regex patterns
            if (name && name.trim()) {
                const nameVariations = this.generateNameVariations(name.trim());
                const nameQuery = {
                    $or: nameVariations.map(variation => ({
                        "participantName": { $regex: new RegExp(variation, 'i') }
                    }))
                };
                
                const nameResults = await table.find(nameQuery).toArray();
                
                if (nameResults.length > 0) {
                    // Filter out exact matches we might have already found
                    const filteredResults = nameResults.filter(participant => {
                        const sameNric = nric && participant.nric && 
                            participant.nric.toLowerCase() === nric.toLowerCase();
                        const samePhone = phone && participant.phone && 
                            participant.phone === phone;
                        return !(sameNric || samePhone);
                    });

                    if (filteredResults.length > 0) {
                        return {
                            success: true,
                            found: true,
                            participants: filteredResults,
                            duplicateType: "name_similarity",
                            message: `Found ${filteredResults.length} participant(s) with similar names`,
                            canUpdate: false,
                            recommendation: 'FLAG_FOR_REVIEW'
                        };
                    }
                }
            }
            
            // No duplicates found
            return {
                success: true,
                found: false,
                participants: [],
                duplicateType: null,
                message: "No existing participants found",
                canUpdate: false,
                recommendation: 'PROCEED_WITH_REGISTRATION'
            };
            
        } catch (error) {
            console.error("Error finding participant by NRIC/phone/name:", error);
            return {
                success: false,
                found: false,
                participants: [],
                duplicateType: null,
                message: "Error searching for existing participants",
                canUpdate: false,
                error: error.message
            };
        }
    }

    // Helper method to generate name variations for smart matching
    generateNameVariations(name) {
        const variations = [];
        const cleanName = name.replace(/[^\w\s]/g, '').trim();
        
        // Original name
        variations.push(cleanName);
        
        // Remove extra spaces and normalize
        const normalizedName = cleanName.replace(/\s+/g, ' ');
        variations.push(normalizedName);
        
        // Different word order combinations
        const words = normalizedName.split(' ');
        if (words.length > 1) {
            // Reverse order
            variations.push(words.reverse().join(' '));
            
            // First and last name only
            if (words.length >= 2) {
                variations.push(`${words[0]} ${words[words.length - 1]}`);
                variations.push(`${words[words.length - 1]} ${words[0]}`);
            }
            
            // Each individual word (for partial matches)
            words.forEach(word => {
                if (word.length > 2) { // Only meaningful words
                    variations.push(word);
                }
            });
        }
        
        // Escape special regex characters and create patterns
        return variations.map(variation => 
            variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );
    }

    // Bulk update method for registration records
    async bulkUpdateRegistrations(databaseName, updates, staff, date, time) {
        const db = this.client.db(databaseName);
        const table = db.collection("Registration Forms");
        staff = sanitizeStaffName(staff);

        try {
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                return {
                    success: false,
                    message: "No updates provided"
                };
            }

            // Prepare bulk write operations
            const bulkOps = updates.map(update => {
                const { id, paymentStatus, paymentMethod } = update;
                
                // Validate required fields
                if (!id) {
                    throw new Error(`Missing ID for update: ${JSON.stringify(update)}`);
                }

                // Build update object based on what fields are being updated
                const updateFields = {};

                if (paymentStatus) {
                    updateFields.status = paymentStatus;
                    
                    // Add official details for payment status updates
                    updateFields["official.name"] = staff;
                    updateFields["official.date"] = date;
                    updateFields["official.time"] = time;

                    // Reset certain fields based on status
                    // COMMENTED OUT: SkillsFuture - if (paymentStatus === "Paid" || paymentStatus === "SkillsFuture Done" || paymentStatus === "Generating SkillsFuture Invoice") {
                    if (paymentStatus === "Paid") {
                        // Keep existing official data for successful payments
                    } else if (paymentStatus === "Cancelled") {
                        updateFields["official.confirmed"] = false;
                    } else {
                        // For other statuses like "Pending", reset confirmation
                        updateFields["official.confirmed"] = false;
                        updateFields["official.receiptNo"] = "";
                    }
                }

                if (paymentMethod) {
                    updateFields["course.payment"] = paymentMethod;
                    
                    // Reset payment-related fields when changing payment method
                    updateFields.status = "Pending";
                    updateFields["official.receiptNo"] = "";
                    updateFields["official.name"] = staff;
                    updateFields["official.date"] = date;
                    updateFields["official.time"] = time;
                    updateFields["official.confirmed"] = false;
                }

                return {
                    updateOne: {
                        filter: { _id: this._makeObjectId(id) },
                        update: { $set: updateFields }
                    }
                };
            });

            console.log(`Executing bulk update with ${bulkOps.length} operations`);
            console.log("Sample bulk operation:", JSON.stringify(bulkOps[0], null, 2));

            // Execute bulk write operation
            const result = await table.bulkWrite(bulkOps, { ordered: false });

            console.log("Bulk update result:", {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount,
                insertedCount: result.insertedCount
            });

            // Check for any write errors
            if (result.writeErrors && result.writeErrors.length > 0) {
                console.error("Bulk write errors:", result.writeErrors);
                return {
                    success: false,
                    message: `Bulk update completed with ${result.writeErrors.length} errors`,
                    details: {
                        total: updates.length,
                        successful: result.modifiedCount,
                        failed: result.writeErrors.length,
                        errors: result.writeErrors
                    }
                };
            }

            return {
                success: true,
                message: `Successfully updated ${result.modifiedCount} out of ${updates.length} records`,
                details: {
                    total: updates.length,
                    matched: result.matchedCount,
                    modified: result.modifiedCount,
                    upserted: result.upsertedCount
                }
            };

        } catch (error) {
            console.error("Error during bulk update:", error);
            return {
                success: false,
                message: "Error performing bulk update",
                error: error.message
            };
        }
    }
}

// Export the instance for use in other modules
module.exports = DatabaseConnectivity;