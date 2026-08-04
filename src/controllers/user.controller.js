import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js"
import { upload } from "../middlewares/multer.middlewares.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"
import { channel, subscribe } from "node:diagnostics_channel";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // console.log("accessToken: ",accessToken)
        // console.log("refreshToken: ",refreshToken)

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while generating access and refresh token")
    }

}

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

    // console.log(req.body)
    if (
        [username, email, fullName, password].some((field) => field?.trim() == "")
    ) {
        throw new ApiError(400, "All fields is required")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    // console.log(existedUser);

    if (existedUser) {
        throw new ApiError(400, "User already Exit");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.file && Array.isArray(req.files.coverImage) && req.file.coverImage.length > 0) {

        coverImageLocalPath = req.files.coverImage[0].path;
    }



    // console.log(avatarLocalPath)
    // console.log(coverImageLocalPath)
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);


    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar?.url,
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
    // console.log(registerUser);


})

const loginUser = asyncHandler(async (req, res) => {

    // get Login user details from frontend
    // validation - not empty
    // Find user already exists: username or email 
    // password check - compare 
    // a give access token & refreshtoken 
    // send cookies 
    // return res


    const { email, username, password } = req.body

    if (!email && !username) {
        throw new ApiError(404, " Email or username is requied for login")
    }
    if (!password) {
        throw new ApiError(404, " password is requied")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User doesn't exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid user credentials")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User Logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // set give undifine which is not updating so
            }                   // $unset: is the solution
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const regenerateAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorised request")
    }

    try {

        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedRefreshToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }


        // const refreshToken = user?.refreshToken

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(400, "Refresh token is expired")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        // console.log("refreshToken:",refreshToken)
        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {

                        accessToken,
                        refreshToken
                    },
                    "Access Token Refreshed"
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invaild old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    // const user = await User.findById(req.user?._id)

    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    const fields = [fullName, email];

    const hasValidField = fields.some(
        field => field?.trim()
    );

    if (!hasValidField) {
        throw new ApiError(
            400,
            "Please provide at least a full name or an email to update."
        );
    }
    // if (!fullName) {
    //     throw new ApiError(400, "Full name required")
    // }
    // if (!email) {
    //     throw new ApiError(400, "Email required")
    // }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true })
        .select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Fullname  and email updated successfuly"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true })
        .select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Avatar is updated successfully"
            )
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true })
        .select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Cover Image is updated successfully"
            )
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channal",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedTOCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscribedTOCount: 1,
                isSubscribed: 1,
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }
    console.log(channel)

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                channel[0],
                "User Channel fetched sucessfully"
            ))
})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }

                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    // console.log("user:",user);
    // console.log("user[0]:",user[0]);
    // console.log("user[0].watchHistory:",user[0].watchHistory);

    return res
        .status(200)
        .json(new ApiResponse(200,
            user[0].watchHistory,
            "User Watch History fetched successfully"
        )
        )
})

export { registerUser, loginUser, logoutUser, regenerateAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory }