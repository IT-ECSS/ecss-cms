class Account 
{
    constructor() 
    {
        this.accountCreated = "";
        this.name = "";
        this.email = "";
        this.password = "";
        this.type = "";
        this.location = "";
        this.firstTimer = "";
        this.lastLogin = "";
        this.lastLogout = "";
    }
    
    constructor(email, password) {
      this.accountCreated = "";
      this.name = "";
      this.email = email;
      this.password = password;
      this.type = "";
      this.location = "";
      this.firstTimer = "";
      this.lastLogin = "";
      this.lastLogou = "";t
    }

     // Getter and Setter for lastLogoutTimestamp
    getAccountCreated() {
        return this.accountCreated;
      }
    
    setAccountCreated(accountCreated) {
        this.accountCreated = accountCreated;
      }
  
    // Getter and Setter for name
    getName() {
      return this.name;
    }
  
    setName(name) {
      this.name = name;
    }
  
    // Getter and Setter for email
    getEmail() {
      return this.email;
    }
  
    setEmail(email) {
      this.email = email;
    }
  
    // Getter and Setter for password
    getPassword() {
      return this.password;
    }
  
    setPassword(password) {
      this.password = password;
    }
  
    // Getter and Setter for type
    getType() {
      return this.type;
    }
  
    setType(type) {
      this.type = type;
    }
  
    // Getter and Setter for location
    getLocation() {
      return this.location;
    }
  
    setLocation(location) {
      this.location = location;
    }
  
    // Getter and Setter for firstTimer
    getFirstTimer() {
      return this.firstTimer;
    }
  
    setFirstTimer(firstTimer) {
      this.firstTimer = firstTimer;
    }
  
    // Getter and Setter for lastLoginTimestamp
    getLastLogin() {
      return this.lastLogin;
    }
  
    setLastLoginTimestamp(lastLogin) {
      this.lastLogin = lastLogin;
    }
  
    // Getter and Setter for lastLogoutTimestamp
    getLastLogout() {
      return this.lastLogout;
    }
  
    setLastLogout(lastLogout) {
      this.lastLogout = lastLogout;
    }
  }
  
  module.exports = Account;
  