Federated blog example using Fedify and Astro
=============================================

> [!WARNING]
> This program is for educational purposes only. Do not use it for any other
> purpose, since it has not been thoroughly tested for security.

This is a simple federated blog example using [Fedify] and [Astro]. Blog posts
are authored as Markdown files and built to static HTML at build time, while
ActivityPub federation is handled by server-side routes. The features of this
program are:

 -  Blog posts authored as Markdown files in *src/content/posts/*
 -  The blog author can be followed by other actors in the fediverse
 -  A follower can unfollow the blog
 -  Blog posts are delivered to followers as [ActivityPub] activities
 -  Remote users can reply to posts, and replies are shown on the blog

Since it is a simple example for educational purposes, it has a lot of
limitations:

 -  The blog author's profile cannot be configured without editing source files
 -  No likes or shares of posts
 -  No search feature
 -  No authentication or authorization for the web interface
 -  In-memory key-value store and message queue (resets on restart) in early
    chapters; SQLite is introduced later in the tutorial

[Fedify]: https://fedify.dev/
[Astro]: https://astro.build/
[ActivityPub]: https://www.w3.org/TR/activitypub/


Tutorial
--------

This repository accompanies the *[Building a federated blog]* tutorial on the
Fedify website. The tutorial walks through building this project step by step,
starting from `fedify init` and ending with receiving comments from the
fediverse.

[Building a federated blog]: https://fedify.dev/tutorial/astro-blog


Dependencies
------------

This program is written in TypeScript and uses [Bun]. You need to have Bun
1.0.0 or later installed on your system to run this program.

It also depends on a few external libraries besides [Fedify]:

 -  [Astro] for the web framework and static site generation
 -  [bun:sqlite] for the database (followers, comments, and key pairs)
 -  A few other libraries; see *package.json* for details

[Bun]: https://bun.sh/
[bun:sqlite]: https://bun.sh/docs/api/sqlite


How to run
----------

To run this program, you need to install the dependencies first. You can do
that by running the following command:

~~~~ sh
bun install
~~~~

After installing the dependencies, you can start the development server using
the following command:

~~~~ sh
bun run dev
~~~~

This will start the program on port 4321. You can access the blog by visiting
<http://localhost:4321/> in your web browser. However, since this program is an
ActivityPub server, you need to expose it to the public internet to communicate
with other servers in the fediverse. In that case, you can use the
[fedify tunnel] command.

[fedify tunnel]: https://fedify.dev/manual/test#tunneling


License
-------

This program is licensed under the [MIT License]. See the *LICENSE* file for
details.

[MIT License]: https://minhee.mit-license.org/2026/
