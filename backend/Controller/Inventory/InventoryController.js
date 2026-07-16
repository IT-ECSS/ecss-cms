const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class
const { ObjectId } = require("mongodb");
const { generateStandardReceiptNumber, resolveCategoryCode } = require('../../numbering/receiptNumber');


class InventoryController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    async generateReceiptNumber({ wooCategory = '', locationFrom = '', existingRecords = null } = {}) {
        const databaseName = "Company-Management-System";

        // The item code comes ONLY from the WooCommerce product category
        // (the "Item Category (For Moses Uses)" categories: Fitness → FIT, Panettone → PAN,
        // NSA → NSA, Miscellaneous → MSC, etc.). Inventory receipts must NEVER be SFC or
        // Fundraising (FR), and no SKU is involved. If the category cannot be resolved,
        // return null so the caller refuses to generate a receipt.
        const itemCode = await resolveCategoryCode(wooCategory, 'Receipt');
        if (!itemCode || itemCode === 'SFC' || itemCode === 'FR') {
            console.warn(`Inventory receipt not generated — unrecognised/disallowed category "${wooCategory}".`);
            return null;
        }

        // Series numbering is based on existing receipts in the Receipts collection.
        const records = existingRecords ?? await this.databaseConnectivity.retrieveFromDatabase(databaseName, 'Receipts');
        const currentYear = new Date().getFullYear();
        return generateStandardReceiptNumber({
            existingReceipts: records || [],
            courseLocation: locationFrom,
            fullYear: currentYear,
            itemCode,
        });
    }

    async insertInventory(payload)
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                // Generate receipt number strictly from the WooCommerce product category (no SKU).
                const receiptNumber = await this.generateReceiptNumber({
                    wooCategory: payload.wooCategory || '',
                    locationFrom: payload.locationFrom || '',
                });
                console.log("Generated Receipt Number:", receiptNumber);

                // If the category could not be resolved, do not generate any receipt/order.
                if (!receiptNumber) {
                    return {
                        success: false,
                        message: "Cannot generate receipt: product category not recognised",
                        error: `Unrecognised product category "${payload.wooCategory || ''}". No receipt was generated.`,
                    };
                }

                // Add receipt number to payload, but exclude any stray sku field
                const { sku: _sku, ...payloadWithoutSku } = payload;
                const payloadWithReceipt = {
                    ...payloadWithoutSku,
                    receiptNumber: receiptNumber,
                    confirmed: false
                };

                // Insert the inventory order
                const insertResult = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, payloadWithReceipt);
                console.log("Insert Inventory Result:", insertResult);

                const inventoryId = insertResult?.insertedId || null;

                // Store the inventory reference as a proper ObjectId (never a string) so the
                // receipt correctly links back to the Inventory document.
                let inventoryObjectId = null;
                if (inventoryId instanceof ObjectId) {
                    inventoryObjectId = inventoryId;
                } else if (inventoryId && ObjectId.isValid(String(inventoryId))) {
                    inventoryObjectId = new ObjectId(String(inventoryId));
                }

                // Insert a receipt record to the Receipts collection (SGT date/time)
                const _now = new Date();
                const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
                const sgtDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
                const sgtTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;

                const receiptRecord = {
                    receiptNo: receiptNumber,
                    inventory_id: inventoryObjectId,
                    url: '',
                    staff: payload.staffName || '',
                    location: payload.locationFrom || '',
                    date: sgtDate,
                    time: sgtTime,
                };
                const receiptInsertResult = await this.databaseConnectivity.insertToDatabase(databaseName, 'Receipts', receiptRecord);
                console.log("Inventory Receipt Insert Result:", receiptInsertResult);

                // Add _id to payload for socket emission
                const dataWithId = {
                    ...payloadWithReceipt,
                    _id: inventoryId
                };

                return {
                    success: true,
                    message: "Inventory order inserted successfully",
                    result: insertResult,
                    data: dataWithId,
                    recordId: inventoryId,
                    receiptNumber: receiptNumber,
                };
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        } 
        catch (error) {
            console.error("Inventory insert error:", error);
            return {
                success: false,
                message: "Error inserting inventory order",
                error: error.message || String(error)
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }

    async retrieveInventoryRecords()
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                // Retrieve all inventory records
                const records = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);
                console.log("Retrieved Inventory Records:", records?.length || 0, "records");

                return {
                    success: true,
                    message: "Inventory records retrieved successfully",
                    records: records || []
                };
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        } 
        catch (error) {
            console.error("Inventory retrieve error:", error);
            return {
                success: false,
                message: "Error retrieving inventory records",
                error: error.message || String(error)
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }

    async insertStockRecord(payload)
    {
        try {
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                const stockRecord = {
                    action: payload.action || '',
                    product: payload.product,
                    locationFrom: payload.locationFrom || '',
                    locationTo: payload.locationTo || '',
                    date: payload.date,
                    time: payload.time,
                    quantity: parseInt(payload.quantity),
                    reason: payload.reason || '',
                    variant: payload.variant || '',
                    updatedBy: payload.updatedBy,
                    createdAt: new Date()
                };

                const insertResult = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, stockRecord);
                console.log("Insert Stock Record Result:", insertResult);

                return {
                    success: true,
                    message: "Stock record inserted successfully",
                    result: insertResult,
                    data: { ...stockRecord, _id: insertResult?.insertedId || null }
                };
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        }
        catch (error) {
            console.error("Stock record insert error:", error);
            return {
                success: false,
                message: "Error inserting stock record",
                error: error.message || String(error)
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }
    }

    async confirmStockRecord(id)
    {
        try {
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                // Idempotency guard - but split into TWO independent flags so a
                // Sales row that got marked `confirmed` in Mongo while its
                // WooCommerce decrement failed/never ran is NOT permanently stuck.
                // - `confirmed`: the record has been reviewed/approved (Mongo only).
                // - `wooProcessed`: WooCommerce stock has actually been decremented
                //   for this record (Sales rows only). Only skip the WooCommerce
                //   step entirely once THIS is true.
                const table = this.databaseConnectivity.client.db(databaseName).collection(collectionName);
                const existing = await table.findOne({ _id: new ObjectId(id) });

                if (existing && existing.confirmed === true) {
                    const needsWoo = existing.action === 'Sales' && existing.wooProcessed !== true;
                    if (!needsWoo) {
                        console.log("Stock record already fully confirmed, skipping duplicate confirm:", id);
                        return {
                            success: true,
                            alreadyConfirmed: true,
                            message: "Stock record was already confirmed"
                        };
                    }
                    // Already confirmed in Mongo, but WooCommerce was never marked
                    // processed for this Sales row - let the caller retry the
                    // WooCommerce step without re-writing confirmed/confirmedAt.
                    console.log("Stock record confirmed but WooCommerce not yet processed - allowing retry:", id);
                    return {
                        success: true,
                        alreadyConfirmed: false,
                        needsWooRetry: true
                    };
                }

                const now = new Date();
                const updateResult = await this.databaseConnectivity.updateParticipant(databaseName, collectionName, id, {
                    confirmed: true,
                    confirmedAt: now.toISOString()
                });
                console.log("Confirm Stock Record Result:", updateResult);

                return updateResult;
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        }
        catch (error) {
            console.error("Stock record confirm error:", error);
            return {
                success: false,
                message: "Error confirming stock record",
                error: error.message || String(error)
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }
    }

    // Called after the frontend successfully decrements WooCommerce stock for a
    // confirmed Sales record, so a future confirm/retry never double-decrements.
    async markStockWooProcessed(id)
    {
        try {
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                const updateResult = await this.databaseConnectivity.updateParticipant(databaseName, collectionName, id, {
                    wooProcessed: true,
                    wooProcessedAt: new Date().toISOString()
                });
                console.log("Mark WooCommerce Processed Result:", updateResult);

                return updateResult;
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        }
        catch (error) {
            console.error("Mark WooCommerce processed error:", error);
            return {
                success: false,
                message: "Error marking WooCommerce processed",
                error: error.message || String(error)
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }
    }

    async retrieveStockRecords()
    {
        try {
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                const records = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);
                console.log("Retrieved Stock Records:", records?.length || 0, "records");

                return {
                    success: true,
                    message: "Stock records retrieved successfully",
                    records: records || []
                };
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        }
        catch (error) {
            console.error("Stock records retrieve error:", error);
            return {
                success: false,
                message: "Error retrieving stock records",
                error: error.message || String(error)
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }
    }

    async insertStockAllocation(payload)
    {
        try {
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";
                const now = new Date();

                // Single allocation record
                const allocationRecord = {
                    product: payload.product,
                    location: payload.location,
                    date: payload.date,
                    time: payload.time,
                    quantity: parseInt(payload.quantity),
                    reason: payload.reason || '',
                    updatedBy: payload.updatedBy,
                    createdAt: now
                };

                const insertResult = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, allocationRecord);
                console.log("Allocation Result:", insertResult);

                return {
                    success: true,
                    message: "Stock allocation recorded successfully",
                    data: { ...allocationRecord, _id: insertResult?.insertedId || null }
                };
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        }
        catch (error) {
            console.error("Stock allocation insert error:", error);
            return {
                success: false,
                message: "Error inserting stock allocation",
                error: error.message || String(error)
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }
    }

    async clearAllStockRecords()
    {
        try {
            const result = await this.databaseConnectivity.initialize();
            if (result === "Connected to MongoDB Atlas!") {
                const db = this.databaseConnectivity.client.db("Company-Management-System");
                const deleteResult = await db.collection('Inventory').deleteMany({});
                return { success: true, message: `Deleted ${deleteResult.deletedCount} stock records` };
            }
            return { success: false, message: "Failed to connect to database" };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            await this.databaseConnectivity.close();
        }
    }
}

module.exports = InventoryController;
