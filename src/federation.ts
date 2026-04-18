import { getCollection } from "astro:content";
import {
  createFederation,
  generateCryptoKeyPair,
  InProcessMessageQueue,
  MemoryKvStore,
} from "@fedify/fedify";
import {
  Accept,
  Article,
  Create,
  Delete,
  Endpoints,
  Follow,
  Note,
  Person,
  Undo,
  Update,
} from "@fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";
import { getLogger } from "@logtape/logtape";
import {
  addComment,
  addFollower,
  deleteComment,
  getCommentAuthorUrl,
  getFollowers,
  getKeyPairs,
  removeFollower,
  saveKeyPairs,
  updateComment,
} from "./lib/store.ts";

const logger = getLogger("astro-blog");

export const BLOG_IDENTIFIER = "blog";
export const BLOG_NAME = "Fedify Blog Example";
export const BLOG_SUMMARY =
  "A sample federated blog powered by Fedify and Astro.";

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    if (identifier !== BLOG_IDENTIFIER) {
      logger.debug("Unknown actor identifier: {identifier}", { identifier });
      return null;
    }
    const kp = await ctx.getActorKeyPairs(identifier);
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: BLOG_NAME,
      summary: BLOG_SUMMARY,
      url: new URL("/", ctx.url),
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      followers: ctx.getFollowersUri(identifier),
      publicKey: kp[0].cryptographicKey,
      assertionMethods: kp.map((k) => k.multikey),
    });
  })
  .setKeyPairsDispatcher(async (_ctx, identifier) => {
    if (identifier !== BLOG_IDENTIFIER) return [];
    const stored = await getKeyPairs(identifier);
    if (stored) return stored;
    const [rsaKey, ed25519Key] = await Promise.all([
      generateCryptoKeyPair("RSASSA-PKCS1-v1_5"),
      generateCryptoKeyPair("Ed25519"),
    ]);
    const kp = [rsaKey, ed25519Key];
    await saveKeyPairs(identifier, kp);
    return kp;
  });

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    if (follow.id == null || follow.actorId == null) return;
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor" || parsed.identifier !== BLOG_IDENTIFIER) {
      return;
    }
    const follower = await follow.getActor(ctx);
    if (follower == null || follower.id == null || follower.inboxId == null) {
      return;
    }
    addFollower(follower.id.href, follower.inboxId.href);
    logger.info("New follower: {follower}", { follower: follower.id.href });
    await ctx.sendActivity(
      { identifier: BLOG_IDENTIFIER },
      follower,
      new Accept({
        id: new URL(
          `#accepts/${follower.id.href}`,
          ctx.getActorUri(BLOG_IDENTIFIER),
        ),
        actor: ctx.getActorUri(BLOG_IDENTIFIER),
        object: follow,
      }),
    );
  })
  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject(ctx);
    if (!(object instanceof Follow)) return;
    if (undo.actorId == null) return;
    removeFollower(undo.actorId.href);
    logger.info("Unfollowed: {actor}", { actor: undo.actorId.href });
  })
  .on(Create, async (ctx, create) => {
    const object = await create.getObject(ctx);
    if (!(object instanceof Note)) return;
    if (object.id == null || create.actorId == null) return;
    const replyTargetId = object.replyTargetId;
    if (replyTargetId == null) return;
    const parsed = ctx.parseUri(replyTargetId);
    if (parsed?.type !== "object" || parsed.class !== Article) return;
    const { slug } = parsed.values;
    const author = await create.getActor(ctx);
    if (author == null || author.id == null) return;
    const authorName =
      author.name?.toString() ??
      author.preferredUsername?.toString() ??
      author.id.host;
    addComment({
      id: object.id.href,
      postId: slug,
      authorUrl: author.id.href,
      authorName,
      content: object.content?.toString() ?? "",
      publishedAt: (object.published ?? Temporal.Now.instant()).toString(),
    });
    logger.info("New comment on /{slug} by {author}", {
      slug,
      author: author.id.href,
    });
  })
  .on(Update, async (ctx, update) => {
    const object = await update.getObject(ctx);
    if (!(object instanceof Note)) return;
    if (object.id == null || update.actorId == null) return;
    const existing = getCommentAuthorUrl(object.id.href);
    if (existing == null || existing !== update.actorId.href) return;
    const author = await update.getActor(ctx);
    const authorName =
      author?.name?.toString() ??
      author?.preferredUsername?.toString() ??
      update.actorId.host;
    updateComment(object.id.href, authorName, object.content?.toString() ?? "");
  })
  .on(Delete, async (_ctx, delete_) => {
    if (delete_.actorId == null) return;
    const objectId = delete_.objectId;
    if (objectId == null) return;
    const existing = getCommentAuthorUrl(objectId.href);
    if (existing == null || existing !== delete_.actorId.href) return;
    deleteComment(objectId.href);
  });

federation.setFollowersDispatcher(
  "/users/{identifier}/followers",
  (_ctx, identifier) => {
    if (identifier !== BLOG_IDENTIFIER) return null;
    return { items: getFollowers() };
  },
);

federation.setObjectDispatcher(
  Article,
  "/posts/{slug}",
  async (ctx, { slug }) => {
    const allPosts = await getCollection("posts");
    const post = allPosts.find((p) => p.id === slug && !p.data.draft);
    if (!post) return null;
    return new Article({
      id: ctx.getObjectUri(Article, { slug }),
      attribution: ctx.getActorUri(BLOG_IDENTIFIER),
      name: post.data.title,
      summary: post.data.description,
      content: `<p>${post.data.description}</p>`,
      url: new URL(`/posts/${slug}`, ctx.url),
      published: Temporal.Instant.from(post.data.pubDate.toISOString()),
    });
  },
);

export default federation;
