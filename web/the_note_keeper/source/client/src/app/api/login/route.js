import { NextRequest } from "next/server"

/**
 * @param {NextRequest} req
 */
export const POST = async (req) => {
  // TODO: Check req headers for Host and XFF

  return Response.json({
    success: false,
    error: {
      code: "SERVER_ERROR",
      digest: "TE9HSU4gTk9UIElNUExFTUVOVEVE",
      message: "Login failed due to server error"
    },
    data: null
  }, {
    status: 500
  })
}
