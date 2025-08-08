const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string - should use environment variable
const uri = 'mongodb+srv://moseslee:Mlxy6695@ecss-course.hejib.mongodb.net/?retryWrites=true&w=majority&appName=ECSS-Course';

// MongoDB connection options for better performance
const mongoOptions = {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    // Note: bufferMaxEntries and bufferCommands are Mongoose-specific, not native MongoDB driver options
    // useUnifiedTopology is now default and deprecated as an option
};

class DatabaseConnectivity {
    constructor() {
        this.client = new MongoClient(uri, mongoOptions);
        this.isConnected = false;
    }

    // Connect to the database with improved error handling
    async initialize()
    {
        try 
        {
            if (!this.isConnected) 
            {
                // Set a timeout for connection
                const connectionPromise = this.client.connect();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000)
                );
                
                await Promise.race([connectionPromise, timeoutPromise]);
                this.isConnected = true;
                console.log("Connected to MongoDB Atlas successfully!");
                return "Connected to MongoDB Atlas!";
            }   
        } catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
            this.isConnected = false;
            throw error;
        }
    }

    // Add connection health check
    async ensureConnection() {
        if (!this.isConnected) {
            await this.initialize();
        }
    }

    async login(dbname, collectionName, email, password, date, time)
    {
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
            console.log(error);
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
    
                // Ensure registration_id is an ObjectId only for "Receipts" collection
                if (collectionName === "Receipts") {
                    const registrationId = new ObjectId(data.registration_id);
                    data.registration_id = registrationId;
                }
    
                // Directly insert the data without any checks
                result = await table.insertOne(data);
    
                // Return the result based on the collection name
                if (collectionName === "Accounts") {
                    return { acknowledged: result.acknowledged, accountId: result.insertedId };
                } else {
                    return { acknowledged: result.acknowledged }; // For other collections
                }
            }
        } catch (error) {
            console.error('Error during database operation:', error);
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

    async retrieveCourseRegistration(dbname, collectionName, role, siteIC) 
    {
        var db = this.client.db(dbname); // Return the db object
        try {
            if (db) {
                var table = db.collection(collectionName);
                
                // Define query object
                let query = {};

                console.log("=== RETRIEVE COURSE REGISTRATION DEBUG ===");
                console.log("Database Name:", dbname);
                console.log("Collection Name:", collectionName);
                console.log("Role:", role);
                console.log("SiteIC Type:", typeof siteIC);
                console.log("SiteIC Value:", siteIC);
                console.log("SiteIC JSON:", JSON.stringify(siteIC));

                // If role is "Site in-charge", filter by course.courseLocation
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
                } else {
                    console.log("Role is not Site in-charge, returning all documents");
                }
                // If role is not "Site in-charge", return all documents (empty query retrieves all)
                
                console.log("Final MongoDB query:", JSON.stringify(query));
                
                var result = await table.find(query).toArray();
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
                
                return result;
            }
        } catch (error) {
            console.log("Database query error:", error);
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
                var result = await table.findOne({ "Account Details.Account ID": new ObjectId(id)}); // Convert id to ObjectId
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
                const filter = { _id: new ObjectId(id) };

                // Add the new key "confirmation" to the update data
                const update = {
                    $set: {
                        status: newStatus, // Add new key "confirmation"
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

                
    async updateParticipantParticulars(dbname, id, field, editedParticulars) {
        console.log("Update Request:", id, field, editedParticulars);
        var db = this.client.db(dbname); // Return the db object
        try {
            if (db) {
                const tableName = "Registration Forms";
                const table = db.collection(tableName);
                
                // Use updateOne to update a single document
                const filter = { _id: new ObjectId(id) };
    
                // Declare update variable outside conditionals
                let update;
    
                // Dynamically construct the update object with dot notation
                if(field === "paymentDate") {
                    update = {
                        $set: {
                           "official.date": editedParticulars,
                        },
                    };
                }
                else if(field === "refundedDate") {
                    update = {
                        $set: {
                           "official.refundedDate": editedParticulars,
                        },
                    };
                }
                else {
                    update = {
                        $set: {
                            [`participant.${field}`]: editedParticulars, // Use bracket notation for dynamic field
                        },
                    };
                }
    
                // Call updateOne
                const result = await table.updateOne(filter, update);
                console.log("Update Result:", result);
                return result;
            }
        } catch (error) {
            console.error("Error updating database:", error);
            throw error; // Re-throw the error to handle it in the calling function
        }
    }

    async updateReceiptNumberData(dbname, id, receiptNumber) {
        console.log("Parameters:", dbname, id, receiptNumber);
        var db = this.client.db(dbname); // return the db object
        try {
            if (db) {
                var tableName = "Registration Forms";
                var table = db.collection(tableName);
    
                // Use updateOne to update a single document
                const filter = { _id: new ObjectId(id) };
    
                // Update only the `receiptNo` field inside the `official` object
                const update = {
                    $set: {
                        "official.receiptNo": receiptNumber
                    }
                };

                // Call updateOne
                const result = await table.updateOne(filter, update);
                console.log("updateReceiptNumberData:", result)
    
                return result;
            }
        } catch (error) {
            console.log("Error updating database:", error);
        }
    }
    
    
    async updatePaymentOfficialUse(dbname, id, name, date, time, status) {
        var db = this.client.db(dbname); // return the db object
        try {
            if (db) {
                var tableName = "Registration Forms";
                var table = db.collection(tableName);
    
                // Use updateOne to update a single document
                const filter = { _id: new ObjectId(id) };
    
                // Define the update object conditionally based on status
                let update = null;
                
                console.log("Update Payment Official Use:", status);
                if (status === "Paid" || status === "SkillsFuture Done" || status === "Generating SkillsFuture Invoice") {
                    console.log("OK");
                    update = {
                        $set: {
                            "status": status,
                            "official.name": name,
                            "official.date": date,
                            "official.time": time
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
                else {
                    update = {
                        $set: {
                            "status": status,
                            "official.name": name,
                            "official.date": date,
                            "official.time": time,
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
        var db = this.client.db(dbname); // return the db object
        try {
            if (db) {
                var tableName = "Registration Forms";
                var table = db.collection(tableName);
        
                // Use updateOne to update a single document
                const filter = { _id: new ObjectId(id) };
        
                // Define the update object conditionally based on status
                let update = {
                    $set: {
                        "official.confirmed": status,
                        "official.name": name,
                        "official.date": date,
                        "official.time": time,
                        "status": "Pending",
                        "official.receiptNo": ""
                    }
                };
        
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
        var db = this.client.db(dbname); // return the db object ok
        try {
            console.log("Id:", id);
            console.log("New Payment Method:", newPaymentMethod);
            if (db) {
                var tableName = "Registration Forms";
                var table = db.collection(tableName);
    
                // Use updateOne to update a single document
                const filter = { _id: new ObjectId(id) };
    
                var update = {
                            $set: {
                                "course.payment": newPaymentMethod,
                                "status": "Pending",
                                "official.receiptNo": "",
                                "official.name": staff,
                                "official.date": date,
                                "official.time": time,
                                "official.confirmed": false,
                            }
                        };
                // Call updateOne
                const result = await table.updateOne(filter, update);
                //console.log("New Payment Method:", result);
    
                return result;
            }
        } catch (error) {
            console.log("Error updating database:", error);
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
                const filter = { _id: new ObjectId(participantDetails.id) };
    
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
            const filter = { _id: new ObjectId(id) }; // Find document by ID
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
    
    async getNextReceiptNumber(databaseName, collectionName, courseLocation, centreLocation) {
        const db = this.client.db(databaseName);
        const collection = db.collection(collectionName);
        console.log("Locations:", courseLocation, centreLocation);
    
        // Get the current two-digit year (e.g., 2025 -> "25")
        var currentYear = new Date().getFullYear().toString().slice(-2);
        currentYear = parseInt(currentYear);
    
        let regexPattern = `^${courseLocation}`; // Default pattern

        if (centreLocation === "Tampines 253 Centre" && courseLocation.startsWith("ECSS/SFC")) {
            regexPattern = `${courseLocation}TP`; // Ensure "TP" appears after courseLocation
        }
        else if (centreLocation === "Renewal Christian Church" && courseLocation.startsWith("ECSS/SFC")) {
            regexPattern = `${courseLocation}R` // Ensure "TP" appears after courseLocation
        }

        console.log("Regex Pattern:", regexPattern);
        
        const existingReceipts = await collection.find({
            receiptNo: { $regex: regexPattern },
            location: centreLocation
        }).toArray();
        

        console.log("Existing Receipts:", existingReceipts);
    
        let formattedReceiptNumber;
    
        // First, handle the SkillsFuture Invoice Number
        if (courseLocation.startsWith("ECSS/SFC/")) 
        {
            console.log("Skillsfuture Invoice");
            // Filter receipts to get only those from the current year
            const validReceipts = existingReceipts.filter(receipt => {
                let regexPattern;
                console.log("Centre Location:", centreLocation);
                // Check if the location is Tampines 253 Centre
                if (centreLocation === "Tampines 253 Centre") {
                    // Ensure "TP" appears for Tampines 253 Centre
                    regexPattern = new RegExp(`^${courseLocation}TP\\d+/(${currentYear})$`);
                } 
                else if (centreLocation === "Renewal Christian Church") {
                    // Ensure "TP" appears for Tampines 253 Centre
                    regexPattern = new RegExp(`^${courseLocation}R\\d+/(${currentYear})$`);
                } else {
                    // Default pattern without "TP"
                    regexPattern = new RegExp(`^${courseLocation}\\d+/(${currentYear})$`);
                }
                return regexPattern.test(receipt.receiptNo);
            });
            console.log("Valid Receipts:", courseLocation, validReceipts);
        
            // Get the current year's receipt numbers for the specific location (centreLocation)
            const centreReceiptNumbers = validReceipts.map(receipt => {
                // Create regex pattern based on the centreLocation
                let regexPattern;    
                if (centreLocation === "Tampines 253 Centre") {
                    // Enforce "TP" for Tampines 253 Centre receipts
                    regexPattern = new RegExp(`^${courseLocation}TP(\\d+)(?:/\\d+| - \\d+)$`);
                } else if (centreLocation === "Renewal Christian Church") {
                    // Enforce "TP" for Tampines 253 Centre receipts
                    regexPattern = new RegExp(`^${courseLocation}R(\\d+)(?:/\\d+| - \\d+)$`);
                } 
                else {
                    // Default pattern without "TP"
                    regexPattern = new RegExp(`^${courseLocation}(\\d+)(?:/\\d+| - \\d+)$`);
                }
                const match = receipt.receiptNo.match(regexPattern);
                return match ? parseInt(match[1], 10) : null;
            }).filter(num => num !== null);
            
            console.log(courseLocation, centreReceiptNumbers, centreLocation, currentYear);
            formattedReceiptNumber = this.getNextReceiptNumberForSkillsFuture(courseLocation, centreReceiptNumbers, centreLocation, currentYear);
        } 
        else 
        {
            console.log("Get Next Number For Receipt (PayNow or Cash)");
            // Default logic for other locations
            formattedReceiptNumber = this.getNextReceiptNumberForPayNowCash(courseLocation, existingReceipts, centreLocation, currentYear);
        }

        return formattedReceiptNumber;
    }
    
    getNextReceiptNumberForSkillsFuture(courseLocation, centreReceiptNumbers, centreLocation, currentYear) 
    {
        let nextNumber;
        console.log("Centre Receipt Number:", centreReceiptNumbers, centreLocation);
        // Logic for 2025
        if (currentYear === 25) {
            if (centreLocation === "CT Hub") {
             // For CT Hub in 2025, start from 109
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 109;
            }             
            else if (centreLocation === "Tampines 253 Centre") 
            {             
                // For Tampines 253 Centre in 2026 and beyond, start from 1
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 91;
            } 
            else if (centreLocation === "Pasir Ris West Wellness Centre") {
                // For Pasir Ris West Wellness Centre in 2026 and beyond, start from 1
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 13 ;
            }
            else if (centreLocation === "Renewal Christian Church") {
                // For Pasir Ris West Wellness Centre in 2026 and beyond, start from 1
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 16 ;
            }
        } 
        // Logic for 2026 and beyond
        else if (currentYear >= 26) {
            if (centreLocation === "CT Hub") {
                // For CT Hub in 2026 and beyond, start from 1
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 1;
            } else if (centreLocation === "Tampines 253 Centre") {
                // For Tampines 253 Centre in 2026 and beyond, start from 1
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumber.substring(2)) + 1 : 1;
            } else if (centreLocation === "Pasir Ris West Wellness Centre") {
                // For Pasir Ris West Wellness Centre in 2026 and beyond, start from 1
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 1;
            }
            else if (centreLocation === "Renewal Christian Church") {
                // For Pasir Ris West Wellness Centre in 2026 and beyond, start from 1
                nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 1;
            }
        }

        console.log("Tampines 253 Centre Next Receipt:", nextNumber);
    
        // Pad number to 3 digits if less than 3 digits, else keep original length
        if (nextNumber.toString().length < 3) 
        {
            
            if(centreLocation === "Tampines 253 Centre")
            {
                nextNumber = `TP${nextNumber.toString().padStart(3, '0')}`; // Pad to 3 digits if less than 3
            }
            else if(centreLocation === "Renewal Christian Church")
            {
                nextNumber = `R${nextNumber.toString().padStart(3, '0')}`; // Pad to 3 digits if less than 3
            }
            else
            {
                nextNumber = nextNumber.toString().padStart(3, '0'); // Pad to 3 digits if less than 3
            }
        } 
        else 
        {
            if(centreLocation === "Tampines 253 Centre")
            {
                nextNumber = `TP${nextNumber.toString().padStart(3, '0')}`; // Pad to 3 digits if less than 3
            }
            else if(centreLocation === "Renewal Christian Church")
            {
                nextNumber = `R${nextNumber.toString().padStart(3, '0')}`; // Pad to 3 digits if less than 3
            }
            else
            {
                nextNumber = nextNumber.toString().padStart(3, '0'); // Pad to 3 digits if less than 3
            }
        }
            
        // Return the formatted receipt number ok 
       return `${courseLocation}${nextNumber}/${currentYear.toString()}`;
    }
    
    
    getNextReceiptNumberForPayNowCash(courseLocation, existingReceipts, centreLocation, currentYear) {
        let nextNumber;
    
        console.log("Centre Receipt Number:", courseLocation, existingReceipts, centreLocation, currentYear);
    

         // Filter the existing receipts based on the location
        //const filteredReceipts = existingReceipts.filter(receipt => receipt.location === centreLocation);
        const filteredReceipts = existingReceipts;
        console.log("Filtered Receipts for Centre Location:", filteredReceipts);

        // Extract the numeric part of the receiptNo (before the "-") and get the numbers
        const centreReceiptNumbers = filteredReceipts.map(receipt => {
                const receiptNumberMatch = receipt.receiptNo.split(" - ")[1]; // Split by " - " and get the number part
                return receiptNumberMatch ? parseInt(receiptNumberMatch, 10) : null;
            }).filter(num => num !== null);

        console.log("Centre Receipt Numbers11:", centreReceiptNumbers);

       const maxReceiptNumber = existingReceipts.length > 0 ? Math.max(...centreReceiptNumbers) : 0;
        console.log("Latest Receipt Numbers:", maxReceiptNumber);
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
            // For CT Hub, it uses the same logic as the others
           // console.log("This is a new location");
            nextNumber =  maxReceiptNumber + 1;
        } 
    
        // Determine the length of the next number based on the nextNumber value
        let numberLength = nextNumber.toString().length;
    
        // Format the next number dynamically with leading zeros based on its length
        let formattedNextNumber = String(nextNumber).padStart(numberLength + 3, '0');  // Start with length 4, increase as needed*/
       // console.log(`Latest Receipt Number1234: ${courseLocation} - ${formattedNextNumber}`)
    
        // Return the formatted receipt number in the format: "courseLocation - 0001"
        return `${courseLocation} - ${formattedNextNumber}`;
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

    async getNextInvoiceNumber(databaseName, collectionName) {
        try {
            const db = this.client.db(databaseName);
            const collection = db.collection(collectionName);
    
            const prefix = "ECSS/TLE/205/";
    
            // Retrieve all invoices matching the specified prefix
            const existingInvoices = await collection.find({
                invoiceNumber: { $regex: `^${prefix}\\d+$` } // Match invoice numbers starting with the prefix and a numeric part
            }).toArray();
    
            console.log("Current Invoices:", existingInvoices);
    
            // If there are no invoices, start with '1'
            if (existingInvoices.length === 0) {
                return `${prefix}1`;
            }
    
            // Extract the numeric part of invoice numbers
            const invoiceNumbers = existingInvoices.map(invoice => {
                const match = invoice.invoiceNumber.match(new RegExp(`^${prefix}(\\d+)$`));
                if (match) {
                    console.log(`Extracted number: ${match[1]}`); // Debugging output
                }
                return match ? parseInt(match[1], 10) : null; // Extract and parse numeric part
            }).filter(num => num !== null); // Remove invalid entries
    
            // Debugging output for extracted numbers
            console.log("Extracted Invoice Numbers:", invoiceNumbers);
    
            // Find the latest (maximum) existing number
            const latestNumber = Math.max(...invoiceNumbers);
            console.log("Latest Invoice Number:", latestNumber); // Debugging output
    
            // Determine the next number
            const nextNumber = latestNumber + 1;
    
            // Return the next invoice number without leading zeros
            return `${prefix}${nextNumber}`;
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
            const filter = { _id: new ObjectId(id) }; // Find document by ID
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
                registration_id: new ObjectId(id) }; // Find document by ID
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
                _id: new ObjectId(id) }; // Find document by ID
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
          const filter = { _id: new ObjectId(id) }; // Find document by ID
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
            const filter = { _id: new ObjectId(id) }; 
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
            const filter = { "Account Details.Account ID": new ObjectId(id) }; 
    
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
      
    async addRefundedDate(databaseName, collectionName, id, date) 
    {
        //console.log("Database:::", databaseName, collectionName, id, date);
        try {
            const db = this.client.db(databaseName);
            const table = db.collection(collectionName);
    
            const result = await table.updateOne(
                { _id: new ObjectId(id) }, // Convert `id` to ObjectId
                { $set: { "official.refundedDate": date } } // Add `official.refundedDate`
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
    
            const result = await table.updateOne(
                { _id: new ObjectId(id) }, // Convert `id` to ObjectId
                { $set: { "official.remarks": remarks } } // Add `official.refundedDate`
            );
    
            console.log("Update Result:", result);
            return result;
        } catch (error) {
            console.error("Error updating refunded date:", error);
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

            console.log(updateAccessRight);

            const keyMapping = {
                accounts: "Account",
                regPay: "Registration And Payment",
                qRCode: "QR Code",
                courses: "Courses",
                reports: "Reports"
              };
    
           // Exclude _id from the updateAccessRight if it exists
            const { id, accType, name, sn, ...filteredUpdateAccessRight } = updateAccessRight;
            var updateAccessRight = Object.fromEntries(
                Object.entries(filteredUpdateAccessRight).map(([key, value]) => [
                  keyMapping[key] || key, // Replace key if found in keyMapping, otherwise keep the original
                  value
                ])
              );
            console.log(updateAccessRight);
    
            // Prepare the update object
            const update = {
                $set: {}
            };

    
            // Add any other fields from updateData
            for (const key in updateAccessRight) {
                update.$set[key] = updateAccessRight[key];
            }
    
            console.log("Update object:", update);
    
            // Perform the update operation
            const result = await table.updateOne(filter, update);
    
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

    // Close the connection to the database
    async close() {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            console.log("MongoDB connection closed.");
        }
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
                    if (paymentStatus === "Paid" || paymentStatus === "SkillsFuture Done" || paymentStatus === "Generating SkillsFuture Invoice") {
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
                        filter: { _id: new ObjectId(id) },
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