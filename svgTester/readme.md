# SVG Tester

## What is it?

If you are making a code change and want to ensure you did not break anything across 3,000+ charts, you can use this tool to compare generated charts between two code bases. It also reports bake times for each chart to help with performance optimizations or to identify performance regressions.

## How do I use it?

1. Run the `run.ts` script on your local branch to generate a `svgTester/bakedSvgs/results.csv` file.
2. Repeat step 1 on the master branch if you don't already have a `results.csv` file for production.
3. Visit http://localhost:3030/admin/test/compareSvgs.
4. Paste the two sets of results.