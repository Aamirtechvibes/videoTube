import dotenv from "dotenv";
 
import connectDB from "./db/index.js";
import { error } from "node:console";


dotenv.config({
    parth: './.env'
}); 

const port = process.env.PORT || 3000;

(async () => {
    try {
        await connectDB();
        app.listen(port, () =>
            console.log(`🚀 Server is running on http://localhost:${port}`)
        );
    } catch (error) {
        console.error("❌ Failed to connect to database:", error);
        process.exit(1);
    }
})();
