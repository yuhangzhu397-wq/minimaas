import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const css = await readFile("/tmp/water-level-app.css", "utf8");
const js = await readFile("/tmp/water-level-app.js", "utf8");

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="MiniMaaS 水位管理前端原型" />
    <title>MiniMaaS · 水位管理原型</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      if (!window.location.hash) window.location.hash = "#/water-level/models";
    </script>
    <script>${js.replace(/<\/script/gi, "<\\/script")}</script>
  </body>
</html>`;

await writeFile(resolve(root, "水位管理前端原型.html"), html);
