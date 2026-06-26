const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class


class InvoiceController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    async createInvoice(invoiceNo, registrationId, url, staff, date, time, location) {
        try {
            const dbConnection = this.databaseConnectivity;
            await dbConnection.ensureConnection();

            const invoiceDetails = {
                invoiceNo,
                registration_id: registrationId,
                url: url || '',
                staff: staff || '',
                location: location || '',
                date: date || '',
                time: time || ''
                };

            const databaseName = 'Company-Management-System';
            const collectionName = 'Invoices';
            const insertResult = await dbConnection.insertToDatabase(databaseName, collectionName, invoiceDetails);

            if (!insertResult?.acknowledged) {
                return {
                    success: false,
                    message: insertResult?.error || 'Failed to create invoice record',
                    error: insertResult?.error || 'Failed to create invoice record',
                };
            }

            return {
                success: true,
                message: 'Invoice created successfully',
                invoiceNumber: invoiceNo,
            };
        } catch (error) {
            console.error('❌ [Invoice Controller] Error creating invoice:', error);
            return {
                success: false,
                message: 'Error creating invoice record',
                error: error.message,
            };
        }
    }

    async newInvoiceNo(options = {})
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Invoices";

                const newInvoiceNumber = await this.databaseConnectivity.getNextInvoiceNumber(databaseName, collectionName, options);
                console.log("New Invoice Number:", newInvoiceNumber);

                return {
                    success: true,
                    message: "New invoice number generated successfully",
                    invoiceNumber: newInvoiceNumber
                };
            }
        } 
        catch (error) {
            return {
                success: false,
                message: "Error generating new invoice number",
                error: error
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }

    async newInvoice(invoiceNumber, month, username, date, time)
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Invoices";

                // Find the highest existing receipt number for the given course location
                const invoice = await this.databaseConnectivity.newInvoice(databaseName, collectionName, invoiceNumber, month, username, date, time);

                // Return the newly generated receipt number
                return {
                    success: true,
                    message: "New invoice number generated successfully",
                    invoice: invoice
                };
            }
        } 
        catch (error) {
            return {
                success: false,
                message: "Error generating new invoice number",
                error: error
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }

    async retrieveInvoices()
    {
        try {
            const dbConnection = this.databaseConnectivity;
            await dbConnection.ensureConnection();

            const databaseName = "Company-Management-System";
            const collectionName = "Invoices";
            const connectedDatabase = await dbConnection.retrieveFromDatabase(databaseName, collectionName);

            return {
                success: true,
                message: "Invoices retrieved successfully",
                invoices: connectedDatabase || []
            };
        }
        catch (error)
        {
            console.error("Error retrieving invoices:", error);
            return {
                success: false,
                message: "Error retrieving invoices",
                error: error
            };
        }
        finally {
            console.log("Retrieve invoices request completed");
        }
    }

    async getInvoiceNumber(selectedMonth)
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Invoices";

                // Find the highest existing receipt number for the given course location
                var invoiceNumber = await this.databaseConnectivity.getInvoiceNumber(databaseName, collectionName, selectedMonth);
                console.log("Inovice Number:", invoiceNumber);


                // Return the newly generated receipt number
                if(invoiceNumber === null)
                {
                    return {
                        success: true,
                        message: "New invoice number generated successfully",
                        invoiceNumber: ""
                    };
                }
                else
                {
                    return {
                        success: true,
                        message: "New invoice number generated successfully",
                        invoiceNumber: invoiceNumber
                    };
                }
            }
        } 
        catch (error) {
            return {
                success: false,
                message: "Error generating new invoice number",
                error: error
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }

}

module.exports = InvoiceController ;
