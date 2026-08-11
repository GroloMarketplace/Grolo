import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { POST_CLASSIFICATIONS } from "../data/postClassifications";
import { usePosts } from "../context/PostContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useAuth } from "../context/AuthContext";

export default function CreatePost() {
  const navigate = useNavigate();
  const { addPost } = usePosts();
  const { settings: buyerProfile } = useBuyerSettings();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [classification, setClassification] = useState("");
  const [selectedProduct] = useState(null);

  const handlePublish = () => {
    // Handle post publishing logic
    const post = addPost({
      name: buyerProfile.displayName || user?.user_metadata?.name || "",
      sellerId: user?.id ?? "current-user",
      authorId: buyerProfile.displayName,
      productId: selectedProduct?.id ?? null,
      location: buyerProfile.location || buyerProfile.city || "",
      latitude: buyerProfile.latitude ?? null,
      longitude: buyerProfile.longitude ?? null,
      group: "Your Community",
      classification,
      time: "Just now",
      avatar: buyerProfile.avatar,
      image: "",
      body: content,
      likes: 0,
      comments: 0,
      shares: 0,
      sends: 0,
    });
    console.log("Post Created:", post.id);
    navigate("/", { state: { tab: "Your Community", communityFilter: "Posts" } });
  };

  return (
    <MobileScreenLayout>
      <Header title="Create Post" onBack={() => navigate("/my-shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar p-4">
        {/* Post Content */}
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-32 p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-[14px] font-semibold">Post Classification</label>
          <select required value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full rounded-lg border border-[#E6E6E6] px-3 py-3 text-[14px] outline-none focus:border-[#498467]">
            <option value="">Select classification</option>
            {POST_CLASSIFICATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>

        {/* Image Upload Placeholder */}
        <div className="mb-4">
          <div className="border-2 border-dashed border-[#E6E6E6] rounded-lg p-6 text-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto mb-2 text-[#828282]"
            >
              <path
                d="M12 4.5v15m7.5-7.5h-15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-[14px] text-[#828282]">Add photos</p>
          </div>
        </div>

        {/* Product Attachment Section */}
        <div className="mb-4">
          <p className="text-[14px] font-semibold mb-2">Attach a listing (optional)</p>
          <div className="border border-[#E6E6E6] rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#828282]"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[14px] text-[#828282]">Select a listing to attach</p>
              </div>
            </div>
          </div>
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          className="w-full bg-[#498467] text-white py-3 rounded-lg text-[16px] font-medium"
        >
          Publish Post
        </button>
      </div>
    </MobileScreenLayout>
  );
}
