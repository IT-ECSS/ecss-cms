const { MongoClient } = require('mongodb');

// MongoDB connection string - should use environment variable
const uri = process.env.MONGODB_URI || 'mongodb+srv://moseslee:Mlxy6695@ecss-course.hejib.mongodb.net/?retryWrites=true&w=majority&appName=ECSS-Course';

async function setupDatabaseIndexes() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB for index setup');
        
        const db = client.db('ECSS'); // Replace with your actual database name
        
        // Create indexes for participants collection
        const participantsCollection = db.collection('participants'); // Replace with your actual collection name
        
        // Index for NRIC (most commonly queried field)
        await participantsCollection.createIndex({ "nric": 1 }, { 
            background: true,
            name: "nric_index" 
        });
        
        // Index for phone number
        await participantsCollection.createIndex({ "phone": 1 }, { 
            background: true,
            name: "phone_index" 
        });
        
        // Compound index for NRIC and phone (for duplicate checking)
        await participantsCollection.createIndex({ "nric": 1, "phone": 1 }, { 
            background: true,
            name: "nric_phone_compound_index" 
        });
        
        // Index for email
        await participantsCollection.createIndex({ "email": 1 }, { 
            background: true,
            name: "email_index" 
        });
        
        // Create indexes for registration forms collection
        const registrationCollection = db.collection('Registration Forms');
        
        // Index for participant NRIC in registration forms
        await registrationCollection.createIndex({ "participant.nric": 1 }, { 
            background: true,
            name: "participant_nric_index" 
        });
        
        // Index for course location
        await registrationCollection.createIndex({ "course.courseLocation": 1 }, { 
            background: true,
            name: "course_location_index" 
        });
        
        // Index for status
        await registrationCollection.createIndex({ "status": 1 }, { 
            background: true,
            name: "status_index" 
        });
        
        // Create indexes for accounts collection
        const accountsCollection = db.collection('Accounts');
        
        // Index for email (login)
        await accountsCollection.createIndex({ "email": 1 }, { 
            background: true,
            name: "email_login_index" 
        });
        
        // Create indexes for attendance collection
        const attendanceCollection = db.collection('attendance'); // Replace with your actual collection name
        
        // Index for participant information
        await attendanceCollection.createIndex({ "participant.nric": 1 }, { 
            background: true,
            name: "attendance_nric_index" 
        });
        
        // Index for date
        await attendanceCollection.createIndex({ "date": 1 }, { 
            background: true,
            name: "attendance_date_index" 
        });
        
        console.log('Database indexes created successfully');
        
    } catch (error) {
        console.error('Error setting up database indexes:', error);
    } finally {
        await client.close();
    }
}

// Run this function once to set up indexes
if (require.main === module) {
    setupDatabaseIndexes()
        .then(() => {
            console.log('Index setup completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Index setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabaseIndexes };
