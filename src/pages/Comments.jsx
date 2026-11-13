import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import ThreadedComments from "../components/ThreadedComments";
import { formatEventDate, formatEventTime } from "../context/EventContext";
import { formatLocation } from "../data/locations";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useEngagement } from "../context/EngagementContext";
import { useAuth } from "../context/AuthContext";
import { useAuthPrompt } from "../context/AuthPromptContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { createComment, getComments } from "../lib/api/comments";
import { useResolvedSeller } from "../hooks/useEntityResolution";

const CURRENT_USER = {
  username: "you",
};


export default function Comments() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { settings } = useBuyerSettings();
  const { user } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const { updatePost } = useEngagement();
  const content = state?.content ?? fallbackContent;
  const contentId = content.type === "event" ? content.event?.id : content.post?.id;
  const storageKey = `grolo-comments-${content.type}-${contentId ?? "unknown"}`;
  const [comments, setComments] = useState(() => readLocalComments(storageKey, content, state?.highlightedComment));
  const replyInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadComments() {
      if (!contentId) return;
      if (!isSupabaseConfigured) {
        return;
      }
      try {
        const remoteComments = await getComments(content.type, contentId);
        if (!cancelled) {
          const next = mergeHighlightedComment(commentsFromRows(remoteComments), state?.highlightedComment);
          setComments(next);
          persistLocalComments(storageKey, next);
          if (content.type === "post" && content.post?.id != null) updatePost(content.post.id, { comments: countComments(next) });
        }
      } catch (error) {
      }
    }
    loadComments();
    return () => { cancelled = true; };
  }, [content.type, contentId, state?.highlightedComment, storageKey, updatePost, user?.id]);

  const handleSubmit = async ({ text, parentComment }) => {
    if (!requireAuth(null, "post comments")) return;
    const localComment = {
      id: `${parentComment ? "reply" : "comment"}-${Date.now()}`,
      ...CURRENT_USER,
      avatar: settings.avatar,
      timestamp: "now",
      text,
      likes: 0,
    };
    try {
      let newComment = localComment;
      if (isSupabaseConfigured && user?.id && contentId) {
        newComment = await createComment({
          contentType: content.type,
          contentId,
          parentCommentId: parentComment?.id,
          body: text,
          authorId: user.id,
          actorUsername: settings.username || settings.displayName,
          actorAvatarUrl: settings.avatar,
        });
      } else {
      }
      setComments((current) => {
        const next = parentComment ? addReplyToComment(current, parentComment.id, newComment) : [newComment, ...current];
        persistLocalComments(storageKey, next);
        if (content.type === "post" && content.post?.id != null) updatePost(content.post.id, { comments: countComments(next) });
        return next;
      });
    } catch (error) {
      console.error("Unable to create comment", { parent_type: content.type, parent_id: String(contentId ?? ""), author_id: user?.id ?? null, error: error?.message ?? String(error) });
    }
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

function readLocalComments(storageKey, content, highlightedComment) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) return saved;
  } catch {
  }
  const sourceComments = content?.post?.commentItems ?? content?.event?.commentItems ?? [];
  return highlightedComment ? [highlightedComment, ...sourceComments] : sourceComments;
}

function persistLocalComments(storageKey, comments) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(comments));
  } catch {
  }
}

function mergeHighlightedComment(comments, highlightedComment) {
  if (!highlightedComment || comments.some((comment) => String(comment.id) === String(highlightedComment.id))) return comments;
  return [highlightedComment, ...comments];
}

function commentsFromRows(rows) {
  const byId = new Map(rows.map((comment) => [String(comment.id), { ...comment, replies: [] }]));
  const roots = [];
  byId.forEach((comment) => {
    const parent = comment.parentCommentId && byId.get(String(comment.parentCommentId));
    if (parent) parent.replies.push(comment);
    else roots.push(comment);
  });
  return roots;
}

function OriginalContent({ content, profile }) {
  const liveSeller = useResolvedSeller(content.type === "post" ? content.post?.sellerId ?? content.post?.authorId : null);
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
          <span>{formatLocation(event)}</span>
        </div>
      </section>
    );
  }

  const { post } = content;
  const postAvatar = post.sellerId === "current-user"
    ? profile.avatar
    : liveSeller?.avatar ?? post.avatar;
  return (
    <section className="rounded-lg border border-[#E6E6E6] p-3">
      <div className="flex items-center gap-2">
        <img src={postAvatar} alt={post.name} className="h-8 w-8 rounded-full object-cover" />
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
