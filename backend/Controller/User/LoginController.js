//const Account = require("../../Entity/Account"); // Import the Account class
const DatabaseConnectivity = require("../../database/databaseConnectivity"); 

function getCurrentDateTime() {
  const now = new Date();

  // Get day, month, year, hours, and minutes
  const day = String(now.getDate()).padStart(2, '0'); // Ensure two digits
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
  const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure two digits
  const seconds = String(now.getSeconds()).padStart(2, '0'); // Ensure two digits

  // Format date and time
  const formattedDate = `${day}/${month}/${year}`;
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  return {
      date: formattedDate,
      time: formattedTime,
  };
}

class LoginController 
{
  constructor() 
  {
    // Create a single instance of DatabaseConnectivity for this controller
    this.databaseConnectivity = new DatabaseConnectivity();
  }

  // Get database connection
  getDatabaseConnection() {
    return this.databaseConnectivity;
  }

  // Handle user login
  async login(email, password) 
  {
    try 
    {
      console.log("Login attempt for:", email);
      const dbConnection = this.getDatabaseConnection();
      await dbConnection.ensureConnection(); // Use ensureConnection instead of initialize
      
      var databaseName = "Company-Management-System";
      var collectionName = "Accounts";
      var currentDateTime = getCurrentDateTime();
      var connectedDatabase = await dbConnection.login(databaseName, collectionName, email, password, currentDateTime.date, currentDateTime.time);
      console.log("Login result:", connectedDatabase.message);
      return {"message": connectedDatabase.message, "details": connectedDatabase.user};   
    } 
    catch (error) 
    {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Error registering user",
        error: error
      };
    }
    finally 
    {
      // No cleanup needed - connection pool handles this
      console.log("Login request completed");
    }   
  }

  async logout(accountId) 
  {
    try 
    {
      const dbConnection = this.getDatabaseConnection();
      await dbConnection.ensureConnection();
      
      var databaseName = "Company-Management-System";
      var collectionName = "Accounts";
      var currentDateTime = getCurrentDateTime();
      var connectedDatabase = await dbConnection.logout(databaseName, collectionName, accountId, currentDateTime.date, currentDateTime.time);
      console.log("Logout result:", connectedDatabase.message);
      return {"message": connectedDatabase.message};   
    } 
    catch (error) 
    {
      console.error("Logout error:", error);
      return {
        success: false,
        message: "Error registering user",
        error: error
      };
    }
    finally 
    {
      console.log("Logout request completed");
    }   
  }

  async changePassword(accountId, password) 
  {
    try 
    {
      console.log(accountId, password);
      const dbConnection = this.getDatabaseConnection();
      await dbConnection.ensureConnection();
      
      var databaseName = "Company-Management-System";
      var collectionName = "Accounts";
      var connectedDatabase = await dbConnection.changePassword(databaseName, collectionName, accountId, password);
      return {"message": connectedDatabase.message, "success": connectedDatabase.success};   
    } 
    catch (error) 
    {
      console.error("Change password error:", error);
      return {
        success: false,
        message: "Error changing password",
        error: error
      };
    }
    finally 
    {
      // No cleanup needed - connection pool handles this
      console.log("Change password request completed");
    }   
  }

  async resetPassword(username, password) 
  {
    try 
    { 
      console.log("Reset Password");
      const dbConnection = this.getDatabaseConnection();
      await dbConnection.ensureConnection();
      
      var databaseName = "Company-Management-System";
      var collectionName = "Accounts";
      var connectedDatabase = await dbConnection.resetPassword(databaseName, collectionName, username, password);
      return {"message": connectedDatabase.message, "success": connectedDatabase.success};   
    } 
    catch (error) 
    {
      console.error("Reset password error:", error);
      return {
        success: false,
        message: "Error resetting password",
        error: error
      };
    }
    finally 
    {
      // No cleanup needed - connection pool handles this
      console.log("Reset password request completed");
    }   
  }
}



module.exports = LoginController;
