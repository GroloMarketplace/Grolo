import { isSupabaseConfigured, supabase } from "../supabaseClient";

const POST_SELECT = "*";

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase is not configured.");
}

function formatPostTime(createdAt) {
  if (!createdAt) return "Just now";
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;
  return `${Math.floor(elapsedHours / 24)}d`;
}

export function postFromRow(row) {
  if (!row) return null;
  const profile = row.profiles ?? row.profile ?? null;
  return {
    ...row,
    id: row.legacy_id ?? row.id,
    databaseId: row.id,
    legacyId: row.legacy_id,
    sellerId: row.seller_id ?? row.author_id,
    authorId: row.author_id,
    productId: row.product_id,
    body: row.body ?? "",
    classification: row.classification ?? "",
    location: row.location ?? "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    group: row.group_name ?? "Your Community",
    image: row.image_url ?? "",
    images: Array.isArray(row.image_urls) ? row.image_urls : [],
    media: Array.isArray(row.media) ? row.media : [],
    name: row.author_name ?? profile?.shop_name ?? profile?.display_name ?? profile?.username ?? "",
    avatar: row.author_avatar ?? profile?.avatar_url ?? "",
    time: formatPostTime(row.created_at),
    createdAt: row.created_at,
    visibility: row.visibility ?? "public",
    diagnostics: { source: "supabase", post_source: "supabase" },
  };
}

function postPayload(post, ownerId) {
  return {
    legacy_id: post.legacyId ?? (post.id?.startsWith("post-") ? post.id : null),
    author_id: ownerId,
    seller_id: ownerId,
    product_id: post.productId ?? null,
    body: post.body ?? "",
    classification: post.classification ?? "",
    location: post.location ?? "",
    latitude: post.latitude ?? null,
    longitude: post.longitude ?? null,
    group_name: post.group ?? "Your Community",
    author_name: post.name ?? "",
    author_avatar: post.avatar ?? "",
    image_url: post.image ?? "",
    image_urls: Array.isArray(post.images) ? post.images : [],
    media: Array.isArray(post.media) ? post.media : [],
    visibility: post.visibility ?? "public",
    likes: post.likes ?? 0,
    comments: post.comments ?? 0,
    reposts: post.reposts ?? 0,
    shares: post.shares ?? 0,
  };
}

export async function getPosts() {
  requireSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("visibility", "public")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const commentCounts = new Map();
  let commentCountsAvailable = false;
  const contentIds = rows.flatMap((row) => [row.id, row.legacy_id]).filter(Boolean).map(String);
  if (contentIds.length) {
    const { data: commentRows, error: commentError } = await supabase
      .from("comments")
      .select("content_id")
      .eq("content_type", "post")
      .in("content_id", contentIds);
    if (commentError) {
      console.warn("Unable to load post comment counts", { error: commentError?.message ?? String(commentError) });
    } else {
      commentCountsAvailable = true;
      (commentRows ?? []).forEach((row) => commentCounts.set(row.content_id, (commentCounts.get(row.content_id) ?? 0) + 1));
    }
  }
  return rows.map((row) => {
    const contentId = String(row.legacy_id ?? row.id);
    const actualCommentCount = commentCounts.get(contentId) ?? 0;
    const post = postFromRow({ ...row, comments: commentCountsAvailable ? actualCommentCount : row.comments ?? 0 });
    console.info("post engagement counts loaded", {
      post_id: post.id,
      displayed_comment_count: post.comments ?? 0,
      actual_comments_returned: commentCountsAvailable ? actualCommentCount : null,
      persisted_post_count: row.comments ?? 0,
      displayed_like_count: post.likes ?? 0,
    });
    return post;
  });
}

export async function createPost(post, ownerId) {
  requireSupabase();
  if (!ownerId) throw new Error("You must be signed in to create a post.");
  const { data, error } = await supabase
    .from("posts")
    .insert(postPayload(post, ownerId))
    .select(POST_SELECT)
    .single();
  if (error) throw error;
  return postFromRow(data);
}

export { POST_SELECT, postPayload };
