# OWID SVG Tester

After every push to owid-grapher, all public charts are rebuilt.

Two things are stored:

1. The MD5 hash of the resulting SVG is stored so we can then spot charts impacted by a code change.
2. The bake time for each SVG to catch code changes that caused a performance regression.

## Setup

Setup requires 3 things:

1. Setting up a Grapher environment.
2. Monitor for changes to owid-grapher.
3. A place to store the results.

