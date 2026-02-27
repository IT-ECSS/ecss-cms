const { MongoClient } = require('mongodb');

async function migrateAccessRights() {
    const uri = "mongodb+srv://ECSS:67F5wQDw9Ky4Nxum@cluster0.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("Company-Management-System");
        const accessRightsCollection = db.collection("Access Rights");

        // Update all documents: remove old Inventory keys and add new ones
        const result = await accessRightsCollection.updateMany(
            {},
            {
                $unset: {
                    "Inventory Store": "",
                    "Inventory Form": "",
                    "Inventory Records": ""
                },
                $set: {
                    "Inventory": {
                        "Inventory Movement Log": true,
                        "Inventory Billing Management": true,
                        "Inventory Overview": true,
                        "Inventory Sales Order": true
                    }
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} access rights documents`);
        console.log("Migration complete!");

    } catch (error) {
        console.error("Migration error:", error);
    } finally {
        await client.close();
        console.log("MongoDB connection closed");
    }
}

migrateAccessRights();
