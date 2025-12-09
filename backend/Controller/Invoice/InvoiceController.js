const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class


class InvoiceController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    async newInvoiceNo()
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Invoices";

                // Find the highest existing receipt number for the given course location
                const newInvoiceNumber = await this.databaseConnectivity.getNextInvoiceNumber(databaseName, collectionName);
                console.log("New Invoice Number:", newInvoiceNumber);


                // Return the newly generated receipt number
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
