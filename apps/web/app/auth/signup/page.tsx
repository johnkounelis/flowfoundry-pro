"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
    acceptTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<{ google: boolean; github: boolean }>({ google: false, github: false });

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => setProviders(data))
      .catch(() => setProviders({ google: false, github: false }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (!formData.acceptTerms) {
      setError("Please accept the terms and conditions");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          company: formData.company,
        }),
      });

      if (response.ok) {
        const result = await signIn("credentials", {
          email: formData.email.trim(),
          password: formData.password,
          redirect: false,
        });

        if (result?.ok || (!result?.error && result !== null)) {
          await new Promise((r) => setTimeout(r, 300));
          window.location.href = "/onboarding";
        } else {
          setError("Account created but sign in failed. Please try signing in manually.");
          setIsLoading(false);
        }
      } else {
        const data = await response.json();
        setError(data.message || "Signup failed. Please try again.");
        setIsLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/onboarding" });
    } catch {
      setError(`Failed to sign up with ${provider}.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-12 flex-col justify-between">
        <div>
          <Link href="/" className="text-white text-2xl font-bold tracking-tight">
            FlowFoundry Pro
          </Link>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Start automating<br />in minutes
          </h2>
          <p className="text-blue-100 text-lg max-w-md">
            No credit card required. Build your first workflow in under 5 minutes.
          </p>
        </div>
        <p className="text-blue-200 text-sm">&copy; 2026 John Kounelis. All rights reserved.</p>
      </div>

      {/* Right - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-indigo-600 text-2xl font-bold tracking-tight">
              FlowFoundry Pro
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-gray-500 mb-8">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* OAuth */}
          {(providers.google || providers.github) && (
            <>
              <div className="space-y-3 mb-6">
                {providers.google && (
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 015.49 12c0-.72.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.81-.62-.81.08z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign up with Google
                  </button>
                )}
              </div>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400">or</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="John Doe" />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
                <input id="company" name="company" type="text" value={formData.company} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Optional" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="you@company.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Min. 8 characters" />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Repeat your password" />
            </div>

            <div className="flex items-start gap-2">
              <input id="acceptTerms" name="acceptTerms" type="checkbox" required checked={formData.acceptTerms} onChange={handleChange}
                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                I agree to the{" "}
                <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">Terms</Link>{" "}and{" "}
                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</Link>
              </label>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
