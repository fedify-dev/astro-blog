import db from "./db.ts";

export async function getKeyPairs(
  identifier: string,
): Promise<CryptoKeyPair[] | null> {
  const rows = db
    .query<
      { algorithm: string; private_key: Uint8Array; public_key: Uint8Array },
      [string]
    >(
      `SELECT algorithm, private_key, public_key
       FROM key_pairs WHERE identifier = ? ORDER BY rowid`,
    )
    .all(identifier);
  if (rows.length === 0) return null;
  return Promise.all(
    rows.map(async ({ algorithm, private_key, public_key }) => {
      const alg: AlgorithmIdentifier | RsaHashedImportParams =
        algorithm === "RSASSA-PKCS1-v1_5"
          ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
          : algorithm;
      const [privateKey, publicKey] = await Promise.all([
        crypto.subtle.importKey(
          "pkcs8",
          private_key as unknown as Uint8Array<ArrayBuffer>,
          alg,
          false,
          ["sign"],
        ),
        crypto.subtle.importKey(
          "spki",
          public_key as unknown as Uint8Array<ArrayBuffer>,
          alg,
          false,
          ["verify"],
        ),
      ]);
      return { privateKey, publicKey };
    }),
  );
}

export async function saveKeyPairs(
  identifier: string,
  kp: CryptoKeyPair[],
): Promise<void> {
  const insert = db.prepare(
    `INSERT OR REPLACE INTO key_pairs
     (identifier, algorithm, private_key, public_key) VALUES (?, ?, ?, ?)`,
  );
  for (const { privateKey, publicKey } of kp) {
    const [privateKeyData, publicKeyData] = await Promise.all([
      crypto.subtle.exportKey("pkcs8", privateKey),
      crypto.subtle.exportKey("spki", publicKey),
    ]);
    insert.run(
      identifier,
      privateKey.algorithm.name,
      new Uint8Array(privateKeyData),
      new Uint8Array(publicKeyData),
    );
  }
}

export function addFollower(actorId: string, inboxUrl: string): void {
  db.run(
    `INSERT OR REPLACE INTO followers (actor_id, inbox_url) VALUES (?, ?)`,
    [actorId, inboxUrl],
  );
}

export function removeFollower(actorId: string): void {
  db.run(`DELETE FROM followers WHERE actor_id = ?`, [actorId]);
}

export function countFollowers(): number {
  return (
    db
      .query<{ count: number }, []>(`SELECT COUNT(*) AS count FROM followers`)
      .get()?.count ?? 0
  );
}

export function getFollowers(): { id: URL; inboxId: URL }[] {
  return db
    .query<{ actor_id: string; inbox_url: string }, []>(
      `SELECT actor_id, inbox_url FROM followers`,
    )
    .all()
    .map(({ actor_id, inbox_url }) => ({
      id: new URL(actor_id),
      inboxId: new URL(inbox_url),
    }));
}

export interface Comment {
  id: string;
  postId: string;
  authorUrl: string;
  authorName: string;
  content: string;
  publishedAt: string;
}

export function addComment(comment: Comment): void {
  db.run(
    `INSERT OR REPLACE INTO comments
     (id, post_id, author_url, author_name, content, published_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      comment.id,
      comment.postId,
      comment.authorUrl,
      comment.authorName,
      comment.content,
      comment.publishedAt,
    ],
  );
}

export function updateComment(
  id: string,
  authorName: string,
  content: string,
): void {
  db.run(`UPDATE comments SET author_name = ?, content = ? WHERE id = ?`, [
    authorName,
    content,
    id,
  ]);
}

export function getCommentAuthorUrl(id: string): string | null {
  return (
    db
      .query<{ author_url: string }, [string]>(
        `SELECT author_url FROM comments WHERE id = ?`,
      )
      .get(id)?.author_url ?? null
  );
}

export function deleteComment(id: string): void {
  db.run(`DELETE FROM comments WHERE id = ?`, [id]);
}

export function getCommentsByPost(postId: string): Comment[] {
  return db
    .query<
      {
        id: string;
        author_url: string;
        author_name: string;
        content: string;
        published_at: string;
      },
      [string]
    >(
      `SELECT id, author_url, author_name, content, published_at
       FROM comments WHERE post_id = ? ORDER BY published_at`,
    )
    .all(postId)
    .map((r) => ({
      id: r.id,
      postId,
      authorUrl: r.author_url,
      authorName: r.author_name,
      content: r.content,
      publishedAt: r.published_at,
    }));
}
