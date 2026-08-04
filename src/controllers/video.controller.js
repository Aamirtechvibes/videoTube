import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    // check video is not empty
    // Get video from DB by id
    // return res
    if (!videoId) {
        throw new ApiError(404, "video id required")
    }

    const { video } = await Video.findById(videoId)

    return res
        .status(200)
        .json(new ApiResponse(200,
            video.url,
            "video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    // check video id is not empty
    // Get video's title, description, thumbnail from user by id to DB
    // Update it - new: true
    // save in DB

    if (!videoId) {
        throw new ApiError(404, "video id required")
    }

    const fields = [title, description];

    const hasValidField = fields.some(
        field => field?.trim()
    );

    if (!hasValidField) {
        throw new ApiError(
            400,
            "Please provide at least a title or a description  to update."
        );
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
            }
        }, { new: true })

    return res
        .status(200)
        .json(new ApiResponse(200,
            video,
            "Title or a description updated successfuly"
        ))
})

const updateVideoThumbnail = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    const thumbnailLocalPath = req.file?.path

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is missing")
    }

    const Thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!Thumbnail.url) {
        throw new ApiError(400, "Error while uploading on thumbnail")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                thumbnail: thumbnail.url
            }
        },
        { new: true })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Thumbnail is updated successfully"
            )
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    // check video id 
    // delete video
    // return
    //

    if (!videoId) {
        throw new ApiError(404, "video id required")
    }

    const video = await Video.findByIdAndDelete(videoId)

     return res
        .status(200)
        .json(new ApiResponse(200,
            video,
            "Video deleted successfuly"
        ))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    updateVideoThumbnail
}