// 纯逻辑：在回复的 markdown 里找本地路径，并改写成 file:// 链接。
// 不依赖 $，便于在测试里单独跑。

/** 一个候选路径：原文里的写法、展开 ~ 后的绝对路径、可选的 :行号 后缀。 */
export type Candidate = { raw: string; abs: string; suffix: string }

// 路径里不允许出现的字符：空白、引号、括号、反引号，以及中文标点。
const STOP = "\\s`'\"<>()\\[\\]{}|*，。；：、！？（）《》「」『』【】“”‘’"
// 前面不能紧挨着单词字符、点、冒号、斜杠（排除 URL 的路径部分和相对路径片段）。
const BARE = new RegExp(`(?<![\\w.:/~\\]])(~?/[^${STOP}]+)`, 'g')
const TRAIL = /[.,;:!?]+$/
const LINE = /(:\d+(?::\d+)?)$/

/** 把一段原文切成「路径本体 + 行号后缀」，过滤掉明显不是路径的。 */
export function parse(raw: string, home: string): Candidate | null {
  let s = raw.replace(TRAIL, '')
  let suffix = ''
  const m = LINE.exec(s)
  if (m) {
    suffix = m[1] ?? ''
    s = s.slice(0, s.length - suffix.length)
  }
  // 至少两级（/a/b），排除 "/" "/v1" 这类片段
  const body = s.startsWith('~/') ? s.slice(1) : s
  if (body.split('/').filter(Boolean).length < 2) return null
  const abs = s.startsWith('~/') ? home + s.slice(1) : s
  return { raw: s, abs, suffix }
}

/** file:// 链接：保留斜杠，编码中文、空格和括号。 */
export function fileUrl(abs: string): string {
  return 'file://' + encodeURI(abs).replace(/\(/g, '%28').replace(/\)/g, '%29')
}

/** 从链接还原出绝对路径。 */
export function pathFromUrl(href: string): string | null {
  if (!href.startsWith('file://')) return null
  try {
    return decodeURI(href.slice('file://'.length)).replace(/%28/g, '(').replace(/%29/g, ')')
  } catch {
    return null
  }
}

/** 一段非代码块文本里的全部候选（行内代码与裸路径）。 */
function candidatesIn(seg: string, home: string): Candidate[] {
  const out: Candidate[] = []
  for (const m of seg.matchAll(/`([^`\n]+)`/g)) {
    const c = parse(m[1] ?? '', home)
    if (c && (m[1] ?? '').replace(TRAIL, '') === c.raw + c.suffix) out.push(c)
  }
  const plain = seg.replace(/`[^`\n]+`/g, ' ').replace(/\]\([^)]*\)/g, ' ')
  for (const m of plain.matchAll(BARE)) {
    const c = parse(m[1] ?? '', home)
    if (c) out.push(c)
  }
  return out
}

/** 按代码块切分：奇数段是 ``` 围栏内，原样保留。 */
function splitFences(text: string): string[] {
  return text.split(/(^```[\s\S]*?^```[^\n]*$)/m)
}

export function findPaths(text: string, home: string): Candidate[] {
  const seen = new Map<string, Candidate>()
  splitFences(text).forEach((seg, i) => {
    if (i % 2 === 1) return
    for (const c of candidatesIn(seg, home)) seen.set(c.abs + c.suffix, c)
  })
  return [...seen.values()]
}

/**
 * 把确认存在的路径改写成链接，返回新文本和用到的链接。
 * `ok(abs)` 判断该路径是否存在（由调用方查磁盘并缓存）。
 */
export function linkify(
  text: string,
  home: string,
  ok: (abs: string) => boolean,
): { text: string; hrefs: string[] } {
  const hrefs = new Set<string>()
  const segs = splitFences(text).map((seg, i) => {
    if (i % 2 === 1) return seg
    // 1) 整段行内代码就是路径：`/a/b` → [`/a/b`](file://…)
    seg = seg.replace(/(?<!\[)`([^`\n]+)`(?!\]\()/g, (all, inner: string) => {
      const c = parse(inner, home)
      if (!c || inner.replace(TRAIL, '') !== c.raw + c.suffix || !ok(c.abs)) return all
      const href = fileUrl(c.abs)
      hrefs.add(href)
      return `[\`${inner}\`](${href})`
    })
    // 2) 裸路径：跳过行内代码和已有链接，只改其余文本
    return seg
      .split(/(\[[^\]\n]*\]\([^)\n]*\)|`[^`\n]+`)/)
      .map((part, j) => {
        if (j % 2 === 1) return part
        return part.replace(BARE, (all, raw: string) => {
          const c = parse(raw, home)
          if (!c || !ok(c.abs)) return all
          const href = fileUrl(c.abs)
          hrefs.add(href)
          const tail = raw.slice(c.raw.length + c.suffix.length)
          return `[${c.raw}${c.suffix}](${href})${tail}`
        })
      })
      .join('')
  })
  return { text: segs.join(''), hrefs: [...hrefs] }
}
