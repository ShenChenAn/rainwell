# 雨井 · 雷声停下之前

[打开游戏](https://shenchenan.github.io/rainwell/)

第一人称雷雨夜村庄探索游戏。在灯火逐渐熄灭前，找回三件遗失之物，然后回到井边。

使用 Three.js 在浏览器本地渲染。无需游戏服务器或安装客户端。建议使用电脑浏览器及键盘鼠标，首次打开需要下载场景模型。进度保存在当前浏览器，不跨设备同步。

## 操作

- WASD：移动；Shift：奔跑。
- 按住鼠标左键拖动：观察。
- E：拾取或交互；收集完成后在井边长按 E。
- Tab：方向指引；Esc：暂停与设置。
- 灯光是安全区，听见逼近的脚步就及时回到灯下。

## 本地运行

```sh
npm install
npm test
npm run build
npm start
```

浏览器打开 http://127.0.0.1:8772/ 。也可以直接使用任意静态 HTTP 服务器托管 docs 目录，无需重新构建。

## 目录

- `docs/`：可以直接部署的完整游戏，GitHub Pages 使用 main 分支的此目录。
- `src/`：当前版本源代码与测试。
- `scripts/asset-manifest.json`：发布资源的大小和 SHA-256 校验值。

版本 0.6.1。三维资产由 Lux3D 工作流制作，照明与部分材质经 Blender 烘焙，标题图由图像生成工具制作。第三方软件许可见 docs/THIRD-PARTY-NOTICES.txt。此仓库未为原创代码和美术资产额外授予开源许可。
