const fs = require('fs')
const path = require('path')

const FILES = [
  'AIBehaviour',
  'AccountSettings',
  'ActivityDashboard',
  'BusinessProfile',
  'ClientDirectory',
  'Integrations',
  'ListenTab',
  'PartnersReferrals',
  'ProductCatalogue',
  'StaffDirectory',
]

// Patterns that are WRITE guards — safe to replace with previewReadOnly
// Key distinction: `if (isPreview) return` and `if (isPreview || ...) return`
// are write guards. `if (isPreview) {` blocks are data-loading — leave alone.

FILES.forEach(name => {
  const file = path.join(__dirname, 'src/pages', name + '.jsx')
  let src = fs.readFileSync(file, 'utf8')
  const original = src

  // 1. Add previewReadOnly const after `const isPreview = ...` line
  //    Only if not already there
  if (!src.includes('previewReadOnly')) {
    src = src.replace(
      /(  const isPreview\s*=\s*[^\n]+\n)/,
      '$1  const previewReadOnly = preview?.previewReadOnly ?? isPreview\n'
    )
  }

  // 2. Replace write guards — only the `return` forms, not the `{` block forms
  //    `if (isPreview) return` → `if (previewReadOnly) return`
  src = src.replace(/if \(isPreview\) return/g, 'if (previewReadOnly) return')

  //    `if (isPreview || ...) return` → `if (previewReadOnly || ...) return`
  src = src.replace(/if \(isPreview \|\| /g, 'if (previewReadOnly || ')

  //    `disabled={... isPreview ...}` button props
  src = src.replace(/disabled=\{([^}]*)\bisPreview\b([^}]*)\}/g, (m, pre, post) => {
    return 'disabled={' + pre + 'previewReadOnly' + post + '}'
  })

  if (src !== original) {
    fs.writeFileSync(file, src)
    // Count changes
    const guardChanges = (original.match(/if \(isPreview\) return|if \(isPreview \|\| /g) || []).length
    console.log('✓ ' + name + '.jsx — ' + guardChanges + ' write guards updated')
  } else {
    console.log('  ' + name + '.jsx — no changes')
  }
})
