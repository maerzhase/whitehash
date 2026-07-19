import { afterEach, describe, expect, it, vi } from "vitest"
import {
  BlockchainType,
  createRuntimeConnector,
  createRuntimeController,
  type FxParamDefinitions,
} from "./index.js"

afterEach(() => vi.unstubAllGlobals())

describe("runtime variations", () => {
  it("rerenders after parameter edits and produces a different URL for a new hash", () => {
    const navigations: string[] = []
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const iframe = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      contentWindow: {
        location: { replace: (url: string) => navigations.push(url) },
        postMessage: vi.fn(),
      },
    } as unknown as HTMLIFrameElement
    const definition: FxParamDefinitions = [
      {
        id: "density",
        type: "number",
        default: 1,
        value: 1,
        options: { min: 1, max: 10, step: 1 },
      },
    ]
    const connector = createRuntimeConnector({ resolveUri: uri => uri })
    const controller = createRuntimeController({
      state: {
        cid: "https://art.example/index.html",
        chain: BlockchainType.ETHEREUM,
        snippetVersion: "3.3.0",
        hash: "oo1111111111111111111111111111111111111111111111111",
        definition,
      },
      options: { connector },
    })

    controller.init(iframe)
    const initialUrl = controller.getUrl()
    controller.controls().update({ density: 7 }, definition, { forceRefresh: true })
    const parameterUrl = controller.getUrl()
    controller.runtime().updateState({
      hash: "oo2222222222222222222222222222222222222222222222222",
    })
    const newHashUrl = controller.getUrl()

    expect(parameterUrl).not.toBe(initialUrl)
    expect(parameterUrl).toContain("#0x")
    expect(newHashUrl).not.toBe(parameterUrl)
    expect(newHashUrl).toContain("oo222222")
    expect(navigations.at(-1)).toBe(newHashUrl)
  })
})
