---
title: "Building a Federated Blog with Astro and Fedify"
pubDate: 2025-02-01
description: >-
  A walkthrough of the key pieces that make this blog federate with the
  fediverse: actors, key pairs, followers, and publishing activities.
---

This blog is the example project for the
[Building a federated blog](https://fedify.dev/tutorial/astro-blog) tutorial.
In that tutorial, we build this project from scratch, step by step.

Here's a high-level overview of how federation works in this project:

## The actor

Every federated account is represented by an *actor*—a JSON-LD document
accessible at a URL like `https://example.com/users/blog`.  Fedify handles
serving this document.  It describes the blog with metadata like its name,
summary, and public key.

## Key pairs and HTTP Signatures

When the blog sends a `Create(Article)` activity to a follower's inbox, the
request is signed with the blog's private key.  The receiving server verifies
the signature using the public key from the actor document.  This prevents
impersonation.  Fedify handles all of this automatically.

## Followers

When someone on Mastodon follows the blog handle, Mastodon sends a `Follow`
activity to the blog's inbox.  The blog accepts it by replying with an
`Accept(Follow)` activity, and from that point on, new posts are delivered
to that follower.

## Publishing posts

When the blog is deployed with new Markdown files, it compares the current
post list against a database of previously published posts.  New posts trigger
`Create(Article)` activities; changed posts trigger `Update(Article)`.  This
all happens automatically on server startup—no extra tooling required.

## Comments

When a fediverse user replies to a post from their client, the reply arrives
as a `Create(Note)` activity in the blog's inbox.  If the `inReplyTo` field
points to a post URL, the reply is saved and shown as a comment on that post.
