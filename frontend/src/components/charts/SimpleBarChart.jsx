import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { CHART_COLOR_PRIMARY, CHART_COLOR_ACCENT, CHART_COLOR_GRID, CHART_COLOR_TICK } from './chartUtils'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 shadow-dropdown text-xs">
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name}: <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * Clean bar chart.
 * @param {{
 *   data: object[]
 *   xKey: string
 *   yKey: string
 *   label?: string
 *   color?: string
 *   highlightIndex?: number
 * }} props
 */
export default function SimpleBarChart({
  data = [],
  xKey = 'name',
  yKey = 'count',
  label = 'Count',
  color = CHART_COLOR_PRIMARY,
  highlightIndex = -1,
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_COLOR_GRID}
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: CHART_COLOR_TICK }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_COLOR_TICK }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar dataKey={yKey} name={label} radius={[3, 3, 0, 0]}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={index === highlightIndex ? CHART_COLOR_ACCENT : color}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
