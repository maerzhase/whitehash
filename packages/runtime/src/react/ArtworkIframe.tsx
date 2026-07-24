/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
"use client"

import clsx from "clsx"
import {
  ARTWORK_IFRAME_ALLOW,
  ARTWORK_IFRAME_SANDBOX,
} from "@whitehash/core"
import { forwardRef, useEffect } from "react"

export interface ArtworkIframeProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  onMount?: () => void
}

export const DEFAULT_IFRAME_ALLOW = ARTWORK_IFRAME_ALLOW
export const DEFAULT_IFRAME_SANDBOX = ARTWORK_IFRAME_SANDBOX

export const ArtworkIframe = forwardRef<HTMLIFrameElement, ArtworkIframeProps>(
  function ArtworkIframe(props, ref) {
    const {
      className,
      allow = DEFAULT_IFRAME_ALLOW,
      sandbox = DEFAULT_IFRAME_SANDBOX,
      onMount,
      ...rest
    } = props

    // biome-ignore lint/correctness/useExhaustiveDependencies: onMount should only run once on mount
    useEffect(() => {
      onMount?.()
    }, [])

    return (
      <iframe
        ref={ref}
        className={clsx(className)}
        allow={allow}
        sandbox={sandbox}
        {...rest}
      />
    )
  }
)
