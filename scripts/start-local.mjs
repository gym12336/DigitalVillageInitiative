import { existsSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const backendUrl = 'http://127.0.0.1:3001/api/health'
const children = []
let shuttingDown = false

function print(message) {
  process.stdout.write(`\n[数乡计划] ${message}\n`)
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const done = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(500)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function healthOkay() {
  try {
    const response = await fetch(backendUrl, { signal: AbortSignal.timeout(800) })
    const data = await response.json()
    return response.ok && data?.ok === true
  } catch {
    return false
  }
}

async function waitForBackend(timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await healthOkay()) return true
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

function startProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    detached: false,
    ...options,
  })
  children.push(child)
  return child
}

function runOneShot(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
      ...options,
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`本地演示数据准备失败（状态码 ${code ?? 'unknown'}）。`))
    })
  })
}

function stopChild(child) {
  if (!child?.pid || child.exitCode !== null) return
  try {
    child.kill('SIGTERM')
  } catch {
    // 进程可能已经自然退出。
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of [...children].reverse()) stopChild(child)
  setTimeout(() => process.exit(code), 120).unref()
}

process.once('SIGINT', () => shutdown(0))
process.once('SIGTERM', () => shutdown(0))
process.once('SIGHUP', () => shutdown(0))
process.once('exit', () => {
  for (const child of [...children].reverse()) stopChild(child)
})

async function main() {
  if (!existsSync(join(rootDir, 'node_modules'))) {
    throw new Error('尚未安装项目依赖。请先在项目目录运行 npm install。')
  }

  print('正在准备本地预览……')

  const backendRunning = await healthOkay()
  if (backendRunning) {
    print('检测到项目后端已在 3001 端口运行，将直接复用。')
  } else {
    if (await canConnect(3001)) {
      throw new Error('3001 端口已被其他程序占用，且不是可用的数乡计划后端。请先关闭占用程序。')
    }

    if (process.env.SHUXIANG_SKIP_DEMO_SEED !== '1') {
      print('正在检查本地演示档案……')
      await runOneShot(process.execPath, ['server/db/seed-villages.js'])
      await runOneShot(process.execPath, ['server/db/seed-voice.js'])
    }

    print('正在启动数据服务……')
    const backend = startProcess(process.execPath, ['server/index.js'], {
      env: {
        ...process.env,
        JWT_SECRET: process.env.JWT_SECRET || 'shuxiang-local-review-only',
      },
    })
    backend.once('exit', (code) => {
      if (!shuttingDown && code !== null && code !== 0) {
        print(`数据服务异常退出（状态码 ${code}）。`)
        shutdown(code || 1)
      }
    })

    if (!(await waitForBackend())) {
      throw new Error('数据服务启动超时，请查看上方错误信息。')
    }
  }

  print('数据服务已就绪，正在打开网站。若 5173 被占用，系统会自动选择下一端口。')
  const frontendArgs = [join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1']
  if (process.env.SHUXIANG_NO_OPEN !== '1') frontendArgs.push('--open')
  const frontend = startProcess(process.execPath, frontendArgs)
  frontend.once('exit', (code) => {
    if (!shuttingDown) shutdown(code || 0)
  })

  print('预览运行中。关闭此窗口或按 Control+C，即可停止本次启动的服务。')
}

main().catch((error) => {
  print(error.message || String(error))
  shutdown(1)
})
