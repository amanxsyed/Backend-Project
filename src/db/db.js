import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

//DB is an another continent
const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB Connection Successful: ${connectionInstance.connection.host}`);
    }catch(error){
        console.log("MongoDB Connection Error: ", error);
        process.exit(1);
    }
};

export default connectDB;