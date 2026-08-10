import { readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const consoleDirectory = resolve(scriptDirectory, "..");
const distDirectory = join(consoleDirectory, "dist-standalone");
const assetsDirectory = join(distDirectory, "assets");
const outputName = "监控概览-研发预览.html";

const assetFiles = await readdir(assetsDirectory);
const javascriptFiles = assetFiles.filter((file) => file.endsWith(".js"));
const cssFiles = assetFiles.filter((file) => file.endsWith(".css"));

if (javascriptFiles.length !== 1 || cssFiles.length !== 1) {
  throw new Error(
    `单文件导出要求恰好一个 JS 和一个 CSS，当前为 JS=${javascriptFiles.length}、CSS=${cssFiles.length}`,
  );
}

const [javascript, css] = await Promise.all([
  readFile(join(assetsDirectory, javascriptFiles[0]), "utf8"),
  readFile(join(assetsDirectory, cssFiles[0]), "utf8"),
]);

const routeBootstrap = `
    (() => {
      const legacyRoutes = {
        "#suppliers": "#/water-level/suppliers",
        "#users": "#/water-level/pins",
        "#models": "#/water-level/models"
      };
      const nextHash =
        legacyRoutes[window.location.hash] ||
        (!window.location.hash || window.location.hash === "#"
          ? "#/water-level/suppliers"
          : null);
      if (nextHash) window.location.hash = nextHash.slice(1);
    })();
`;

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="MiniMaaS 监控概览研发交互预览" />
    <title>MiniMaaS · 监控概览</title>
    <style>${css.replaceAll("</style", "<\\/style")}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${routeBootstrap}</script>
    <script type="module">${javascript.replaceAll("</script", "<\\/script")}</script>
  </body>
</html>
`;

const projectOutput = resolve(consoleDirectory, "../../..", outputName);
const desktopOutput = join(homedir(), "Desktop", outputName);

await Promise.all([
  writeFile(projectOutput, html, "utf8"),
  writeFile(desktopOutput, html, "utf8"),
]);

console.log(`已生成：${projectOutput}`);
console.log(`已生成：${desktopOutput}`);
console.log(`文件大小：${Buffer.byteLength(html)} bytes`);
