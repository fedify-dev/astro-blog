import { getCollection } from "astro:content";
import type { RequestContext } from "@fedify/fedify";
import { Article, Create, Delete, Update } from "@fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";
import { BLOG_IDENTIFIER } from "../federation.ts";
import db from "./db.ts";
import { getFollowers } from "./store.ts";

async function hashPost(
  title: string,
  description: string,
  body: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${title}\n${description}\n${body}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const AS_PUBLIC = new URL("https://www.w3.org/ns/activitystreams#Public");

export async function syncPosts(ctx: RequestContext<unknown>): Promise<void> {
  const recipients = getFollowers();
  if (recipients.length === 0) return;

  const allPosts = await getCollection("posts");
  const current = allPosts.filter((p) => !p.data.draft);

  type DbPost = { id: string; content_hash: string; url: string };
  const storedRows = db
    .query<DbPost, []>("SELECT id, content_hash, url FROM posts")
    .all();
  const stored = new Map(storedRows.map((r) => [r.id, r]));

  const actorUri = ctx.getActorUri(BLOG_IDENTIFIER);
  const currentIds = new Set<string>();

  for (const post of current) {
    const slug = post.id;
    currentIds.add(slug);

    const articleId = ctx.getObjectUri(Article, { slug });
    const contentHash = await hashPost(
      post.data.title,
      post.data.description,
      post.body ?? "",
    );

    const article = new Article({
      id: articleId,
      attribution: actorUri,
      name: post.data.title,
      summary: post.data.description,
      content: `<p>${post.data.description}</p>`,
      url: new URL(`/posts/${slug}`, ctx.url),
      published: Temporal.Instant.from(post.data.pubDate.toISOString()),
    });

    if (!stored.has(slug)) {
      await ctx.sendActivity(
        { identifier: BLOG_IDENTIFIER },
        recipients,
        new Create({
          id: new URL(`#create`, articleId),
          actor: actorUri,
          to: AS_PUBLIC,
          object: article,
        }),
      );
      db.run(
        `INSERT INTO posts (id, title, url, content_hash, published_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          slug,
          post.data.title,
          articleId.href,
          contentHash,
          post.data.pubDate.toISOString(),
        ],
      );
    } else if (stored.get(slug)?.content_hash !== contentHash) {
      await ctx.sendActivity(
        { identifier: BLOG_IDENTIFIER },
        recipients,
        new Update({
          id: new URL(`#update-${Date.now()}`, articleId),
          actor: actorUri,
          to: AS_PUBLIC,
          object: article,
        }),
      );
      db.run(
        `UPDATE posts SET title = ?, content_hash = ?, published_at = ?
         WHERE id = ?`,
        [post.data.title, contentHash, post.data.pubDate.toISOString(), slug],
      );
    }
  }

  for (const [slug, row] of stored) {
    if (!currentIds.has(slug)) {
      await ctx.sendActivity(
        { identifier: BLOG_IDENTIFIER },
        recipients,
        new Delete({
          id: new URL(`#delete-${slug}`, actorUri),
          actor: actorUri,
          to: AS_PUBLIC,
          object: new URL(row.url),
        }),
      );
      db.run("DELETE FROM posts WHERE id = ?", [slug]);
    }
  }
}
