/*
 * Narrative Visualization of automobile horsepower versus fuel efficiency.
 *
 * This script implements a simple narrative flow with three scenes.  Each scene
 * uses the same scatter‑plot base but varies the annotations and highlights
 * presented to the user.  A global sceneIndex variable tracks the current
 * scene.  Navigation is provided through previous and next buttons.  The
 * visualization uses vanilla D3 v7 loaded from a CDN.  No other libraries are
 * required.  Tooltips provide additional information on demand.
 */

// Dataset describing a handful of 2017 era vehicles.  Values are loosely
// representative and chosen to illustrate relationships between horsepower and
// fuel economy.  Each object includes a name, horsepower (hp), fuel
// efficiency in miles per gallon (mpg), vehicle weight (lbs) and a type.
const carsData = [
  { name: 'Toyota Prius', hp: 121, mpg: 52, weight: 3042, type: 'Hybrid' },
  { name: 'Honda Civic', hp: 158, mpg: 32, weight: 2762, type: 'Compact' },
  { name: 'Toyota Camry', hp: 178, mpg: 30, weight: 3300, type: 'Sedan' },
  { name: 'Ford F‑150', hp: 282, mpg: 19, weight: 4069, type: 'Truck' },
  { name: 'Chevrolet Camaro', hp: 275, mpg: 20, weight: 3354, type: 'Sports' },
  { name: 'BMW 3 Series', hp: 180, mpg: 26, weight: 3410, type: 'Sedan' },
  { name: 'Subaru Outback', hp: 175, mpg: 25, weight: 3633, type: 'SUV' },
  { name: 'Mazda MX‑5 Miata', hp: 155, mpg: 26, weight: 2333, type: 'Sports' },
  { name: 'Dodge Challenger Hellcat', hp: 707, mpg: 16, weight: 4439, type: 'Sports' },
  { name: 'Mini Cooper', hp: 134, mpg: 28, weight: 2711, type: 'Compact' }
];

// Compute linear regression line for hp vs mpg using least squares.  The
// regression will be used to draw the trend line in scene 1.
function computeRegression(data) {
  const n = data.length;
  const sumX = d3.sum(data, d => d.hp);
  const sumY = d3.sum(data, d => d.mpg);
  const sumXY = d3.sum(data, d => d.hp * d.mpg);
  const sumX2 = d3.sum(data, d => d.hp * d.hp);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

const regression = computeRegression(carsData);

// Current vehicle type filter.  "All" means no filter.
let selectedType = 'All';

// Dimensions and margins for the chart
const margin = { top: 40, right: 20, bottom: 60, left: 60 };
const svgWidth = 800;
const svgHeight = 550;
const width = svgWidth - margin.left - margin.right;
const height = svgHeight - margin.top - margin.bottom;

// Scales (domains will be computed based on data)
const xScale = d3.scaleLinear();
const yScale = d3.scaleLinear();

// Color scale for vehicle types
const colorScale = d3.scaleOrdinal()
  .domain([...new Set(carsData.map(d => d.type))])
  .range(['#f57c00', '#1976d2', '#388e3c', '#d32f2f', '#7b1fa2', '#00796b']);

// Create SVG container
const svg = d3.select('#vis')
  .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

const chart = svg.append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

// Tooltip div (absolute positioned)
const tooltip = d3.select('body').append('div')
  .attr('class', 'tooltip');

// Initialize scales based on data
function initScales() {
  const hpExtent = d3.extent(carsData, d => d.hp);
  const mpgExtent = d3.extent(carsData, d => d.mpg);
  // Add padding to domains for better aesthetics
  xScale.domain([hpExtent[0] * 0.8, hpExtent[1] * 1.1]).range([0, width]);
  // Invert y axis: larger mpg values at top
  yScale.domain([mpgExtent[0] * 0.8, mpgExtent[1] * 1.2]).range([height, 0]);
}

// Draw axes
function drawAxes() {
  // X axis
  chart.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));
  // X label
  chart.append('text')
    .attr('class', 'x-label')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .attr('fill', '#333')
    .text('Horsepower');
  // Y axis
  chart.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale));
  // Y label
  chart.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('fill', '#333')
    .text('Fuel Economy (MPG)');
}

// Remove only annotations and regression lines for a fresh scene.  Points are
// preserved so that transitions between scenes can update their appearance
// smoothly without removing and re‑adding them.  This helps avoid
// disorienting the viewer when navigating through scenes.
function clearChart() {
  chart.selectAll('.regression').remove();
  chart.selectAll('.annotation-group').remove();
}

// Render scatter points with optional highlighting.  The highlight parameter
// accepts a function that returns true for points to be emphasized.  When
// provided, emphasized points will be drawn in a larger size and full
// opacity, while all other points will appear smaller and semi‑transparent.
function renderPoints(highlightFn) {
  const points = chart.selectAll('.point')
    .data(carsData, d => d.name);
  // Enter
  points.enter().append('circle')
    .attr('class', 'point')
    .attr('cx', d => xScale(d.hp))
    .attr('cy', d => yScale(d.mpg))
    .attr('r', d => highlightFn && highlightFn(d) ? 8 : 5)
    .attr('fill', d => colorScale(d.type))
    .attr('opacity', d => highlightFn && !highlightFn(d) ? 0.3 : 1.0)
    .on('mouseover', (event, d) => {
      tooltip.style('opacity', 1)
        .html(
          `<strong>${d.name}</strong><br>` +
          `Type: ${d.type}<br>` +
          `Horsepower: ${d.hp} hp<br>` +
          `Fuel economy: ${d.mpg} mpg<br>` +
          `Weight: ${d.weight} lbs`
        );
    })
    .on('mousemove', (event) => {
      // Position tooltip near mouse
      tooltip.style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`);
    })
    .on('mouseout', () => {
      tooltip.style('opacity', 0);
    });
  // Update existing points for new highlighting state
  points
    .transition().duration(750)
    .attr('r', d => highlightFn && highlightFn(d) ? 8 : 5)
    .attr('opacity', d => highlightFn && !highlightFn(d) ? 0.3 : 1.0);
}

// Draw regression line for scene 1.  It uses the slope and intercept computed
// earlier.  The line is drawn across the full domain of the x scale.
function drawRegressionLine() {
  const xDomain = xScale.domain();
  const linePoints = [
    { x: xDomain[0], y: regression.slope * xDomain[0] + regression.intercept },
    { x: xDomain[1], y: regression.slope * xDomain[1] + regression.intercept }
  ];
  chart.append('line')
    .datum(linePoints)
    .attr('class', 'regression')
    .attr('x1', d => xScale(d[0].x))
    .attr('y1', d => yScale(d[0].y))
    .attr('x2', d => xScale(d[1].x))
    .attr('y2', d => yScale(d[1].y))
    .attr('stroke', '#555')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6 4');
}

// Utility to create an annotation group containing a connector line and text.
// The anchor parameter expects { x: <hp>, y: <mpg> } in data space.  The
// annotation will be positioned relative to this anchor.
function createAnnotation(anchor, dx, dy, textLines) {
  const annotationGroup = chart.append('g')
    .attr('class', 'annotation-group')
    // Start annotation fully transparent and fade it in.  This subtle
    // transition acts like a timer so annotations do not appear abruptly.
    .style('opacity', 0);
  // Draw connector line
  annotationGroup.append('line')
    .attr('x1', xScale(anchor.x))
    .attr('y1', yScale(anchor.y))
    .attr('x2', xScale(anchor.x) + dx)
    .attr('y2', yScale(anchor.y) + dy)
    .attr('stroke', '#444')
    .attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrowhead)');
  // Draw text background (optional)
  const text = annotationGroup.append('text')
    .attr('x', xScale(anchor.x) + dx + 4)
    .attr('y', yScale(anchor.y) + dy)
    .attr('fill', '#111')
    .attr('font-weight', 'bold')
    .selectAll('tspan')
    .data(textLines)
    .enter()
    .append('tspan')
    .attr('x', xScale(anchor.x) + dx + 4)
    .attr('dy', (d, i) => i === 0 ? 0 : 16)
    .text(d => d);
  // Fade the annotation into view over 0.8 seconds
  annotationGroup.transition()
    .duration(800)
    .style('opacity', 1);
}

// Create arrowhead marker definition once.  This will be referenced by
// annotation connector lines.
svg.append('defs').append('marker')
  .attr('id', 'arrowhead')
  .attr('viewBox', '0 -5 10 10')
  .attr('refX', 8)
  .attr('refY', 0)
  .attr('markerWidth', 6)
  .attr('markerHeight', 6)
  .attr('orient', 'auto')
  .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#444');

// Scene definitions -----------------------------------------------------------

// Scene 1: Introduce the negative correlation between horsepower and fuel
// economy.  All points are shown.  A regression line hints at the overall
// trend, and an annotation highlights that vehicles with more power tend to
// consume more fuel.
function scene1() {
  clearChart();
  // Hide the filter options in scenes before the exploratory stage
  d3.select('#typeFilterContainer').style('display', 'none');
  renderPoints(null);
  drawRegressionLine();
  // Add annotation describing the general trend
  createAnnotation(
    // Anchor roughly on the data near the middle of the trend
    { x: 300, y: regression.slope * 300 + regression.intercept },
    80, -80,
    [
      'General trend:',
      'Higher horsepower → lower MPG',
      'Note the downward sloping regression line.'
    ]
  );
  // Update scene indicator text
  d3.select('#sceneIndicator').text('Scene 1 of 3: Overall trend');
}

// Scene 2: Focus on the high‑power outlier (Dodge Challenger Hellcat).  Other
// vehicles are faded out.  An annotation explains why this sports car sits
// apart from the general trend.
function scene2() {
  clearChart();
  // Hide the filter options in scenes before the exploratory stage
  d3.select('#typeFilterContainer').style('display', 'none');
  const highlight = d => d.name === 'Dodge Challenger Hellcat';
  renderPoints(highlight);
  // Create annotation for the Hellcat.  Place the callout below and to the
  // left of the point so that the connector does not cross other
  // annotations.  The dx/dy values were tuned to keep the text clear of
  // surrounding marks and prevent overlap with the scene description.
  const hellcat = carsData.find(d => d.name === 'Dodge Challenger Hellcat');
  createAnnotation(
    { x: hellcat.hp, y: hellcat.mpg },
    -50, -100,
    [
      hellcat.name,
      `707 hp, ${hellcat.mpg} mpg`,
      'Extreme performance comes',
      'at the expense of',
      'efficiency.'
    ]
  );
  // Include a short narrative annotation away from the highlighted point.
  // We anchor this callout in the mid‑range of horsepower and MPG and draw
  // the connector upwards to position the text in the upper‑left portion of
  // the chart.  This placement avoids intersecting the Hellcat annotation
  // and keeps the narrative text legible.
  createAnnotation(
    { x: 200, y: 32 },
    50, -90,
    [
      'Scene 2:',
      'A spotlight on our most powerful car.',
      'Notice how far it sits below the trend line.'
    ]
  );
  d3.select('#sceneIndicator').text('Scene 2 of 3: Extreme performance');
}

// Scene 3: Highlight the eco‑friendly hybrid – the Toyota Prius.  This scene
// emphasises that there are vehicles achieving exceptional mileage by trading
// off horsepower.  A second annotation guides the reader to the idea of
// exploring other points using the tooltip for more details.
function scene3() {
  clearChart();
  // Show the type filter control when entering the exploratory scene
  d3.select('#typeFilterContainer').style('display', 'inline-block');
  // Determine which points should be highlighted based on the current filter.
  // If no filter ("All"), highlight the Prius; otherwise highlight all
  // vehicles of the selected type.  Keep this function in scope so it
  // captures the selectedType.
  const highlight = d => {
    if (selectedType === 'All') {
      return d.name === 'Toyota Prius';
    }
    return d.type === selectedType;
  };
  renderPoints(highlight);
  // Create an annotation describing either the Prius or a sample vehicle from
  // the selected type.  For the Prius, use a fixed message about hybrid
  // technology.  For other types, pick the first vehicle of that type and
  // display its basic statistics to encourage exploration.  This provides
  // guidance without requiring the user to guess which point to examine.
  if (selectedType === 'All') {
    const prius = carsData.find(d => d.name === 'Toyota Prius');
    createAnnotation(
      { x: prius.hp, y: prius.mpg },
      100, -80,
      [
        prius.name,
        `${prius.hp} hp, ${prius.mpg} mpg`,
        'Hybrid technology boosts efficiency despite modest power.'
      ]
    );
  } else {
    // When a specific type is selected, we only update highlighting and rely
    // on tooltips for details.  No additional callout is drawn to avoid
    // overlapping annotations.  The narrative callout remains to guide
    // exploration.
  }
  // Add a secondary annotation guiding the reader toward interactive exploration.
  createAnnotation(
    { x: 220, y: 28 },
    120, -100,
    [
      'Scene 3:',
      'Efficiency over speed.',
      'Use the filter to highlight other types.'
    ]
  );
  d3.select('#sceneIndicator').text('Scene 3 of 3: Efficient design');
}

// Scenes array for easy indexing
const scenes = [scene1, scene2, scene3];
let sceneIndex = 0;

// Initialize scales and axes once
initScales();
drawAxes();

// Initial render
scenes[sceneIndex]();

// Navigation button event handlers
d3.select('#nextBtn').on('click', () => {
  if (sceneIndex < scenes.length - 1) {
    sceneIndex++;
    scenes[sceneIndex]();
    updateButtonState();
  }
});
d3.select('#prevBtn').on('click', () => {
  if (sceneIndex > 0) {
    sceneIndex--;
    scenes[sceneIndex]();
    updateButtonState();
  }
});

function updateButtonState() {
  d3.select('#prevBtn').attr('disabled', sceneIndex === 0 ? true : null);
  d3.select('#nextBtn').attr('disabled', sceneIndex === scenes.length - 1 ? true : null);
}

// Disable previous button on first load
updateButtonState();

// Event handler for the type filter in the exploratory scene.  When the user
// changes the selection, update the global selectedType and, if on the
// exploratory scene (scene index 2), re‑render the scene so that the
// highlighted points and annotation update accordingly.  Reusing scene3
// maintains consistency of annotations and highlights.
d3.select('#typeFilter').on('change', function() {
  selectedType = this.value;
  if (sceneIndex === 2) {
    // Reconstruct the third scene to update highlighting and annotations
    scenes[sceneIndex]();
  }
});