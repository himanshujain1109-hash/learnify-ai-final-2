function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function labelOf(node) {
  if (node && typeof node === "object") return String(node.label || node.name || node.id || "");
  return String(node ?? "");
}

function Arrow() {
  return <span className="visual-arrow" aria-hidden="true">→</span>;
}

function Flowchart({ data }) {
  const nodes = asArray(data?.nodes);
  return (
    <div className="visual-flow">
      {nodes.slice(0, 8).map((node, index) => (
        <span className="flow-node" key={`${labelOf(node)}-${index}`}>
          {labelOf(node)}
          {index < nodes.length - 1 && <Arrow />}
        </span>
      ))}
    </div>
  );
}

function LinkedList({ data, type = "linked-list" }) {
  const nodes = asArray(data?.nodes).slice(0, 12);
  return (
    <div className={`visual-chain ${type}`}>
      {nodes.map((node, index) => (
        <span className="chain-item" key={`${labelOf(node)}-${index}`}>
          <b>{labelOf(node)}</b>
          {index < nodes.length - 1 && <Arrow />}
        </span>
      ))}
    </div>
  );
}

function Tree({ data }) {
  const nodes = asArray(data?.nodes);
  const root = nodes[0];
  const children = asArray(root?.children || data?.children || nodes.slice(1));
  return (
    <div className="visual-tree">
      <div className="tree-root">{labelOf(root || "Root")}</div>
      {children.length > 0 && (
        <>
          <div className="tree-stem" />
          <div className="tree-children">
            {children.slice(0, 6).map((node, index) => (
              <div className="tree-child" key={`${labelOf(node)}-${index}`}>
                {labelOf(node)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chart({ data, type }) {
  const labels = asArray(data?.labels).slice(0, 12).map(String);
  const values = asArray(data?.values).slice(0, labels.length).map(Number);
  const width = 620;
  const height = 230;
  const padding = 34;
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - (Math.max(0, value) / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  if (!values.length) return <div className="visual-empty">No chart data was returned.</div>;
  return (
    <div className="visual-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Generated chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
        {type === "bar-chart" ? (
          values.map((value, index) => {
            const barWidth = (width - padding * 2) / values.length - 10;
            const x = padding + index * ((width - padding * 2) / values.length) + 5;
            const barHeight = (Math.max(0, value) / max) * (height - padding * 2);
            return (
              <rect
                key={index}
                x={x}
                y={height - padding - barHeight}
                width={barWidth}
                height={barHeight}
                rx="5"
                className="chart-bar"
              />
            );
          })
        ) : (
          <>
            <polyline points={points} className="chart-line" />
            {values.map((value, index) => {
              const [x, y] = points.split(" ")[index].split(",");
              return <circle key={index} cx={x} cy={y} r="5" className="chart-dot" />;
            })}
          </>
        )}
      </svg>
      <div className="chart-labels">
        {labels.map((label, index) => <span key={index}>{label}</span>)}
      </div>
    </div>
  );
}

function ComparisonTable({ data }) {
  const columns = asArray(data?.columns).map(String);
  const rows = asArray(data?.rows);
  return (
    <div className="visual-table-wrap">
      <table className="visual-table">
        {columns.length > 0 && <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>}
        <tbody>{rows.slice(0, 8).map((row, index) => <tr key={index}>{asArray(row).map((cell, cellIndex) => <td key={cellIndex}>{String(cell)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function ConceptMap({ data }) {
  const nodes = asArray(data?.nodes).slice(0, 9);
  return (
    <div className="visual-concept-map">
      {nodes.map((node, index) => <span key={`${labelOf(node)}-${index}`} className={index === 0 ? "concept-main" : "concept-node"}>{labelOf(node)}</span>)}
    </div>
  );
}

export default function VisualRenderer({ visual }) {
  if (!visual || visual.type === "none") return null;
  const data = visual.data || {};

  let content;
  switch (visual.type) {
    case "linked-list":
    case "array":
    case "stack":
    case "queue":
    case "memory":
    case "binary":
      content = <LinkedList data={data} type={visual.type} />;
      break;
    case "flowchart":
      content = <Flowchart data={data} />;
      break;
    case "tree":
    case "graph":
      content = <Tree data={data} />;
      break;
    case "bar-chart":
    case "line-chart":
    case "scatter-plot":
      content = <Chart data={data} type={visual.type} />;
      break;
    case "comparison-table":
      content = <ComparisonTable data={data} />;
      break;
    case "concept-map":
    case "timeline":
      content = <ConceptMap data={data} />;
      break;
    case "svg":
      // The python visual engine generates raw SVGs for mathematical accuracy
      content = <div className="visual-svg" dangerouslySetInnerHTML={{ __html: data.svg }} />;
      break;
    default:
      content = <Flowchart data={data} />;
  }

  return (
    <div className="lesson-visual">
      <div className="visual-label">VISUAL EXPLANATION</div>
      {visual.title && <h4>{visual.title}</h4>}
      {content}
    </div>
  );
}