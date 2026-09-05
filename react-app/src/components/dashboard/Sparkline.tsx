function buildPath(data: number[], width: number, height: number) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)

  return data
    .map((value, i) => {
      const x = i * step
      const y = height - ((value - min) / range) * height
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

function Sparkline({
  data,
  className,
  strokeClassName = "stroke-ink-strong",
  fillClassName,
  width = 100,
  height = 28,
}: {
  data: number[]
  className?: string
  strokeClassName?: string
  fillClassName?: string
  width?: number
  height?: number
}) {
  const linePath = buildPath(data, width, height)
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      {fillClassName && (
        <path d={areaPath} className={fillClassName} stroke="none" />
      )}
      <path
        d={linePath}
        className={strokeClassName}
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export { Sparkline }
