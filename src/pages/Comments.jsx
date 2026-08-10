import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import ThreadedComments from "../components/ThreadedComments";
import { formatEventDate, formatEventTime } from "../context/EventContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useEngagement } from "../context/EngagementContext";

const CURRENT_USER = {
  username: "you",
};


export default function Comments() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { settings } = useBuyerSettings();
  const { updatePost } = useEngagement();
  const content = state?.content ?? fallbackContent;
  const [comments, setComments] = useState(() => {
    const sourceComments = state?.content?.post?.commentItems ?? [];
    return state?.highlightedComment
      ? [state.highlightedComment, ...sourceComments]
      : sourceComments;
  });
  const replyInputRef = useRef(null);

  const handleSubmit = ({ text, parentComment }) => {
    const newReply = {
      id: `${parentComment ? "reply" : "comment"}-${Date.now()}`,
      ...CURRENT_USER,
      avatar: settings.avatar,
      timestamp: "now",
      text,
      likes: 0,
    };
    setComments((current) => {
      const next = parentComment
        ? addReplyToComment(current, parentComment.id, newReply)
        : [newReply, ...current];
      if (content.type === "post" && content.post?.id != null) updatePost(content.post.id, { comments: countComments(next) });
      return next;
    });
  };

  return (
    <MobileScreenLayout>
      <Header title="Comments" onBack={() => navigate(-1)} />
      <div className="overflow-y-auto flex-1 no-scrollbar px-4 py-5">
        <OriginalContent content={content} profile={settings} />
        <div className="mt-6 border-t border-[#E6E6E6] pt-5">
          <h2 className="text-[18px] font-semibold">Comments</h2>
          <div className="mt-4">
            <ThreadedComments
              comments={comments}
              currentUser={{ username: CURRENT_USER.username, avatar: settings.avatar }}
              initialCommentId={state?.commentId}
              highlightedCommentId={state?.replyId ?? state?.commentId}
              focusReply={state?.focusReply}
              inputRef={replyInputRef}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
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
        <img src={post.sellerId === "current-user" || !post.avatar ? profile.avatar : post.avatar} alt={post.name} className="h-8 w-8 rounded-full object-cover" />
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

function countComments(comments) {
  return comments.reduce((count, comment) => count + 1 + countComments(comment.replies ?? []), 0);
}

function addReplyToComment(comments, parentId, reply) {
  return comments.map((comment) => {
    if (String(comment.id) === String(parentId) || containsComment(comment.replies ?? [], parentId)) {
      return { ...comment, replies: [...(comment.replies ?? []), reply] };
    }
    return comment;
  });
}

function containsComment(comments, id) {
  return comments.some((comment) => String(comment.id) === String(id) || containsComment(comment.replies ?? [], id));
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
