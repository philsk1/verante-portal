import { createContext, useContext, useState } from 'react'

const PreviewContext = createContext(null)
export const usePreview = () => useContext(PreviewContext)

export const PreviewProvider = ({ children }) => {
  const [previewTenantId, setPreviewTenantId]         = useState(null)
  const [previewBusinessName, setPreviewBusinessName] = useState('')
  const [tierOverride, setTierOverride]               = useState(null)
  const [previewEditable, setPreviewEditable]         = useState(false)

  const value = {
    isPreview:           !!previewTenantId,
    previewReadOnly:     !!previewTenantId && !previewEditable,
    previewTenantId,
    previewBusinessName,
    tierOverride,
    setTierOverride,
    previewEditable,
    setPreviewEditable,
    enterPreview: (tid, name) => { setPreviewTenantId(tid); setPreviewBusinessName(name); setPreviewEditable(false) },
    exitPreview:  ()          => { setPreviewTenantId(null); setPreviewBusinessName(''); setPreviewEditable(false) },
  }

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
}
