# Chart Types — Use Case Matrix

Use this matrix to select the optimal chart type for a given dataset and message. Each entry includes best use case, limitations, recommended variants, and accessibility notes.

---

## 1. Line Chart

**Best use case:** Continuous data over time or ordered sequences (trends, seasonality, rates).

**Limitations:** Poor for comparing many series (>5 lines become unreadable). No indication of magnitude between points unless area is filled.

**Recommended variants:**
- Multi-line with distinct colors (max 5 series)
- Small multiples for >5 series
- Area chart when magnitude matters

**Accessibility notes:** Use high-contrast line colors. Add data point markers. Ensure the line is thick enough (>2px) for low-vision users. Provide a data table fallback.

---

## 2. Bar Chart

**Best use case:** Comparing discrete categories (sales by region, counts by group). Horizontal bars for long category labels.

**Limitations:** Poor for continuous data. Too many categories (>20) require small multiples or aggregation.

**Recommended variants:**
- Grouped bar for sub-category comparison
- Stacked bar for part-to-whole within categories
- Horizontal bar for long labels

**Accessibility notes:** Use pattern fills in addition to color. Ensure sufficient bar spacing. Label axes clearly. Avoid 3D effects.

---

## 3. Area Chart

**Best use case:** Showing volume or magnitude over time, especially stacked for composition.

**Limitations:** Layering can obscure data. Top layer dominates perception. Unsuitable for precise value reading.

**Recommended variants:**
- Stacked area for part-to-whole trends
- Streamgraph for organic flow shapes

**Accessibility notes:** Use distinct colors with pattern overlays. Ensure the baseline is visible. Provide a table for exact values.

---

## 4. Candlestick Chart

**Best use case:** Financial time-series showing open, high, low, close (OHLC) values.

**Limitations:** Specific to financial data. Hard to read for non-expert audiences.

**Recommended variants:**
- OHLC bar chart (simpler)
- Heikin-Ashi for trend smoothing

**Accessibility notes:** Use color + shape (filled vs hollow) for up/down. Add a data table. Provide a legend.

---

## 5. Pie Chart

**Best use case:** Showing proportions of a whole with 2–6 categories. Best for "part-to-whole" snapshots.

**Limitations:** Humans are poor at comparing angles/areas. Avoid >6 slices. Avoid for precise comparison.

**Recommended variants:**
- Donut chart (same data, can include center label)
- Exploded pie to highlight one slice

**Accessibility notes:** Label slices directly. Use pattern fills + color. Sort slices largest to smallest starting at 12 o'clock. Provide a data table.

---

## 6. Heatmap

**Best use case:** Showing intensity across two dimensions (matrix, correlation, time-of-day patterns).

**Limitations:** Poor for precise value reading. Can be overwhelming with many cells.

**Recommended variants:**
- Clustered heatmap for correlation matrices
- Calendar heatmap for daily patterns

**Accessibility notes:** Use a sequential or diverging palette with sufficient contrast between steps. Add a color legend with numeric labels. Avoid relying on color alone.

---

## 7. Scatter Plot

**Best use case:** Showing relationship between two continuous variables (correlation, clusters, outliers).

**Limitations:** Overplotting with many points. Hard to read exact values.

**Recommended variants:**
- Bubble chart (adds size dimension)
- Hexbin or contour for high-density data

**Accessibility notes:** Use shape + color encoding. Ensure points are large enough (>4px radius). Add a trend line if relevant. Provide a data summary.

---

## 8. Bubble Chart

**Best use case:** Three continuous variables: x, y, and size (market data, demographic analysis).

**Limitations:** Difficult to compare sizes accurately. Can become cluttered.

**Recommended variants:**
- Scatter plot with labeled points for few items
- Small multiples for categorical groups

**Accessibility notes:** Use color + size + shape for encoding. Label bubbles directly if few in number. Provide a table. Avoid small bubbles (<10px radius).

---

## 9. Treemap

**Best use case:** Part-to-whole hierarchy with two levels (disk usage, portfolio allocation).

**Limitations:** Hard to compare distant rectangles. Poor for deep hierarchies.

**Recommended variants:**
- Squarified treemap (standard)
- Sunburst for radial hierarchical view

**Accessibility notes:** Label rectangles directly. Use color + pattern. Provide a data table. Ensure minimum rectangle size for labels.

---

## 10. Sankey Diagram

**Best use case:** Showing flow or transfer between stages (user funnels, energy flows, budget allocation).

**Limitations:** Complex to create manually. Can become spaghetti with many nodes.

**Recommended variants:**
- Alluvial diagram (same concept, smoother curves)
- Funnel chart for linear, single-path flows

**Accessibility notes:** Label flows and nodes. Use color + pattern. Number of flows should be limited. Provide a data table.

---

## 11. Funnel Chart

**Best use case:** Linear conversion or drop-off process (sales funnel, onboarding steps).

**Limitations:** Only suitable for sequential, single-path processes. Cannot show branching.

**Recommended variants:**
- Sankey for branching flows
- Bar chart for stage comparison

**Accessibility notes:** Label each stage with count and percentage. Use color + pattern. Ensure adequate contrast between stages.
