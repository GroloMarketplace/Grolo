import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { formatEventDate, formatEventTime } from "../context/EventContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";

const CURRENT_USER = {
  username: "you",
};

const MOCK_COMMENTS = [
  {
    id: "comment-1",
    username: "miafields",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    timestamp: "2 hrs ago",
    text: "This looks wonderful. Thanks for sharing with the community!",
    likes: 4,
  },
  {
    id: "comment-2",
    username: "localfoodie",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
    timestamp: "1 hr ago",
    text: "I will definitely check this out.",
    likes: 2,
  },
];

export default function Comments() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { settings } = useBuyerSettings();
  const content = state?.content ?? fallbackContent;
  const [comments, setComments] = useState(() =>
    state?.highlightedComment
      ? [state.highlightedComment, ...MOCK_COMMENTS]
      : MOCK_COMMENTS,
  );
  const [commentText, setCommentText] = useState("");
  const commentRefs = useRef({});
  const replyInputRef = useRef(null);

  useEffect(() => {
    if (!state?.commentId) return;
    commentRefs.current[state.commentId]?.scrollIntoView({ block: "center" });
    if (state.focusReply) replyInputRef.current?.focus();
  }, [state]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    setComments((current) => [
      {
        id: `comment-${Date.now()}`,
        ...CURRENT_USER,
        avatar: settings.avatar,
        timestamp: "now",
        text,
        likes: 0,
      },
      ...current,
    ]);
    setCommentText("");
  };

  return (
    <MobileScreenLayout>
      <Header title="Comments" onBack={() => navigate(-1)} />
      <div className="overflow-y-auto flex-1 no-scrollbar px-4 py-5">
        <OriginalContent content={content} profile={settings} />
        <div className="mt-6 border-t border-[#E6E6E6] pt-5">
          <h2 className="text-[18px] font-semibold">Comments</h2>
          <div className="mt-4 flex flex-col gap-5">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                commentRef={(element) => {
                  commentRefs.current[comment.id] = element;
                }}
                highlighted={comment.id === state?.commentId}
              />
            ))}
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-[#E6E6E6] bg-white px-4 py-3">
        <img src={settings.avatar} alt="Your profile" className="h-8 w-8 rounded-full object-cover" />
        <input
          ref={replyInputRef}
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Add a comment..."
          className="min-w-0 flex-1 rounded-full bg-[#F5F5F5] px-4 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-[#498467]"
        />
        <button type="submit" className="text-[14px] font-semibold text-[#498467]">Send</button>
      </form>
    </MobileScreenLayout>
  );
}

function OriginalContent({ content, profile }) {
  if (content.type === "event") {
    const { event, seller } = content;
    return (
      <section className="rounded-lg border border-[#E6E6E6] p-3">
        <div className="flex items-center gap-2">
          <img src={seller?.avatar} alt={seller?.name} className="h-8 w-8 rounded-full object-cover" />
          <div>
            <div className="text-[14px] font-semibold text-[#498467]">{seller?.name}</div>
            <div className="text-[12px] text-[#828282]">{formatEventDate(event.date)}</div>
          </div>
        </div>
        <img src={event.image} alt={event.title} className="mt-3 aspect-square w-full rounded object-cover" />
        <h1 className="mt-3 text-[17px] font-semibold">{event.title}</h1>
        <p className="mt-1 text-[14px] leading-[140%]">{event.description}</p>
        <div className="mt-3 flex flex-col gap-1 text-[12px] text-[#828282]">
          <span>{formatEventDate(event.date)} · {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</span>
          <span>{event.location}</span>
        </div>
      </section>
    );
  }

  const { post } = content;
  return (
    <section className="rounded-lg border border-[#E6E6E6] p-3">
      <div className="flex items-center gap-2">
        <img src={post.sellerId === "sarahs-backyard" || !post.avatar ? profile.avatar : post.avatar} alt={post.name} className="h-8 w-8 rounded-full object-cover" />
        <div>
          <div className="text-[14px] font-semibold text-[#498467]">{post.name}</div>
          <div className="text-[12px] text-[#828282]">{post.time}</div>
        </div>
      </div>
      {post.image && <img src={post.image} alt="" className="mt-3 aspect-square w-full rounded object-cover" />}
      <p className="mt-3 text-[14px] leading-[140%]">{post.body}</p>
    </section>
  );
}

function CommentItem({ comment, commentRef, highlighted }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes);

  const handleLike = () => {
    setLiked((current) => !current);
    setLikes((current) => current + (liked ? -1 : 1));
  };

  return (
    <div
      ref={commentRef}
      className={`flex gap-3 rounded-lg ${highlighted ? "bg-[#498467]/10 p-2" : ""}`}
    >
      <img src={comment.avatar} alt={comment.username} className="h-8 w-8 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold">{comment.username}</span>
          <span className="text-[12px] text-[#828282]">{comment.timestamp}</span>
        </div>
        <p className="mt-1 text-[14px] leading-[140%]">{comment.text}</p>
        <button type="button" onClick={handleLike} className={`mt-2 flex items-center gap-1 text-[12px] ${liked ? "text-[#498467]" : "text-[#828282]"}`}>
          <HeartIcon filled={liked} />
          {likes}
        </button>
      </div>
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill={filled ? "#498467" : "none"}>
      <path d="M17.37 3.84a4.13 4.13 0 0 0-6.49-.5L10 4.22l-.88-.88a4.13 4.13 0 0 0-6.13 5.5l.63.88L10 17.19l6.48-6.48.63-.88a4.13 4.13 0 0 0 .26-6.49Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fallbackContent = {
  type: "post",
  post: {
    name: "Grolo Community",
    time: "now",
    avatar: "",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
    body: "Welcome to the Grolo community.",
  },
};
