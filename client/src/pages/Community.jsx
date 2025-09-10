import { useUser } from "@clerk/clerk-react";
import React, { useEffect, useState } from "react";
import { dummyPublishedCreationData } from "../assets/assets";
import { Heart } from "lucide-react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Community = () => {
  const [creations, setCreations] = useState([]);
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  const { getToken } = useAuth();

  const fetchCreations = async () => {
    try {
      const { data } = await axios.get("/api/user/get-published-creations", {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data.success) {
        setCreations(data.creations);
      } else {
        toast.error(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const imageLikeToggle = async (id) => {
    try {
      const { data } = await axios.post(
        "/api/user/toggle-like-creations",
        { id },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        }
      );

      if (data.success) {
        toast.success(data.message);
        await fetchCreations();
      } else {
        toast.error(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message || "Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    if (user) {
      fetchCreations();
    }
  }, [user]);

  return !loading ? (
    <div className="flex-1 flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Community</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {creations.map((creation) => (
          <div key={creation.id} className="group relative aspect-square overflow-hidden rounded-lg">
            <img src={creation.content} alt={creation.prompt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-103" />

            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-3 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <p className="text-sm line-clamp-2">{creation.prompt}</p>

              <div className="mt-1 flex items-center justify-end gap-1.5">
                <p className="text-sm font-medium">{creation.likes.length}</p>
                <Heart onClick={() => imageLikeToggle(creation.id)} className={`h-5 w-5 cursor-pointer transition-transform hover:scale-110 ${creation.likes.includes(user.id) ? "fill-red-500 text-red-500" : "text-white"}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="flex justify-center items-center h-full">
      <span className="w-10 h-10 my-1 rounded-full border-3 border-primary border-t-transparent animate-spin"></span>
    </div>
  );
};

export default Community;
