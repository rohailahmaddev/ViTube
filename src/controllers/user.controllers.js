import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js"
import ApiResponse from "../utils/apiResponse.js"
import ApiError from "../utils/apiError.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"

const registerUser = asyncHandler( async (req, res) => {

    const { fullName, username, email, password } = req.body

    //validation
    if( [fullName, username, email, password].some((field) => field?.trim() === "")) {
        
        throw new ApiError( 400, "All fields required" );

    }

    const existedUser = await User.findOne({
        $or:[ {username}, {email} ]
    })

    if(existedUser){
        throw new ApiError( 409 , "User already exist" )
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverLocalPath = req.files?.coverImage[0]?.path


    //upload avatar
    if(!avatarLocalPath){
        throw new ApiError(409, "Avatar file is missing")
    }
    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Uploaded successfully", avatar)
    } catch (error) {
        throw new ApiError(500, "Failed to upload avatar")
    }

    
    //upload cover image
    let coverImage;
    if(coverLocalPath){
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("Uploaded successfully", coverImage)
    } catch (error) {
        throw new ApiError(500, "Failed to upload cover image")
    }
    }

try {
        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase()  
        });
    
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )
    
        if(!createdUser){
            throw new ApiError(500, "Something went wrong while registring user")
        }
    
        return res
        .status(200)
        .json(new ApiResponse(200, createdUser, "User registered successfully"))
} catch (error) {
    if(avatar){
        await deleteFromCloudinary(avatar.public_id)
    }
    if(coverImage){
        await deleteFromCloudinary(coverImage.public_id)
    }
    throw new ApiError(500, "Something went wrong while registering the user and images are deleted")
}

})

export default registerUser