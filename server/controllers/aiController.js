import { GoogleGenerativeAI } from "@google/generative-ai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: "v1",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan != "premium" && free_usage >= 10) {
      return res.json({ success: false, message: "Free usage limit reached. Please upgrade to premium." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: length,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article')`;

    if (plan != "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan != "premium" && free_usage >= 10) {
      return res.json({ success: false, message: "Free usage limit reached. Please upgrade to premium." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;

    if (plan != "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan != "premium") {
      return res.json({ success: false, message: "This feature is only available to premium users. Please upgrade your plan." });
    }

    const payload = {
      text_prompts: [
        {
          text: prompt,
        },
      ],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1,
    };

    const engineId = "stable-diffusion-xl-1024-v1-0";
    const apiHost = "https://api.stability.ai";

    const { data } = await axios.post(`${apiHost}/v1/generation/${engineId}/text-to-image`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "application/json",
      },
    });

    const image = data.artifacts[0];
    const base64Image = `data:image/png;base64,${image.base64}`;

    const { secure_url } = await cloudinary.uploader.upload(base64Image, {
      folder: "noctuai_creations",
    });

    await sql`INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    if (error.response) {
      console.error("Error response from Stability AI:", error.response.data);
      return res.json({ success: false, message: error.response.data.message || "Failed to generate image." });
    }
    console.error("Generic error:", error.message);
    return res.json({ success: false, message: error.message });
  }
};

// ClipDrop Function (Problematic)
// export const generateImage = async (req, res) => {
//   try {
//     const { userId } = req.auth();
//     const { prompt, publish } = req.body;
//     const plan = req.plan;

//     if (plan != "premium") {
//       return res.json({ success: false, message: "This feature is only available to premium users. Please upgrade your plan." });
//     }

//     const formData = new FormData();
//     formData.append("prompt", prompt);
//     const data = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
//       headers: {
//         "x-api-key": process.env.CLIPDROP_API_KEY,
//       },
//       responseType: "arraybuffer",
//     });

//     const base64Image = `data:image/png;base64,${Buffer.from(data, "binary").toString("base64")}`;

//     const { secure_url } = await cloudinary.uploader.upload(base64Image);

//     await sql`INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;

//     res.json({ success: true, content: secure_url });
//   } catch (error) {
//     console.log(error.message);
//     return res.json({ success: false, message: error.message });
//   }
// };

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    if (plan != "premium") {
      return res.status(403).json({ success: false, message: "This feature is only available to premium users. Please upgrade your plan." });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      transformation: [
        {
          effect: "background_removal",
        },
      ],
    });

    if (!result || !result.secure_url) {
      return res.status(500).json({ success: false, message: "Failed to process image" });
    }

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'Remove background from image', ${result.secure_url}, 'image')`;

    fs.unlinkSync(req.file.path);
    res.json({ success: true, content: result.secure_url });
  } catch (error) {
    console.error("Error in removeImageBackground:", error);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError);
      }
    }
    return res.status(500).json({ success: false, message: "Failed to process image. Please try again." });
  }
};

export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;

    if (plan != "premium") {
      return res.json({ success: false, message: "This feature is only available to premium users. Please upgrade your plan." });
    }

    const { public_id } = await cloudinary.uploader.upload(image.path);

    const imageUrl = cloudinary.url(public_id, {
      transformation: [
        {
          effect: `gen_remove:${object}`,
        },
      ],
      resource_type: "image",
    });

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${`Remove ${object} from image`}, ${imageUrl}, 'image')`;

    fs.unlinkSync(image.path);
    res.json({ success: true, content: imageUrl });
  } catch (error) {
    console.log(error.message);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError);
      }
    }
    return res.json({ success: false, message: error.message });
  }
};

export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No resume file uploaded" });
    }

    if (plan != "premium") {
      return res.status(403).json({ success: false, message: "This feature is only available to premium users. Please upgrade your plan." });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "File size exceeds the 5MB limit." });
    }

    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdf(dataBuffer);

      const prompt = `Review the following resume and provide constructive feedback on its strengths, weakness, and areas for improvement. Please format the response in markdown with clear sections for: Summary, Strengths, Areas for Improvement, and Specific Recommendations. \n\n${pdfData.text}`;

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')`;

      fs.unlinkSync(req.file.path);
      return res.json({ success: true, content });
    } catch (parseError) {
      console.error("Error processing PDF:", parseError);
      return res.status(400).json({ success: false, message: "Could not process the PDF file. Please make sure it's a valid PDF document." });
    }
  } catch (error) {
    console.error("Error in resumeReview:", error);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError);
      }
    }
    return res.status(500).json({ success: false, message: "Failed to process resume. Please try again." });
  }
};
