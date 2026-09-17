import { supabase } from "../../lib/supabase";

const AVATAR_SIZE = 256;

export function avatarUrl(path: string) {
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

/** Center-crops and scales an image to a small square before upload. */
async function toSquareImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "That file isn't an image this browser can read. Try a JPG, PNG, or WebP.",
    );
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Couldn't process the image.");
  }
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  // Browsers that can't encode WebP fall back to PNG, which is also allowed.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) throw new Error("Couldn't process the image.");
  return blob;
}

/** Uploads a new photo, points the profile at it, and removes the old one. */
export async function uploadAvatar(
  userId: string,
  file: File,
  previousPath: string | null,
) {
  const image = await toSquareImage(file);
  const extension = image.type === "image/webp" ? "webp" : "png";
  // A new name each time avoids stale copies in browser and CDN caches.
  const path = `${userId}/${Date.now()}.${extension}`;
  const upload = await supabase.storage
    .from("avatars")
    .upload(path, image, { contentType: image.type, cacheControl: "31536000" });
  if (upload.error) throw new Error(upload.error.message);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    throw new Error(error.message);
  }
  if (previousPath)
    await supabase.storage.from("avatars").remove([previousPath]);
}

export async function removeAvatar(userId: string, path: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  await supabase.storage.from("avatars").remove([path]);
}

export async function updateName(userId: string, fullName: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function updateFarm(
  organizationId: string,
  name: string,
  timezone: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .update({ name, timezone })
    .eq("id", organizationId)
    .select("id");
  if (error) throw new Error(error.message);
  // RLS filters instead of erroring, so an empty result means no permission.
  if (data.length === 0)
    throw new Error("Only farm admins can change these settings.");
}

export async function setEmployeeActive(id: string, active: boolean) {
  const { error } = await supabase
    .from("employees")
    .update({ is_active: active })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function removeFolder(bucket: string, folder: string) {
  // Delete one page at a time; using an offset would skip files as they vanish.
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 1000 });
    if (error) throw new Error(error.message);
    if (!data.length) return;
    const files = data.filter((file) => file.id);
    if (!files.length)
      throw new Error(
        "The storage folder contains subfolders that need to be removed first.",
      );
    const result = await supabase.storage
      .from(bucket)
      .remove(files.map((file) => `${folder}/${file.name}`));
    if (result.error) throw new Error(result.error.message);
  }
}

/**
 * Deletes the signed-in account and, if nobody else belongs to it, the farm.
 * Files go first: Storage objects must be removed through the Storage API.
 */
export async function deleteAccount(userId: string, organizationId: string) {
  // Other farm members must retain access to shared recordings.
  const { count, error: membersError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (membersError) throw new Error(membersError.message);
  if (!count) throw new Error("Couldn't verify farm membership. Please retry.");
  await removeFolder("avatars", userId);
  if (count === 1) await removeFolder("recordings", organizationId);
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(error.message);
  // The server session is gone; clear the local one too.
  await supabase.auth.signOut({ scope: "local" });
}
