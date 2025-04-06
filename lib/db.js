const mysql=require('mysql2/promise')
let conn;
const dotenv=require('dotenv')
dotenv.config()
 const connectToDatabase=async ()=>{
    console.log("Connecting to the database...");
    if(!conn){
        try {
            conn = await mysql.createConnection({
              host: process.env.VITE_LOCAL,
              user: process.env.VITE_USER,
              password: process.env.VITE_PASSWORD,
              database: process.env.VITE_DATABASE
            });
            console.log("Database connection established.");
          } catch (error) {
            console.error("Error connecting to the database:", error);
            throw error;
          }
    }
    return conn
}
module.exports = { connectToDatabase }