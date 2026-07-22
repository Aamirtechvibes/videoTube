import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js"
import { upload } from "../middlewares/multer.middlewares.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const { username, email, fullName, password } = req.body

    if (
        [username, email, fullName, password].some((field) => field?.trim() == "")
    ) {
        throw new ApiError(400, "All fields is required")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    console.log(existedUser);

    if (existedUser) {
        throw new ApiError(400, "User already Exit");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);


    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar?.url ,
        coverImage: coverImage?.url || "",
        password,
    })
    
    // Cloudinary Config test

    //console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    //console.log("API Key:", process.env.CLOUDINARY_API_KEY);
    //console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "FOUND" : "NOT FOUND");
    //console.log(cloudinary.config());

    // checking user is created 
    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!userCreated) {
        throw new ApiError(500, "Some thing went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, userCreated, "User registerd Successfully")
    )
    //console.log("email: ",email);
    // console.log(req.body);


})



export { registerUser }