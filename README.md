# path-links

> 让 Claude Code 回复中的本地路径可点击，在 Finder 中定位并复制路径。

**技术栈：** TypeScript · Claude Code 插件 / hooks · macOS

**使用边界：** 单击行为依赖 Claude Code 全屏界面；定位使用 macOS `open -R`。

---

让 Claude Code 回复里的本地文件路径变成可点击的链接：**单击路径，就在访达（Finder）里高亮这个文件，同时把路径复制到剪贴板**。不弹提示，只改显示，不改对话记录。

Turns local file paths in Claude Code replies into links: a click reveals the file in Finder and copies its path to the clipboard. macOS only.

## 安装

在 Claude Code 的输入框里运行：

```
/plugin install path-links --marketplace CaptSteven/path-links
```

先回答 `y` 添加市场，再选择安装范围（默认第一个，用户范围，回车即可）。

也可以在 shell 里运行：

```
claude plugin install path-links --marketplace CaptSteven/path-links
```

桌面版里 `/plugin` 不可用时：点击输入框旁边的 +，选 Plugins，用 `CaptSteven/path-links` 添加市场（Add marketplace），再添加插件（Add plugin）。

## 识别哪些路径

- 会变成链接：以 `/` 或 `~/` 开头、至少两级、并且磁盘上确实存在的路径，包括写在行内代码 `` `…` `` 里的路径。带 `:行号` 后缀的路径会去掉行号再定位。
- 不会改动：网址、围栏代码块里的内容、已经是链接的文本、不存在的路径。

## 使用条件

- **单击生效需要 Claude Code 的全屏界面**：只有在全屏界面下，终端才会把鼠标点击交给 Claude Code，插件才能接管单击。在普通界面下，路径是一个普通的 `file://` 链接，点击效果由终端决定。
- **macOS 自带的 Terminal.app**：Claude Code 默认判定它不支持终端超链接，会在路径后面再显示一行 `(file:///…)`。在 `~/.claude/settings.json` 里加上下面的配置，然后重启 Claude Code，链接就会直接附在路径文字上：

  ```json
  {
    "env": { "FORCE_HYPERLINK": "1" }
  }
  ```

- 定位文件用的是 macOS 的 `open -R` 命令，所以只支持 macOS。

## 开发

- `hooks/paths.ts`：识别路径、改写成 `file://` 链接（纯函数）。
- `hooks/register.tsx`：在 `AssistantMessage` 渲染时改写文本，并处理单击。
- `claude plugin test .` 运行测试，`claude plugin validate .` 校验。

## 许可证

MIT

<!-- 更新备注：YANG KAISEN，2026-11-11；改写与核对依据见工作区变更记录。 -->
