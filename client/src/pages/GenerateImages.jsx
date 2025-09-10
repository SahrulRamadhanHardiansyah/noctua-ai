import { Hash, Image, Sparkles } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const GenerateImages = () => {
  const imageStyle = ["Realistic", "Cartoon", "Abstract", "Surreal", "Anime", "Line Art", "Pixel Art"];

  const [selectedStyle, setSelectedStyle] = useState("Realistic");
  const [input, setInput] = useState("");
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const prompt = `Generate a ${selectedStyle} image of ${input}.`;

      const { data } = await axios.post(
        "/api/ai/generate-image",
        { prompt, publish },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        setContent(data.content);
      } else {
        toast.error(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-scroll p-6 text-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-6">
        {/* Left Col */}
        <form onSubmit={onSubmitHandler} className="w-full p-4 bg-white rounded-lg border border-gray-200 flex flex-col min-h-[300px]">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 text-[#00AD25]" />
              <h1 className="text-xl font-semibold">AI Image Generator</h1>
            </div>

            <p className="mt-6 text-sm font-medium">Describe your image</p>
            <textarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              rows={4}
              className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
              placeholder="Describe what do you want to see in the image..."
              required
            />

            <p className="mt-4 text-sm font-medium">Style</p>
            <div className="mt-3 flex gap-3 flex-wrap">
              {imageStyle.map((item) => (
                <span onClick={() => setSelectedStyle(item)} className={`text-xs px-4 py-1 border rounded-md cursor-pointer ${selectedStyle === item ? "bg-green-50 text-green-700" : "border-gray-300 text-gray-500"}`} key={item}>
                  {item}
                </span>
              ))}
            </div>

            <div className="my-6 flex items-center gap-2">
              <label className="relative cursor-pointer">
                <input type="checkbox" onChange={(e) => setPublish(e.target.checked)} checked={publish} className="sr-only peer" />

                <div className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-green-500 transition"></div>

                <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition peer-checked:translate-x-4"></span>
              </label>
              <p className="text-sm">Make this image public</p>
            </div>
          </div>

          <button disabled={loading} className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#00AD25] to-[#04FF50] text-white px-4 py-2 text-sm rounded-lg cursor-pointer mt-auto">
            {loading ? <span className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></span> : <Image className="w-5" />}
            Generate Image
          </button>
        </form>

        {/* Right Col */}
        <div className="w-full p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96">
          <div className="flex items-center gap-3">
            <Image className="w-5 h-5 text-[#00AD25]" />
            <h1 className="text-xl font-semibold">Generated Images</h1>
          </div>
          {!content ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
                <Image className="w-9 h-9" />
                <p className="">Enter topic and click "Generate Image" to get started</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 h-full">
              <img src={content} alt="image" className="w-full h-full rounded-md" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateImages;
