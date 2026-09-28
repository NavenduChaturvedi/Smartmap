import { motion } from "framer-motion"

import { KpiCard, type KpiCardProps } from "./KpiCard"

function KpiRow({ items }: { items: KpiCardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((kpi) => (
        // A quick fade, no stagger: the numbers are the point of this row and
        // shouldn't be hidden behind an entrance animation.
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
        >
          <KpiCard {...kpi} />
        </motion.div>
      ))}
    </div>
  )
}

export { KpiRow }
