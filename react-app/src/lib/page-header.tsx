import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

interface PageMeta {
  crumbs: string[]
  primaryAction?: { label: string; onClick: () => void }
}

interface PageHeaderApi {
  meta: PageMeta
  setMeta: (meta: PageMeta) => void
}

const DEFAULT_META: PageMeta = { crumbs: ["Smartmap"] }

const PageHeaderContext = createContext<PageHeaderApi | null>(null)

function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>(DEFAULT_META)
  const value = useMemo(() => ({ meta, setMeta }), [meta])
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>
}

function usePageHeaderApi() {
  const ctx = useContext(PageHeaderContext)
  if (!ctx) throw new Error("usePageHeaderApi must be used within PageHeaderProvider")
  return ctx
}

/** Call from a page to set the breadcrumb trail (and optional primary action) while it's mounted. */
function usePageHeader(crumbs: string[], primaryAction?: PageMeta["primaryAction"]) {
  const { setMeta } = usePageHeaderApi()
  const key = crumbs.join("/")
  useEffect(() => {
    setMeta({ crumbs, primaryAction })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, primaryAction?.label])
}

export { PageHeaderProvider, usePageHeaderApi, usePageHeader }
