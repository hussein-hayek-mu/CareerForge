"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";

export function ProfileCVStart({ disabled = false }: { disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.files?.[0];
    if (!next) return;
    setFile(null);
    setError("");
    // This is a local picker, not a security boundary for future server uploads.
    if (!/\.(pdf|docx)$/i.test(next.name)) {
      setError("Choose a PDF or Word (.docx) CV.");
    } else if (!next.size) {
      setError("This file is empty. Choose a CV with content.");
    } else if (next.size > 5 * 1024 * 1024) {
      setError("This file is too large. Choose a CV smaller than 5 MB.");
    } else {
      setFile(next);
    }
    event.currentTarget.value = "";
  }

  function removeFile() {
    setFile(null);
    setError("");
    input.current?.focus();
  }

  return <section className="profile-cv-start" aria-labelledby="profile-start-title">
    <div className="profile-start-heading">
      <p className="eyebrow">START YOUR PROFILE</p>
      <h2 id="profile-start-title">Have a CV? Start here.</h2>
      <p>Bring your existing CV or create your first one. You can also enter your details below.</p>
    </div>
    <div className="profile-start-options">
      <section className="panel profile-start-card" aria-labelledby="existing-cv-title">
        <div className="profile-start-card-heading"><h3 id="existing-cv-title">I have a CV</h3><span className="outline-label">AI autofill · Coming soon</span></div>
        <p>Once AI autofill is available, upload your CV to get suggested profile details, then review them before saving.</p>
        <div className="profile-cv-picker">
          <label htmlFor="profile-cv-file">{file ? "Choose a different CV" : "Choose a CV"}</label>
          <input ref={input} id="profile-cv-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={selectFile} disabled={disabled} aria-describedby={`profile-cv-format profile-cv-privacy${error ? " profile-cv-error" : ""}`} aria-invalid={!!error} />
          <small id="profile-cv-format">PDF or Word (.docx), up to 5 MB.</small>
        </div>
        {error && <p id="profile-cv-error" className="form-error" role="alert">{error}</p>}
        <div role="status" className="profile-cv-selection">
          {file && <><p><strong>{file.name}</strong><span>Selected on this page only · {(file.size / 1024 / 1024).toFixed(2)} MB</span></p><button type="button" className="text-button" onClick={removeFile} disabled={disabled}>Remove selected CV</button></>}
        </div>
        <p id="profile-cv-privacy" className="muted-note">File selection is a preview for now. Your CV is not uploaded, stored or read, and no profile fields are filled. Leaving this page clears the selection.</p>
        <Link href="#account-name" className="text-button">Enter my details manually <span aria-hidden="true">↓</span></Link>
      </section>
      <section className="panel profile-start-card" aria-labelledby="new-cv-title">
        <p className="eyebrow">NO CV YET?</p>
        <h3 id="new-cv-title">Create your first CV</h3>
        <p>Start in CV &amp; Portfolio to put your education, experience and projects into a CV of your own.</p>
        <Link href="/documents" className="button primary profile-create-cv">Create CV <span aria-hidden="true">↗</span></Link>
        <p className="muted-note">The builder opens with sample content. Replace it with your own details. Builder edits stay in that tab and do not fill this profile.</p>
      </section>
    </div>
  </section>;
}
