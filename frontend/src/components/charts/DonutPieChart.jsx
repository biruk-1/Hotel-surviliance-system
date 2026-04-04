import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { CHART_COLORS } from './chartUtils'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value, payload: item } = payload[0]
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 shadow-dropdown text-xs">
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">
        Count: <span className="font-medium text-foreground">{value}</span>
        {item.pct !== undefined && (
          <span className="ml-1 text-muted-foreground">({item.pct}%)</span>
        )}
      </p>
    </div>
  )
}

const renderLegend = ({ payload }) => (
  <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
    {payload.map((entry, i) => (
      <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: entry.color }}
        />
        {entry.value}
      </li>
    ))}
  </ul>
)

/**
 * Minimal donut / pie chart.
 * @param {{ data: { name: string; value: number }[]; colors?: string[] }} props
 */
export default function DonutPieChart({ data = [], colors = CHART_COLORS }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  const enriched = data.map((d) => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={enriched}
          cx="50%"
          cy="45%"
          innerRadius="52%"
          outerRadius="72%"
          paddingAngle={2}
          dataKey="value"
        >
          {enriched.map((_, index) => (
            <Cell
              key={index}
              fill={colors[index % colors.length]}
              strokeWidth={0}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  )
}
