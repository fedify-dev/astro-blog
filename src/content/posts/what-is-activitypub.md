---
title: "What is ActivityPub?"
pubDate: 2025-01-22
description: >-
  A brief introduction to the ActivityPub protocol that powers the fediverse,
  explained for developers who haven't encountered it before.
---

[ActivityPub](https://www.w3.org/TR/activitypub/) is an open standard for
federated social networking.  It's the protocol that lets Mastodon, Misskey,
Pixelfed, PeerTube, and many other platforms talk to each other.

## The key idea: actors and activities

In ActivityPub, every user (and every blog!) is an *actor*.  Actors can send
and receive *activities*—structured JSON-LD objects that describe things like:

- **Follow**: "I want to follow you."
- **Create**: "I published a new post."
- **Like**: "I liked your post."
- **Announce**: "I shared your post."

When you follow someone on Mastodon, your server sends a `Follow` activity to
their server.  Their server replies with an `Accept` activity, and from that
point on, their posts are delivered to your server as `Create` activities.

## Inboxes and outboxes

Each actor has an *inbox* (where they receive activities from others) and an
*outbox* (where their own activities are published for the world to read).

When you publish a new blog post, Fedify sends a `Create(Article)` activity to
the inbox of every follower—across potentially many different servers.

## Why does this matter for a blog?

A traditional blog has no way to push new posts to readers automatically—
readers either check back manually or subscribe via RSS.  With ActivityPub,
your blog becomes a full first-class citizen of the fediverse.  Mastodon users
can follow your blog handle, and new posts will appear in their timeline just
like posts from their friends.
