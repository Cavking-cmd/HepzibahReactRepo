import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import {
  apiRequest,
  unwrap,
  type PasskeyDto,
  type UpdateEmailRequest,
  type UpdatePasswordRequest,
  type UpdateProfileRequest,
  type UserDto,
} from "@/lib/api";
import {
  createPasskeyCredential,
  isWebAuthnSupported,
  type CredentialCreateOptionsDto,
} from "@/lib/webauthn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { ok, body } = await apiRequest<unknown>("GET", "/api/User/me");
      const raw = body as unknown as UserDto | null;
      if (!cancelled && ok && raw) {
        setProfile({ ...raw, userRoles: unwrap<string>(raw.userRoles) });
      }
      if (!cancelled) setLoadingProfile(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-lg">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        {loadingProfile ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="passkeys">Passkeys</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <ProfileTab profile={profile} onUpdated={setProfile} />
            </TabsContent>
            <TabsContent value="security" className="mt-4">
              <SecurityTab />
            </TabsContent>
            <TabsContent value="passkeys" className="mt-4">
              <PasskeysTab />
            </TabsContent>
            <TabsContent value="appearance" className="mt-4">
              <AppearanceTab />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function ProfileTab({
  profile,
  onUpdated,
}: {
  profile: UserDto | null;
  onUpdated: (u: UserDto) => void;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [preview, setPreview] = useState<string | null>(profile?.avatarBase64 ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    setPreview(profile?.avatarBase64 ?? null);
  }, [profile]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPreview(dataUrl);
    setPendingAvatar(dataUrl);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: UpdateProfileRequest = {
      displayName: displayName.trim() || null,
      avatarBase64: pendingAvatar,
    };
    const { ok, body } = await apiRequest<UserDto>("PUT", "/api/User/profile", payload);
    setSaving(false);
    if (ok && body?.data) {
      onUpdated({ ...body.data, userRoles: unwrap<string>(body.data.userRoles) });
      setPendingAvatar(null);
      toast.success("Profile updated.");
    } else {
      toast.error(body?.message ?? "Failed to update profile.");
    }
  }

  const initials = (profile?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your display name and avatar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16" size="lg">
              {preview && <AvatarImage src={preview} alt="Avatar preview" />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <Label htmlFor="avatar">Avatar</Label>
              <Input id="avatar" type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  function reauth(message: string) {
    logout();
    toast.success(message);
    navigate("/login");
  }

  async function handleChangeEmail(e: FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    const payload: UpdateEmailRequest = { newEmail, currentPassword: emailPassword };
    const { ok, body } = await apiRequest<UserDto>("PUT", "/api/User/email", payload);
    setEmailSaving(false);
    if (ok) {
      reauth("Email updated. Please sign in again.");
    } else {
      toast.error(body?.message ?? "Failed to update email.");
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setPasswordSaving(true);
    const payload: UpdatePasswordRequest = { currentPassword, newPassword };
    const { ok, body } = await apiRequest<boolean>("PUT", "/api/User/password", payload);
    setPasswordSaving(false);
    if (ok) {
      reauth("Password updated. Please sign in again.");
    } else {
      toast.error(body?.message ?? "Failed to update password.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Email</CardTitle>
          <CardDescription>You'll need to sign in again after changing your email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailPassword">Current Password</Label>
              <Input
                id="emailPassword"
                type="password"
                required
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={emailSaving}>
              {emailSaving ? "Saving…" : "Change Email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>You'll need to sign in again after changing your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Saving…" : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasskeysTab() {
  const supported = isWebAuthnSupported();
  const [passkeys, setPasskeys] = useState<PasskeyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<PasskeyDto | null>(null);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [pendingOptions, setPendingOptions] = useState<CredentialCreateOptionsDto | null>(null);
  const [nickname, setNickname] = useState("");

  async function loadPasskeys() {
    setLoading(true);
    const { ok, body } = await apiRequest<unknown>("GET", "/api/Passkey");
    if (ok && body) {
      setPasskeys(unwrap<PasskeyDto>(body as unknown));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function startAdd() {
    if (!supported) {
      toast.error("Passkeys are not supported in this browser.");
      return;
    }
    setAdding(true);
    const { ok, body } = await apiRequest<unknown>("POST", "/api/Passkey/register/options");
    if (!ok || !body) {
      setAdding(false);
      toast.error("Failed to start passkey registration.");
      return;
    }
    const raw = body as unknown as CredentialCreateOptionsDto;
    const normalized: CredentialCreateOptionsDto = {
      ...raw,
      pubKeyCredParams: unwrap(raw.pubKeyCredParams as unknown),
      excludeCredentials: raw.excludeCredentials ? unwrap(raw.excludeCredentials as unknown) : undefined,
    };
    setPendingOptions(normalized);
    setNickname("");
    setNicknameDialogOpen(true);
    setAdding(false);
  }

  async function completeAdd() {
    if (!pendingOptions) return;
    setNicknameDialogOpen(false);
    setAdding(true);
    try {
      const { attestationResponse } = await createPasskeyCredential(pendingOptions);
      const { ok, body } = await apiRequest<boolean>("POST", "/api/Passkey/register/complete", {
        attestationResponse,
        nickname: nickname.trim() || null,
      });
      if (ok) {
        toast.success("Passkey added.");
        await loadPasskeys();
      } else {
        toast.error(body?.message ?? "Failed to register passkey.");
      }
    } catch {
      toast.error("Passkey creation was cancelled or failed.");
    } finally {
      setAdding(false);
      setPendingOptions(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    const { ok, body } = await apiRequest<unknown>("DELETE", `/api/Passkey/${removeTarget.id}`);
    setRemoveTarget(null);
    if (ok) {
      toast.success("Passkey removed.");
      await loadPasskeys();
    } else {
      toast.error(body?.message ?? "Failed to remove passkey.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>Sign in without a password using a passkey.</CardDescription>
        </div>
        <Button onClick={startAdd} disabled={adding || !supported} size="sm">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add a passkey
        </Button>
      </CardHeader>
      <CardContent>
        {!supported && (
          <p className="text-sm text-muted-foreground mb-4">
            This browser does not support passkeys.
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No passkeys registered yet.</p>
        ) : (
          <ul className="space-y-2">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{pk.nickname || "Unnamed passkey"}</div>
                    <div className="text-xs text-muted-foreground">
                      Added {new Date(pk.createdDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(pk)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={nicknameDialogOpen} onOpenChange={setNicknameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name this passkey</DialogTitle>
            <DialogDescription>
              Optional - helps you tell your passkeys apart later.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. My laptop"
          />
          <DialogFooter>
            <Button onClick={completeAdd}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove passkey?"
        description={`Remove "${removeTarget?.nickname || "Unnamed passkey"}"? You won't be able to use it to sign in anymore.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
      />
    </Card>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how the portal looks on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <div className="text-sm font-medium">Dark mode</div>
            <div className="text-xs text-muted-foreground">
              {theme === "system" ? "Following system setting" : isDark ? "Dark" : "Light"}
            </div>
          </div>
          <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-xs"
          onClick={() => setTheme("system")}
        >
          Use system setting
        </Button>
      </CardContent>
    </Card>
  );
}
