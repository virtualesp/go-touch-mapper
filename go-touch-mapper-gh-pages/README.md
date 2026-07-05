# Touch Mapper Frontend

这个目录是 Touch Mapper 的前端配置页面，使用 Vite 构建。

## 开发

```bash
npm install
npm run dev
```

开发服务器默认由 Vite 启动，脚本已配置为监听 `0.0.0.0`，方便在局域网或容器环境访问。

## 构建目标

构建时会注入 `BUILD_TARGET`，代码中可以从 `src/buildTarget.js` 获取当前目标：

```js
import { BUILD_TARGET, IS_GO_BACKEND, IS_STATIC_TARGET, IS_PICO_TARGET } from './buildTarget';
```

当前允许的目标值是：

```text
go
static
pico
```

未指定目标时会提示并使用默认值 `go`；指定了不在允许范围内的目标时，构建会失败。

推荐直接使用目标值作为 Vite mode 构建不同场景的单文件产物：

```bash
npm run build:go      # BUILD_TARGET=go
npm run build:static  # BUILD_TARGET=static
npm run build:pico    # BUILD_TARGET=pico
```

开发服务器也可以直接指定目标 mode：

```bash
yarn start --mode go
yarn start --mode static
yarn start --mode pico
```

或者使用脚本别名：

```bash
yarn start:go     # http://localhost:5173，标题 TouchMapper:go
yarn start:static # http://localhost:5174，标题 TouchMapper:static
yarn start:pico   # http://localhost:5175，标题 TouchMapper:pico
```

如果需要同时启动三个模式的开发服务器：

```bash
yarn start_all
```

也可以直接覆盖目标值：

```bash
VITE_BUILD_TARGET=static npm run build
BUILD_TARGET=pico npm run build
```

## 单文件构建

生产构建输出到 `build/` 目录，并通过 `vite-plugin-singlefile` 将 JavaScript 和 CSS 内联到单个文件：

```text
build/index.html
```

这个单文件可以直接作为静态页面发布。

## 预览生产构建

```bash
npm run preview
```
