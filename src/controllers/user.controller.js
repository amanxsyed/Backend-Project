import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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


export { registerUser };
