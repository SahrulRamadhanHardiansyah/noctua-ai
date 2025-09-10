import { Hash, Sparkles } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@clerk/clerk-react";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const BlogTitles = () => {
  const blogCategories = ["General", "Technology", "Health", "Finance", "Travel", "Food", "Lifestyle"];

  const [selectedCategory, setSelectedCategory] = useState("General");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const prompt = `Generate a blog title for the keyword ${input} in the category ${selectedCategory}.`;

      const { data } = await axios.post(
        "/api/ai/generate-blog-title",
        { prompt },
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
              <Sparkles className="w-6 text-[#8E37EB]" />
              <h1 className="text-xl font-semibold">AI Title Generator</h1>
            </div>

            <p className="mt-6 text-sm font-medium">Keyword</p>
            <input
              onChange={(e) => setInput(e.target.value)}
              value={input}
              type="text"
              className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
              placeholder="The future of artificial intelligence is..."
              required
            />

            <p className="mt-4 text-sm font-medium">Category</p>
            <div className="mt-3 flex gap-3 flex-wrap">
              {blogCategories.map((item) => (
                <span onClick={() => setSelectedCategory(item)} className={`text-xs px-4 py-1 border rounded-md cursor-pointer ${selectedCategory === item ? "bg-purple-50 text-purple-700" : "border-gray-300 text-gray-500"}`} key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <button disabled={loading} className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#C341F6] to-[#8E37EB] text-white px-4 py-2 text-sm rounded-lg cursor-pointer mt-auto">
            {loading ? <span className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></span> : <Hash className="w-5" />}
            Generate Title
          </button>
        </form>

        {/* Right Col */}
        <div className="w-full p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96">
          <div className="flex items-center gap-3">
            <Hash className="w-5 h-5 text-[#8E37EB]" />
            <h1 className="text-xl font-semibold">Generated Titles</h1>
          </div>
          {!content ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
                <Hash className="w-9 h-9" />
                <p>Enter topic and click "Generate Title" to get started</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-600 prose max-w-full">
              <div className="reset-tw">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogTitles;
