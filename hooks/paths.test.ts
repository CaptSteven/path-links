import { expect, test } from 'claude-code/testing'

import { findPaths, fileUrl, linkify, pathFromUrl } from './paths'

const HOME = '/Users/me'
const all = () => true

test('行内代码里的中文路径变成链接，行号保留', async () => {
  const src = '成片在 `/Users/me/项目 文件/out.mp4:12` 里。'
  const { text, hrefs } = linkify(src, HOME, all)
  expect(hrefs).toEqual([fileUrl('/Users/me/项目 文件/out.mp4')])
  expect(text).toBe(`成片在 [\`/Users/me/项目 文件/out.mp4:12\`](${hrefs[0]}) 里。`)
  expect(pathFromUrl(hrefs[0] ?? '')).toBe('/Users/me/项目 文件/out.mp4')
})

test('裸路径与 ~ 展开，句末标点不算路径', async () => {
  const { text, hrefs } = linkify('见 ~/a/b.png。也看 /tmp/x/y.txt.', HOME, all)
  expect(hrefs).toEqual([fileUrl('/Users/me/a/b.png'), fileUrl('/tmp/x/y.txt')])
  expect(text).toBe(`见 [~/a/b.png](${hrefs[0]})。也看 [/tmp/x/y.txt](${hrefs[1]}).`)
})

test('URL、单级片段、代码块和已有链接都不改', async () => {
  const src = [
    '接口 https://api.example.com/v1/models 和 /v1 不是文件。',
    '```bash',
    'ls /Users/me/a/b.png',
    '```',
    '已有 [链接](/Users/me/a/b.png)。',
  ].join('\n')
  expect(findPaths(src, HOME)).toEqual([])
  expect(linkify(src, HOME, all).text).toBe(src)
})

test('不存在的路径不改写', async () => {
  const src = '看 `/Users/me/none/x.png`'
  const r = linkify(src, HOME, () => false)
  expect(r.text).toBe(src)
  expect(r.hrefs).toEqual([])
})
