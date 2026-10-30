<<<<<<< HEAD
# You lob me?

A plain white page with a cat and Yes/No buttons.

## Features

- Starts with cat 1 and audio 1; the cat, Yes, and No each get an independent random position.
- Buttons stay clear of the cat, question text, each other, and the volume controls.
- The Comic Sans question stays above the top-left corner of the cat image.
- Repeats the current audio with a five-second pause after each playback.
- Happy background music loops underneath the questions and continues into the happy ending.
- Two small bottom-left sliders control background music (85% by default) and voice clips (110% by default).
- Five Yes clicks show a centered happy cat GIF, looping happy music, and an again button below it.
- No stops the current audio and shows an angry cat with a hiss, then a centered sad GIF with looping sad music and a GO AGAIN button.

## Quick start

Open `index.html` directly, or use Node.js to run the local server:

```sh
npm run dev
```

Visit http://127.0.0.1:5173.
If your browser blocks autoplay, happy music and the next voice clip start when you click Yes.
There is no separate sound button.
Use the button below either ending GIF to restart from cat 1.
There are no dependencies to install or build step.

## Checks

```sh
npm run lint
npm test
```

Lint checks JavaScript syntax; tests cover playback timing, matching pairs, autoplay recovery, placement, both endings, and restarting.
=======
You lob me?
>>>>>>> 4c899a8630a23c602d86a819943168802ed81cee
