# Fake FIT

<p align="center">
  <a href="./README.md">English</a> | <strong>中文</strong>
</p>

从地图上绘制轨迹，并生成更接近真实跑步记录的 FIT 文件。

![Fake FIT 截图](./static/snapshot.png)

## 功能

- 在地图上绘制轨迹，并导出一个或多个 FIT 文件。
- 可设置开始时间、心率范围、圈数和导出份数。
- 自动保存轨迹到本地，刷新页面后仍可恢复。
- 导出时加入时间、起点、路径偏移、配速和心率随机性，让结果更自然。

## 开发

```bash
pnpm install
pnpm run dev
```

## 构建

```bash
pnpm run build
```

## Credits

- 基于 React、Vite、shadcn/ui、Leaflet、Recharts 和 Garmin FIT SDK 构建。
- 本项目部分参考了 Bilibili 视频 [keep可用的校园跑数据生成工具](https://www.bilibili.com/video/BV1ZfqUBoEFL/) 中展示的工具。

## 许可

[MIT](./LICENSE)
