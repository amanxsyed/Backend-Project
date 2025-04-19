import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessandRefreshToken = async (userId) => {
  try{
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };

  } catch(error){ 
    throw new ApiError(500, "Something went wrong while generating access & refresh token!");
  }
}


const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation - not empty
  // check if user already exists: username, email
  //chck for images or avatar
  //upload them on cloudinary
  //create user object
  // create entry in db
  //remove password and refresh token from response.
  //chck for user creation
  //return response

  const { fullName, email, password, username} = req.body;
  // console.log("email :", email);

  if (
    [fullName, email, password, username].some(
      (field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  const userExisted = await User.findOne({ $or: [{ email }, { username }] });

  if (userExisted) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  // console.log("req.files", req.files);
  // console.log("req.body", req.body);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.cover[0]?.path;
  let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!");
  }

  // console.log("Avatar local path:", avatarLocalPath);

  const avatar = await cloudinaryUpload(avatarLocalPath);
  const coverImage = await cloudinaryUpload(coverImageLocalPath);

  if(!avatar) {
    throw new ApiError(500, "Avatar upload failed!");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || null,
    email,
    username: username.toLowerCase(),
    password,

  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully!")
  )

});

const loginUser = asyncHandler(async(req, res)=>{
  //req body => data
  // username or email
  // find the user
  // check if user exists password chceck
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;
  console.log(email);
   

  if(!(username || email)){
    throw new ApiError(400, "Username or email is required!");
  };

  const user = await User.findOne({
    $or: [{ email }, { username }]
  });

  if(!user){
    throw new ApiError(404, "User doesn't exist!");
  }

  const isPasswordValid = await user.comparePassword(password)

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid password!");
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure : true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(200, {
      user: loggedInUser,
      accessToken,
      refreshToken
    }
    , "User logged in successfully!"
  )
  )



});

const logoutUser = asyncHandler(async(req, res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      }
    },
    {
      new: true,
    }
  )
  const options = {
    httpOnly: true,
    secure : true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(
    new ApiResponse(200, {}, "User logged out successfully!")
  )
});

const refreshAccessToken = asyncHandler(async(req, res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized request!");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id) 
  
    if(!user){
      throw new ApiError(401, "Invalid refresh token!");
    }
  
    if(user?.refreshToken !== incomingRefreshToken){
      throw new ApiError(401, "Refresh token is expired or used!");
    }
  
    const options = {
      httpOnly: true,
      secure : true
    }
  
    const { accessToken, newRefreshToken } = await generateAccessandRefreshToken(user._id);
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, 
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "New access token refreshed successfully!"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token!");
    
  }



});




export { registerUser, loginUser, logoutUser, refreshAccessToken };
