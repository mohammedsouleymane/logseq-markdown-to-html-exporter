function saveTextAsFile(filename, text) {
  const blob = new Blob([text], { type: 'text/html' }) // Updated MIME type
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function updateImageSrcInHtml(html) {
  const graph = await logseq.App.getCurrentGraph()
  const assetDir = `${graph.path}/assets`.replace(/\\/g, '/')
  const filePrefix = `file:///${assetDir}`

  return html.replace(
    /<img\s+([^>]*?)src=["']\.\.\/assets\/([^"']+)["']([^>]*)>/g,
    (_, before, filename, after) =>
      `<img ${before}src="${filePrefix}/${filename}"${after}>`
  )
}



// Convert block tree to Markdown text
function blockTreeToMarkdown(blocks, depth = 0) {
  return blocks.map(block => {
    const prefix = '  '.repeat(depth) + '- '
    let content = `${prefix}${block.content}`

    if (block.children && block.children.length > 0) {
      content += '\n' + blockTreeToMarkdown(block.children, depth + 1)
    }

    return content
  }).join('\n')
}

async function exportCurrentPageAsHTML() {
  const page = await logseq.Editor.getCurrentPage()
  if (!page) {
    logseq.App.showMsg('⚠️ No current page found.')
    return
  }

  const blocksTree = await logseq.Editor.getPageBlocksTree(page.originalName)
  const markdownContent = blockTreeToMarkdown(blocksTree).replace("collapsed:: true", "")



  const md = new markdownit()
  let htmlBody = md.render(markdownContent)
  await updateImageSrcInHtml(htmlBody).then(hb => {
    htmlBody = hb
  })
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${page.originalName}</title>
  <script>
    window.MathJax = {
       tex: {
      inlineMath: [
        ['$', '$'],
        ['[', ']'],
      ]
    },
      svg: { fontCache: 'global' }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 2rem;
      line-height: 1.6;
      background-color: #fefefe;
      color: #333;
    }

    h2 {
      color: #2c3e50;
      margin-top: 2rem;
    }

    p {
      margin-bottom: 1rem;
    }

    strong {
      font-weight: bold;
    }

    em {
      font-style: italic;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>
`

  const filename = `${page.originalName}.html`
  saveTextAsFile(filename, htmlTemplate)
  logseq.App.showMsg(`✅ Exported ${filename}`)
}

// Plugin entry point
function main() {
  // Register a clickable icon in the toolbar
  logseq.App.registerUIItem('toolbar', {
    key: 'export-html',
    template: `
      <a class="button" data-on-click="export-html" title="Export current page as HTML">

<svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
  <path stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 8-4 4 4 4m8 0 4-4-4-4m-2-3-4 14"/>
</svg>


      </a>
    `
  })

  // Register command handler for the icon click
  logseq.provideModel({
    'export-html': async () => {
      await exportCurrentPageAsHTML()
    }
  })
}


// Initialize plugin
logseq.ready(main).catch(console.error)
