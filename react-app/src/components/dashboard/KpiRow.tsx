import { motion } from "framer-motion"

import { KpiCard, type KpiCardProps } from "./KpiCard"

function KpiRow({ items }: { items: KpiCardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <KpiCard {...kpi} />
        </motion.div>
      ))}
    </div>
  )
}

export { KpiRow }
