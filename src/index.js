import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";



dotenv.config({
    path: './.env'
});

const port = process.env.PORT || 3000;

(async () => {
    try {
         await connectDB();

         const server = app.listen(port, () => {
             console.log(`🚀 Server is running on http://localhost:${port}`);
         });

       
    } catch (error) {
        console.error("❌ Failed to connect to database:", error);
        process.exit(1);
    }
})();
