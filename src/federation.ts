import {
  createFederation,
  generateCryptoKeyPair,
  InProcessMessageQueue,
  MemoryKvStore,
} from "@fedify/fedify";
import { Accept, Endpoints, Follow, Person, Undo } from "@fedify/vocab";
import { getLogger } from "@logtape/logtape";
import {
  addFollower,
  getFollowers,
  getKeyPairs,
  removeFollower,
  saveKeyPairs,
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
  });

federation.setFollowersDispatcher(
  "/users/{identifier}/followers",
  (_ctx, identifier) => {
    if (identifier !== BLOG_IDENTIFIER) return null;
    return { items: getFollowers() };
  },
);

export default federation;
