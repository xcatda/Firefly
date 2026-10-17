/* 新建一条待办（和 new-post 一样：一条待办 = 一个 markdown 文件） */

import fs from "fs"
import path from "path"

function getDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No title argument provided
Usage: pnpm new-todo -- <待办标题>`)
  process.exit(1) // Terminate the script and return error code 1
}

const title = args.join(" ").trim()

// 文件名沿用标题，去掉目录分隔符等非法字符
let fileName = title
  .replace(/[\\/:*?"<>|]/g, "-")
  .replace(/\s+/g, "-")
  .replace(/-{2,}/g, "-")
  .replace(/^-+|-+$/g, "")
if (!fileName) {
  console.error("Error: Title cannot be empty")
  process.exit(1)
}

// Add .md extension if not present
if (!/\.(md|mdx)$/i.test(fileName)) {
  fileName += ".md"
}

const targetDir = "./src/content/todos/"
const fullPath = path.join(targetDir, fileName)

if (fs.existsSync(fullPath)) {
  console.error(`Error: File ${fullPath} already exists `)
  process.exit(1)
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// frontmatter 里的标题需要转义引号，避免 YAML 解析失败
const escapedTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

const content = `---
title: "${escapedTitle}"
date: ${getDate()}
done: false
description: ''
---
`

fs.writeFileSync(fullPath, content)

console.log(`Todo ${fullPath} created`)
