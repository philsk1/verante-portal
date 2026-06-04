import { createContext, useContext, useState } from 'react'

const PreviewContext = createContext(null)
export const usePreview = () => useContext(PreviewContext)

export const PreviewProvider = ({ children }) => {
  const [previewTenantId, setPreviewTenantId]     = useState(null)
  const [previewBusinessName, setPreviewBusinessName] = useState('')

  const value = {
    isPreview:           !!previewTenantId,
    previewTenantId,
    previewBusinessName,
    enterPreview: (tid, name) => { setPreviewTenantId(tid); setPreviewBusinessName(name) },
    exitPreview:  ()          => { setPreviewTenantId(null); setPreviewBusinessName('') },
  }

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
}
