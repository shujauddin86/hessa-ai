import React, { memo, useCallback, useState } from "react";
import BackHeader from "../components/BackHeader";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";
import { sanitizeUrl } from "../utils/sanitize";

function UploadScreen() {
  const { navigate } = useApp();
  const [link, setLink] = useState("");

  const handleUpload = useCallback(() => navigate("processing"), [navigate]);

  const handleLinkChange = useCallback((e) => {
    setLink(sanitizeUrl(e.target.value));
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        setLink(sanitizeUrl(text));
      }
    } catch {
      /* clipboard blocked — silently ignore */
    }
  }, []);

  return (
    <section className="screen upload" aria-label="Upload video">
      <BackHeader title="Upload Video" back="login" />
      <p className="lead">Upload a video and we&apos;ll find you in it.</p>

      <button type="button" className="upload-zone" onClick={handleUpload}>
        <span className="ic" aria-hidden="true">
          <Icon name="cloud-up" size={20} />
        </span>
        <span className="label">
          Tap to upload
          <br />
          or drag and drop
        </span>
        <span className="hint">Supports: MP4, MOV, AVI</span>
      </button>

      <div className="or">or</div>

      <label className="link-input">
        <span className="ic" aria-hidden="true">
          <Icon name="link" size={16} />
        </span>
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck="false"
          placeholder="Paste video link here"
          value={link}
          onChange={handleLinkChange}
        />
        <button
          type="button"
          className="copy"
          aria-label="Paste from clipboard"
          onClick={handlePaste}
        >
          <Icon name="copy" size={16} />
        </button>
      </label>

      <div className="or">or</div>

      <Button variant="ghost" onClick={handleUpload}>
        Upload Video
      </Button>

      <div className="privacy">
        <span className="lock">
          <Icon name="lock" size={12} />
          Your video is encrypted and
        </span>
        <span>deleted after processing.</span>
        <span>Max size: —</span>
      </div>
    </section>
  );
}

export default memo(UploadScreen);
