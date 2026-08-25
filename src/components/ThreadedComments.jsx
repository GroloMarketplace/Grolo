import { useEffect, useRef, useState } from "react";
import OutlineIcon from "./OutlineIcon";

export default function ThreadedComments({
  comments,
  currentUser,
  initialCommentId,
  highlightedCommentId,
  focusReply,
  onSubmit,
  onReplyChange,
  onLikeComment,
  inputRef,
  emptyMessage = "No comments yet.",
}) {
  const commentRefs = useRef({});
  const [replyTo, setReplyTo] = useState(null);
  const [text, setText] = useState("");
  const commentsRef = useRef(comments);
  const targetCommentRef = useRef(null);
  commentsRef.current = comments;

  useEffect(() => {
    if (!initialCommentId) return;
    targetCommentRef.current = findComment(commentsRef.current, initialCommentId);
    commentRefs.current[initialCommentId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setReplyTo(targetCommentRef.current ?? null);
  }, [initialCommentId]);

  useEffect(() => {
    if (focusReply) window.setTimeout(() => inputRef?.current?.focus(), 0);
  }, [focusReply, inputRef, replyTo]);

  const selectReply = (comment) => {
    setReplyTo(comment);
    onReplyChange?.(comment);
    window.setTimeout(() => inputRef?.current?.focus(), 0);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) return;
    onSubmit({ text: trimmedText, parentComment: replyTo });
    setText("");
    setReplyTo(null);
    onReplyChange?.(null);
  };

  const displayComments = comments.map(flattenCommentReplies);

  return (
    <>
      <div className="flex flex-col gap-5">
        {displayComments.length === 0 ? <p className="text-[14px] text-[#828282]">{emptyMessage}</p> : displayComments.map((comment) => (
          <CommentBranch
            key={comment.id}
            comment={comment}
            depth={0}
            highlightedCommentId={highlightedCommentId ?? initialCommentId}
            commentRefs={commentRefs}
            onReply={selectReply}
            onLike={onLikeComment}
          />
        ))}
      </div>
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-[#E6E6E6] bg-white px-4 py-3">
        {replyTo && <div className="mb-2 flex items-center justify-between gap-3 text-[12px] text-[#828282]">
          <span>Replying to <span className="font-medium text-black">{replyTo.username}</span><br /><span className="text-black">“{replyTo.text}”</span></span>
          <button type="button" onClick={() => { setReplyTo(null); onReplyChange?.(null); }} className="shrink-0 font-medium text-[#498467]">Cancel</button>
        </div>}
        <div className="flex items-center gap-2">
          <img src={currentUser.avatar} alt="Your profile" className="h-8 w-8 rounded-full object-cover" />
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={replyTo ? "Type your reply..." : "Add a comment..."}
            className="min-w-0 flex-1 rounded-full bg-[#F5F5F5] px-4 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-[#498467]"
          />
          <button type="submit" className="text-[14px] font-semibold text-[#498467]">Send</button>
        </div>
      </form>
    </>
  );
}

function CommentBranch({ comment, depth, highlightedCommentId, commentRefs, onReply, onLike }) {
  const [liked, setLiked] = useState(Boolean(comment.liked));
  const [likes, setLikes] = useState(comment.likes ?? 0);
  const highlighted = String(comment.id) === String(highlightedCommentId);

  return (
    <div ref={(element) => { commentRefs.current[comment.id] = element; }} className={`w-full rounded-lg p-2 ${highlighted ? "bg-[#498467]/15" : ""}`}>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_2.5rem] gap-2">
        <div className={`${depth ? "border-l border-[#E6E6E6] pl-3" : ""} flex min-w-0 gap-3`} style={depth ? { marginLeft: `${depth * 32}px` } : undefined}>
          <img src={comment.avatar} alt={comment.username} className="h-8 w-8 shrink-0 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2"><span className="text-[14px] font-semibold">{comment.username}</span><span className="text-[12px] text-[#828282]">{comment.timestamp}</span></div>
            <p className="mt-1 text-[14px] leading-[140%]">{comment.text}</p>
            <button type="button" onClick={() => onReply(comment)} className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#828282]"><OutlineIcon name="reply" size={14} />Reply</button>
          </div>
        </div>
        <div className="flex justify-center">
          <button type="button" aria-label={liked ? "Unlike comment" : "Like comment"} onClick={async () => {
            const nextLiked = !liked;
            setLiked(nextLiked);
            setLikes((value) => value + (nextLiked ? 1 : -1));
            try {
              await onLike?.(comment, nextLiked);
            } catch {
              setLiked(liked);
              setLikes((value) => value + (nextLiked ? -1 : 1));
            }
          }} className={`flex min-h-8 min-w-8 flex-col items-center justify-center text-[19px] leading-none transition-transform active:scale-125 ${liked ? "text-[#498467]" : "text-[#828282]"}`}>
            <HeartIcon filled={liked} />
            {likes > 0 && <span className="mt-0.5 text-[11px] leading-none">{likes}</span>}
          </button>
        </div>
      </div>
      <div className="w-full">
        {comment.replies?.map((reply) => <CommentBranch key={reply.id} comment={reply} depth={depth + 1} highlightedCommentId={highlightedCommentId} commentRefs={commentRefs} onReply={onReply} onLike={onLike} />)}
      </div>
    </div>
  );
}

function flattenCommentReplies(comment) {
  const replies = (comment.replies ?? []).flatMap((reply) => [
    { ...reply, replies: [] },
    ...flattenNestedReplies(reply.replies ?? []),
  ]);
  return { ...comment, replies };
}

function flattenNestedReplies(replies) {
  return replies.flatMap((reply) => [
    { ...reply, replies: [] },
    ...flattenNestedReplies(reply.replies ?? []),
  ]);
}

function findComment(comments, id) {
  if (!id) return null;
  for (const comment of comments) {
    if (String(comment.id) === String(id)) return comment;
    const nested = findComment(comment.replies ?? [], id);
    if (nested) return nested;
  }
  return null;
}

function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill={filled ? "#498467" : "none"}>
      <path d="M17.37 3.84a4.13 4.13 0 0 0-6.49-.5L10 4.22l-.88-.88a4.13 4.13 0 0 0-6.13 5.5l.63.88L10 17.19l6.48-6.48.63-.88a4.13 4.13 0 0 0 .26-6.49Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
