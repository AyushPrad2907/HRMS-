"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { Candidate, SessionUser } from "@/lib/types";

type AuthScreenProps = {
  onAuthenticated: (
    user: SessionUser,
    candidates: Candidate[],
  ) => void;
};

type SignInError = string | null;
type SignUpErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

const DEMO_PASSWORD = "implex123";

const DEMO_ACCOUNTS: Array<{
  label: string;
  email: string;
}> = [
  { label: "Priya — HR", email: "priya.sharma@implexedu.in" },
  { label: "Arun — Teacher", email: "arun.iyer@implexedu.in" },
  { label: "Kabir — Marketing", email: "kabir.menon@implexedu.in" },
];

const FEATURE_BULLETS: Array<string> = [
  "Role-based dashboards",
  "Attendance & leave",
  "Reports & analytics",
  "Audit & security",
];

export default function AuthScreen({
  onAuthenticated,
}: AuthScreenProps): React.JSX.Element {
  return (
    <div className="min-h-screen flex">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-sm gap-0 py-0">
          <CardContent className="px-0">
            <Tabs defaultValue="signin" className="gap-0">
              <div className="px-6 pt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="signin" className="flex-1">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex-1">
                    Create HR account
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="signin" className="mt-0">
                <SignInForm onAuthenticated={onAuthenticated} />
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <SignUpForm onAuthenticated={onAuthenticated} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Brand panel                                                                */
/* -------------------------------------------------------------------------- */

function BrandPanel(): React.JSX.Element {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between bg-gradient-to-br from-emerald-500 to-teal-700 p-12 text-white relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 35%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25) 0, transparent 40%)",
        }}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
          <span className="text-xl font-bold">I</span>
        </div>
        <div className="text-xl font-semibold tracking-tight">
          Implex Edu HRMS
        </div>
      </div>

      <div className="relative space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight">
            Human Resource Management
          </h1>
          <p className="text-white/80 text-base max-w-sm">
            Modern HR tooling for modern education teams — attendance, leave,
            analytics, and audit in one place.
          </p>
        </div>
        <ul className="space-y-3">
          {FEATURE_BULLETS.map((bullet) => (
            <li key={bullet} className="flex items-center gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-white/90">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative text-xs text-white/70">
        © 2025 Implex Edu
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sign in                                                                    */
/* -------------------------------------------------------------------------- */

function SignInForm({
  onAuthenticated,
}: {
  onAuthenticated: AuthScreenProps["onAuthenticated"];
}): React.JSX.Element {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<SignInError>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { user: SessionUser; candidates: Candidate[] }
        | { error: string };
      if (!res.ok || !("user" in data)) {
        const msg =
          ("error" in data && data.error) || "Invalid credentials";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Signed in");
      onAuthenticated(data.user, data.candidates);
    } catch {
      const msg = "Could not reach the server. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="px-6 pb-6 pt-5 space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your HRMS account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="signin-email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder="you@implexedu.in"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signin-password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9 pr-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground"
          disabled={loading || !email || !password}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Demo accounts
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((d) => (
              <Button
                key={d.email}
                type="button"
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2"
                onClick={() => fillDemo(d.email)}
                disabled={loading}
              >
                <User className="h-4 w-4 text-primary" />
                <span className="flex-1 truncate">
                  <span className="block text-sm font-medium leading-tight">
                    {d.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {d.email}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Password: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sign up                                                                    */
/* -------------------------------------------------------------------------- */

function SignUpForm({
  onAuthenticated,
}: {
  onAuthenticated: AuthScreenProps["onAuthenticated"];
}): React.JSX.Element {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [employeeCode, setEmployeeCode] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<SignUpErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  function validate(): SignUpErrors {
    const next: SignUpErrors = {};
    if (!name.trim()) next.name = "Full name is required.";
    if (!email.includes("@")) next.email = "Enter a valid email address.";
    if (password.length < 8)
      next.password = "Password must be at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords do not match.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFormError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          employeeCode: employeeCode.trim() || undefined,
          designation: designation.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { user: SessionUser; candidates: Candidate[] }
        | { error: string };
      if (!res.ok || !("user" in data)) {
        const msg =
          ("error" in data && data.error) || "Could not create account.";
        if (res.status === 409) {
          setFormError("Email already registered. Try signing in.");
          toast.error("Email already registered. Try signing in.");
        } else {
          setFormError(msg);
          toast.error(msg);
        }
        return;
      }
      toast.success("Account created");
      onAuthenticated(data.user, data.candidates);
    } catch {
      const msg = "Could not reach the server. Try again.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 pb-6 pt-5 space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Create HR account
        </h2>
        <p className="text-sm text-muted-foreground">
          Only HR accounts can self-register. Employees are created by HR.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="signup-name">Full name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="Priya Sharma"
              className="pl-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@implexedu.in"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="signup-code">Employee code</Label>
            <Input
              id="signup-code"
              type="text"
              placeholder="auto-generated if blank"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-designation">Designation</Label>
            <Input
              id="signup-designation"
              type="text"
              placeholder="HR Manager"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pl-9 pr-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter password"
              className="pl-9"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
          </div>
          {errors.confirm ? (
            <p className="text-xs text-destructive">{errors.confirm}</p>
          ) : null}
        </div>

        {formError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        By creating an account you become the HR administrator for your
        organization.
      </p>
    </div>
  );
}
