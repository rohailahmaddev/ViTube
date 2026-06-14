import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js"
import ApiResponse from "../utils/apiResponse.js"
import ApiError from "../utils/apiError.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"

const getAccessAndRefreshToken = async (userId) => {
    try {
        
        const user = await User.findById(userId)
    
        if(!user){
            throw new  ApiError(401, "User not found")      
        }
    
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken    
        await user.save({validateBeforeSave : false})
    
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating the access and refresh token")
    }
}

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

const loginUser = asyncHandler( async (req, res) => {

    const {username, email, password} = req.body

    if(!username || !email || !password){
        throw new (403, "All fields required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new (404, "User not found please register first")
    }

    const isPasswordCorrect = await User.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new (401, "Invalid credientials")
    }

    const { accessToken, refreshToken } = await getAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV === "production"
    }


    return res
    .status(200)
    .cookies("accessToken", accessToken, options)
    .cookies("refreshToken", refresh, options)
    .json(new ApiResponse(200,
        {user: loggedInUser, accessToken, refreshToken},    //for mobile apps
        "User logged in successfully"
    ))  

})

const logoutUser = asyncHandler( async ( req, res ) => {

    

})

const refreshAccessToken = asyncHandler ( async (req, res) => {

    const {incomingRefreshToken} = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required")
    }

    try {

        const decodedToken = jwt.verfiy(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Invalid refresh token")
        }

        const options = {
            httpOnly:true,
            secure:process.env.NODE_ENV === "production"
        }

        const {accessToken, refreshToken: newRefreshToken} = await getAccessAndRefreshToken(user._id)

        return res
        .status(200)
        .cookies("accessToken", accessToken, options)
        .cookies("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200,
            { accessToken, refreshToken: newRefreshToken },  
            "Access token refresh successfully"
        ))  

    } catch (error) {
        throw new ApiError(500, "Something is went wrong while refreshing the token",error.message)
    }
})
export { registerUser,loginUser, refreshAccessToken }