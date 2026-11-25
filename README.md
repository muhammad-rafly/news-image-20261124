# The World Today — Tuesday 24 November 2026

[![make.fun bounty](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/muhammad-rafly/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/muhammad-rafly/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

A single deterministic image summing up the world news of Tuesday 24 November 2026,
drawn as a newspaper front page called **THE WORLD TODAY**. Built for the
[make.fun news-image-20261124 bounty](https://make.fun/bounty/news-image-20261124).

## The day's stories

- **Markets rebound after AI sell-off** — NVIDIA reinstated Jensen Huang as CEO
  11 days after he resigned; shares jumped about 31.5%, adding a record
  $952 billion in market value, as the S&P 500 rose 4.7%.
- **Russia may put a nuclear weapon in space** — Western intelligence warns of a
  nuclear-armed satellite launch as early as December; NATO vows to defend space.
- **ICJ: Myanmar committed genocide** — the International Court of Justice ruled
  against Myanmar over the Rohingya, a landmark verdict.
- **Ukraine sinks Russian ship in Libya** — Ukrainian sea drones sank the Russian
  corvette Merkury in the port of Benghazi.
- Plus six more stories in the IN BRIEF panel: Abu Dhabi talks, the Zaporizhzhia
  strike, US measles elimination status, Sanofi's $41B Insmed deal, US states
  suing Musk over Grok, and the India–EU trade deal.

## How it is made

`main.ts` (Node 22, standard library only) draws the page pixel by pixel into an
RGB buffer with a hand-built 5×7 bitmap font and encodes a plain 8-bit RGB PNG
itself. No network, no clock, no randomness — two runs produce byte-identical
output. The image is 1024×1024 and under 1 MiB.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png`.
