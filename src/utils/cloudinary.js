import { v2 as cloudinary } from 'cloudinary';
import fs, { unlink } from "fs";

// Upload an image
const uploadOnCloudinary = async (localFilePath) => {

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    //console.log(cloudinary.config());

    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("Uploaded successfully", response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        console.error(error, "not uploaded")
    }
}

//console.log(process.env.CLOUDINARY_URL);


export { uploadOnCloudinary }