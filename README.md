# `scullion` - the simple formatter

The goal of this project is just to provide a simple formatter for a range of data types.

* JSON
* SQL
* MetricsQL
* Diff
* Logs (Java POJOs)

## Storing State

Everything you enter in the panes is serialised into your query params
using [lz-string](https://pieroxy.net/blog/pages/lz-string/index.html#inline_menu_5) which seems to produce some
relatively well compressed values. This also means all links should be sharearable.

> [!WARNING]
> Remember if you are copy and pasting links to people that they will see all the content. Don't leave secrets in your
> stuff if you're sharing them

## ANTLR Log Formatter

The Log Formatter has been updated to use ANTLR behind the scenes which provides better parsing when it works, but is a
little more buggy. Due to some deep annoyances at getting `antlr4ts` setup, this actually runs in a Go runtime loaded
via WASM. I realise this is not remotely performant and I'd like to switch it over eventually but this will do for now.

If you are having frequent problems with it, you can try falling back to the old parser which was custom written in a
slightly cursed way. It also fails often (ie `[` or `]` in a string value might cause to react strangely) you can enter
the following in console

```js
localStorage.setItem('log:fallback', 'true');
```

## MetricsQL Formatter

The MetricsQL formatter is using the
actual [prettifier](https://github.com/VictoriaMetrics/metricsql/blob/master/prettifier.go) from the `metricsql` go
package. This has been patched and packaged up so it can run in the browser. Again, not super performant but it works.
This, however, has some negative side effects in that it is not an exact formatter, and does some destructive changes to
queries. They will always be **semantically** equivalent, but 'formatter' is a little misleading. A simple example
is `my_metric{}` becomes `my_metric`. For a slightly larger example, `with` clauses are expanded:

```promql
with (
  f(q, threshold) = q if ((q > threshold) default 0)
)
f(failure_percentage, 0.5)
```

becomes

```promql
failure_percentage if ((failure_percentage > 0.5) default 0)
```

I might look into ways to fix this in the future but as this is built straight off the metricsql package I'm not sure
the best way to approach it (PRs welcome).

## Something's Broken

Please open an issue using
the [Parsing Failure](https://github.com/Vitineth/scullion/issues/new?assignees=&labels=bug&projects=&template=parsing-failure.md&title=)
issue type and I'll try and look into it when I can. If you can,
please upload a minimally reproducible example. If you have example data but don't want to share it publicly, please
mention it in the issue and I'll reach out some other way to get it (if you work with me and have example data, just
send me a message with it).

## Dependencies

The other goal of this project was to make one of these sites that was guaranteed to do everything in browser, with no
external connections meaning that all data should be safe. This site is hosted on GitHub pages and deployed directly
from source so you can evaluate the code. If you are curious, the full (and slightly complex) dependency tree is shown
below

<details>
<summary>Dependency Tree</summary>
<pre><code>
scullion
├── Node Dependencies (NPM - excluding dev)
│   ├── highlight.js@11.9.0
│   ├── htmldiff-js@1.0.5
│   ├── jq-web@0.5.1
│   ├── lz-string@1.5.0
│   ├── preact@10.19.3
│   └── sql-formatter@15.0.2/
│       ├── argparse@2.0.1
│       ├── get-stdin@8.0.0
│       └── nearley@2.20.1/
│           ├── commander@2.20.3
│           ├── moo@0.5.2
│           ├── railroad-diagrams@1.0.0
│           └── randexp@0.4.6/
│               ├── discontinuous-range@1.0.0
│               └── ret@0.1.15
└── GoLang Dependencies (go)
    ├── github.com/antlr/antlr4@v0.0.0-20181218183524-be58ebffde8e
    ├── github.com/davecgh/go-spew@v1.1.1
    └── go@1.21.1
            └── toolchain@go1.21.1
</code></pre></details>
