import type { Register } from 'claude-code'

import { findPaths, linkify, pathFromUrl } from './paths'

export const register: Register = on => {
  let home = ''
  // 路径是否存在的缓存：同一路径只查一次磁盘
  const exists = new Map<string, boolean>()

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary) return next(e)

    if (!home) home = (await $.env.get('HOME')) ?? ''

    const found = findPaths(e.props.text, home)
    if (found.length === 0) return next(e)

    await Promise.all(
      found
        .filter(c => !exists.has(c.abs))
        .map(async c => {
          exists.set(c.abs, await $.fs.exists(c.abs).catch(() => false))
        }),
    )

    const { text, hrefs } = linkify(e.props.text, home, abs => exists.get(abs) === true)
    if (hrefs.length === 0) return next(e)

    // 主屏模式：只改写文本，由终端按普通 file:// 链接绘制（cmd+点击打开）
    if (e.viewport?.isFullscreen !== true) {
      return next({ ...e, props: { ...e.props, text } })
    }

    // 全屏模式：自己画这段 markdown，接管单击 → 访达高亮文件 + 复制路径（静默，不弹提示）
    const { Box, Text, Markdown } = $.ui.resolve(e)
    const reveal = async (href: string, surface: typeof e.surface) => {
      const path = pathFromUrl(href)
      if (!path) return
      await Promise.all([
        $.process.run(['open', '-R', path]).catch(() => null),
        $.ui.copy({ text: path, surface }).catch(() => null),
      ])
    }

    return (
      <Box flexDirection="row">
        <Box width={2} flexShrink={0}>
          <Text>{e.props.isFirstOfReply ? '⏺' : ' '}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Markdown
            key="paths"
            text={text}
            pressableLinks={hrefs}
            onLinkPress={(link, press) => void reveal(link.href, press.surface)}
          />
        </Box>
      </Box>
    )
  })
}
