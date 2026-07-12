import type { CameraLayoutPlan } from '../../schemas/cameraLayout.js';

export function generateCameraLayoutReport(plan: CameraLayoutPlan): string {
  const shotsHtml = plan.shots.map((shot, idx) => `
    <div class="shot-card">
      <h3>Shot ${idx + 1}: ${shot.shotId}</h3>
      <div class="shot-details">
        <div class="detail-row">
          <span class="label">Duration:</span>
          <span class="value">${shot.duration.toFixed(2)}s (${shot.startTime.toFixed(2)}s - ${shot.endTime.toFixed(2)}s)</span>
        </div>
        <div class="detail-row">
          <span class="label">Shot Size:</span>
          <span class="value">${shot.shotSize}</span>
        </div>
        <div class="detail-row">
          <span class="label">Camera Movement:</span>
          <span class="value">${shot.cameraMovement}</span>
        </div>
        <div class="detail-row">
          <span class="label">Characters:</span>
          <span class="value">${shot.characterIds.join(', ')}</span>
        </div>
        <div class="detail-row">
          <span class="label">Beats:</span>
          <span class="value">${shot.beatIds.join(', ')}</span>
        </div>
        <div class="detail-row">
          <span class="label">Framing Rules:</span>
          <span class="value">${shot.framingRules.join(', ')}</span>
        </div>
        <div class="detail-row">
          <span class="label">Camera Position:</span>
          <span class="value">x: ${shot.cameraPosition.x.toFixed(1)}, y: ${shot.cameraPosition.y.toFixed(1)}, z: ${shot.cameraPosition.z.toFixed(1)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Camera Scale:</span>
          <span class="value">${shot.cameraScale.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Focus of Attention:</span>
          <span class="value">x: ${shot.focusOfAttention.x.toFixed(1)}, y: ${shot.focusOfAttention.y.toFixed(1)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Confidence:</span>
          <span class="value">${(shot.confidence * 100).toFixed(0)}%</span>
        </div>
        <div class="detail-row">
          <span class="label">Explanation:</span>
          <span class="value">${shot.explanation}</span>
        </div>
      </div>
    </div>
  `).join('');

  const keyframesHtml = plan.cameraTrack.keyframes.map((kf, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${kf.frame}</td>
      <td>x: ${kf.position.x.toFixed(1)}, y: ${kf.position.y.toFixed(1)}, z: ${kf.position.z.toFixed(1)}</td>
      <td>${kf.scale.toFixed(2)}</td>
      <td>${kf.interpolation}</td>
    </tr>
  `).join('');

  const blockingHtml = plan.blockingPlans.map((bp, idx) => `
    <div class="blocking-card">
      <h4>${bp.shotId}</h4>
      <ul>
        ${bp.positions.map(pos => `
          <li><strong>${pos.characterId}</strong>: x: ${pos.position.x.toFixed(1)}, y: ${pos.position.y.toFixed(1)} (${pos.preset || 'custom'})</li>
        `).join('')}
      </ul>
    </div>
  `).join('');

  const movementsHtml = Object.entries(plan.summary.cameraMovements)
    .map(([movement, count]) => `<li>${movement}: ${count}</li>`)
    .join('');

  const sizesHtml = Object.entries(plan.summary.shotSizes)
    .map(([size, count]) => `<li>${size}: ${count}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Camera Layout Report - Iteration 6</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 2em;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.5em;
      border-bottom: 2px solid #3498db;
      padding-bottom: 5px;
    }
    h3 {
      color: #2980b9;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    h4 {
      color: #7f8c8d;
      margin-bottom: 8px;
      font-size: 1em;
    }
    .summary {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .summary-item {
      background: white;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    .summary-item .label {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 5px;
    }
    .summary-item .value {
      font-size: 1.8em;
      font-weight: bold;
      color: #2c3e50;
    }
    .shot-card {
      background: #f9f9f9;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .shot-details {
      margin-top: 10px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 0.95em;
    }
    .detail-row .label {
      font-weight: 600;
      color: #555;
      min-width: 150px;
    }
    .detail-row .value {
      color: #333;
      flex: 1;
    }
    .blocking-card {
      background: #f9f9f9;
      border-left: 4px solid #9b59b6;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .blocking-card ul {
      margin-left: 20px;
      margin-top: 8px;
    }
    .blocking-card li {
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      background: white;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #3498db;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f5f5f5;
    }
    ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    li {
      margin-bottom: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎬 Camera Layout Report</h1>
    <p><strong>Scene:</strong> ${plan.sceneId}</p>
    <p><strong>Generated:</strong> ${new Date(plan.provenance.createdAt).toLocaleString()}</p>

    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Shots</div>
          <div class="value">${plan.summary.totalShots}</div>
        </div>
        <div class="summary-item">
          <div class="label">Avg Duration</div>
          <div class="value">${plan.summary.averageShotDuration.toFixed(2)}s</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Keyframes</div>
          <div class="value">${plan.summary.totalKeyframes}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Duration</div>
          <div class="value">${plan.cameraTrack.totalDuration.toFixed(2)}s</div>
        </div>
      </div>
    </div>

    <h2>Camera Movements</h2>
    <ul>${movementsHtml}</ul>

    <h2>Shot Sizes</h2>
    <ul>${sizesHtml}</ul>

    <h2>Shots</h2>
    ${shotsHtml}

    <h2>Camera Track Keyframes</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Frame</th>
          <th>Position</th>
          <th>Scale</th>
          <th>Interpolation</th>
        </tr>
      </thead>
      <tbody>
        ${keyframesHtml}
      </tbody>
    </table>

    <h2>Blocking Plans</h2>
    ${blockingHtml}

    <div class="footer">
      <p>Generated by CameraLayoutDirector v1 (rule_based)</p>
      <p>AI Animation Studio - Iteration 6: Camera & Layout</p>
    </div>
  </div>
</body>
</html>`;
}
