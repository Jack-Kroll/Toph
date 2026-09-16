import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Avatar } from "../components/Avatar";
import { errorMessage, useLayout } from "../components/layoutContext";
import { Modal } from "../components/Modal";
import type { Profile } from "../hooks/useDashboardData";
import * as settings from "../features/settings/api";

const CONFIRM_WORD = "DELETE";

function timeZones(current: string) {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes(current) ? zones : [current, ...zones];
}

export function SettingsPage() {
  const { data } = useLayout();

  useEffect(() => {
    document.title = "Settings · Toph";
  }, []);

  return (
    <main className="main-content">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Your profile, farm details, and account</p>
        </div>
      </header>
      {data.profile ? (
        // Keyed so the forms start from the loaded values.
        <SettingsForms key={data.profile.id} profile={data.profile} />
      ) : (
        <div className="settings-grid" aria-busy="true">
          <section className="settings-card skeleton-card" />
          <section className="settings-card skeleton-card" />
        </div>
      )}
    </main>
  );
}

function SettingsForms({ profile }: { profile: Profile }) {
  const { session, data, notify } = useLayout();
  const isAdmin = profile.role === "admin";
  const isDemo = session.user.is_anonymous ?? false;

  const [fullName, setFullName] = useState(profile.fullName);
  const [farmName, setFarmName] = useState(profile.organization.name);
  const [timezone, setTimezone] = useState(profile.organization.timezone);
  const [busy, setBusy] = useState<
    "photo" | "name" | "farm" | "delete" | null
  >(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const zones = useMemo(
    () => timeZones(profile.organization.timezone),
    [profile.organization.timezone],
  );

  async function run(
    task: NonNullable<typeof busy>,
    action: () => Promise<void>,
    success: string,
  ) {
    setBusy(task);
    try {
      await action();
      notify(success);
      await data.refresh();
    } catch (caught) {
      notify(errorMessage(caught), "error");
    } finally {
      setBusy(null);
    }
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      notify("Choose an image under 15 MB.", "error");
      return;
    }
    void run(
      "photo",
      () => settings.uploadAvatar(profile.id, file, profile.avatarPath),
      "Profile photo updated.",
    );
  }

  function saveName(event: FormEvent) {
    event.preventDefault();
    void run(
      "name",
      () => settings.updateName(profile.id, fullName.trim()),
      "Name updated.",
    );
  }

  function saveFarm(event: FormEvent) {
    event.preventDefault();
    void run(
      "farm",
      () =>
        settings.updateFarm(
          profile.organization.id,
          farmName.trim(),
          timezone,
        ),
      "Farm details updated.",
    );
  }

  async function deleteAccount() {
    setBusy("delete");
    try {
      await settings.deleteAccount(profile.id, profile.organization.id);
      // Signed out now; land on the home URL for the next sign-in.
      window.history.replaceState(null, "", "/");
    } catch (caught) {
      notify(`Couldn't delete your account: ${errorMessage(caught)}`, "error");
      setBusy(null);
    }
  }

  const nameChanged = fullName.trim() !== profile.fullName;
  const farmChanged =
    farmName.trim() !== profile.organization.name ||
    timezone !== profile.organization.timezone;

  return (
    <div className="settings-grid">
      <section className="settings-card" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Profile</h2>
        <div className="photo-row">
          <Avatar profile={profile} size={72} />
          <div>
            <div className="settings-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={busy === "photo"}
                onClick={() => fileInput.current?.click()}
              >
                {busy === "photo" ? "Uploading…" : "Upload photo"}
              </button>
              {profile.avatarPath && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy === "photo"}
                  onClick={() =>
                    void run(
                      "photo",
                      () =>
                        settings.removeAvatar(
                          profile.id,
                          profile.avatarPath as string,
                        ),
                      "Profile photo removed.",
                    )
                  }
                >
                  Remove photo
                </button>
              )}
            </div>
            <p className="settings-hint">
              JPG, PNG, or WebP. We crop it to a square.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={choosePhoto}
            />
          </div>
        </div>

        <form className="settings-form" onSubmit={saveName}>
          <label>
            Your name
            <input
              required
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <div className="settings-field">
            <span>Email</span>
            <p>{session.user.email || "Demo session, no email"}</p>
          </div>
          <div className="settings-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={!nameChanged || !fullName.trim() || busy === "name"}
            >
              {busy === "name" ? "Saving…" : "Save name"}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card" aria-labelledby="farm-heading">
        <h2 id="farm-heading">Farm</h2>
        <form className="settings-form" onSubmit={saveFarm}>
          <label>
            Farm name
            <input
              required
              maxLength={120}
              disabled={!isAdmin}
              value={farmName}
              onChange={(event) => setFarmName(event.target.value)}
            />
          </label>
          <label>
            Time zone
            <select
              disabled={!isAdmin}
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <p className="settings-hint">
            {profile.organization.isDemo
              ? "Demo farms treat April 22, 2026 as today so the sample data matches the design."
              : "Decides which day counts as “today” for your recordings."}
          </p>
          {isAdmin ? (
            <div className="settings-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={!farmChanged || !farmName.trim() || busy === "farm"}
              >
                {busy === "farm" ? "Saving…" : "Save farm"}
              </button>
            </div>
          ) : (
            <p className="settings-hint">Only farm admins can change these.</p>
          )}
        </form>
      </section>

      <section
        className="settings-card danger-card"
        aria-labelledby="delete-heading"
      >
        <h2 id="delete-heading">
          {isDemo ? "Delete demo" : "Delete account"}
        </h2>
        <p>
          {isDemo
            ? "Removes this demo farm and everything you changed in it. Starting the demo again creates a fresh copy."
            : "Permanently deletes your account and your farm, including its employees, fields, logs, tags, and recordings. This can't be undone."}
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className="danger-button"
            onClick={() => {
              setConfirmText("");
              setConfirmOpen(true);
            }}
          >
            {isDemo ? "Delete demo" : "Delete account"}
          </button>
        </div>
      </section>

      {confirmOpen && (
        <Modal
          title={isDemo ? "Delete demo" : "Delete account"}
          onClose={() => busy !== "delete" && setConfirmOpen(false)}
          className="confirm-modal"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (confirmText === CONFIRM_WORD) void deleteAccount();
            }}
          >
            <p className="modal-message">
              This deletes <strong>{profile.organization.name}</strong> and
              everything in it. Type <strong>{CONFIRM_WORD}</strong> to confirm.
            </p>
            <input
              autoFocus
              className="confirm-input"
              aria-label={`Type ${CONFIRM_WORD} to confirm`}
              autoComplete="off"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={busy === "delete"}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="danger-button"
                disabled={confirmText !== CONFIRM_WORD || busy === "delete"}
              >
                {busy === "delete" ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
