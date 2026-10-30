# You lob me?

A plain white page with a cat and Yes/No buttons.

## Features

- Opens on a centered starting cat with a Start button at its upper-right.
- Start begins cat 1 and audio 1; the cat, Yes, and No each get an independent random position.
- Buttons stay clear of the cat, question text, each other, and the volume controls.
- The Comic Sans question stays above the top-left corner of the cat image.
- Repeats the current audio with a five-second pause after each playback.
- Happy background music loops underneath the questions and continues into the happy ending.
- Two small bottom-left sliders control background music (30% by default) and voice clips (110% by default).
- Five Yes clicks show a centered happy cat GIF, looping happy music, and an `again <3` button below it.
- No stops the current audio and shows an angry cat with a hiss, then a centered sad GIF with looping sad music and a `GO AGAIN !!!!!` button.

## Quick start

Use Node.js to run the local server:

```sh
npm run dev
```

Visit http://127.0.0.1:5173.
If your browser blocks autoplay, clicking Start begins happy music and the first voice clip.
There is no separate sound button.
Use the button below either ending GIF to restart from cat 1.
There are no dependencies to install or build step.

## Checks

```sh
npm run lint
npm test
```

Lint checks JavaScript syntax; tests cover playback timing, matching pairs, autoplay recovery, placement, both endings, restarting, and asset resolution at both deployment URLs.

## Vercel deployment under /youlobme

This project is a static site with no framework, dependencies, or build step.
Keep it independently deployed at https://youlobme.vercel.app using Vercel's Other framework preset and the repository root as its output directory.

The main website already proxies `/youlobme` and its assets to this deployment, stripping the prefix before forwarding.
No portfolio changes are required.
Keep those existing external rewrites and both independent deployments.

The HTML declares `/youlobme/` as its document base before any assets load.
That keeps relative HTML assets, browser preloads, and JavaScript media changes inside the proxy namespace without redirecting the browser.
This project's root `vercel.json` aliases `/youlobme/:path*` back to the static files at `/:path*`, so the original Vercel root URL still works with that base.
The local server supports the same prefix; use it instead of opening the HTML as a local file.
There is no client-side router or separate page navigation in this app; Start, Yes, No, and restart work within the same document.
Keep future links and assets relative to the document base.

Deploy this project to activate the fix.
Verify both `/youlobme` and `/youlobme/`: requests should stay under `/youlobme/`, return the correct content types, and show both endings with working restart and volume controls.
Compare the main homepage and an unrelated main-site route before and after deployment.
Vercel external rewrites preserve the browser URL, as described in [Vercel's rewrite documentation](https://vercel.com/docs/rewrites).
