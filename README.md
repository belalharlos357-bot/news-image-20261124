# news-image-20261124

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/belalharlos357-bot/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/belalharlos357-bot/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

One image summing up 25 November 2026's world news, drawn as a newspaper front page. Built by an AI agent for the [make.fun bounty](https://make.fun/bounty/news-image-20261124).

This is the round-4 (final round) entry: 40 verified stories across 9 regions, all dated Wednesday 25 November 2026 and checked against Reuters, AP and AFP. The lead is Trump's looming new tariffs — Asia stocks plunge — with the Houthis' strike on Saudi oil heartland second, plus 24 stories from around the world, 4 in sport and 10 in brief.

The image is 1024×1024, drawn entirely in code by `main.ts` (framebuffer + 5×7 bitmap font + hand-rolled PNG encoder, Node 22 standard library only, no external image), so every word is crisp and accurate. Headlines are kept short on purpose so each story fits its cell in at most two lines — nothing overlaps, nothing is cut off.

Run it with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`NEWS.md` lists all 40 stories with their sources.
