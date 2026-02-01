import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import bscLogo from '@/assets/bsc-logo-icon.png';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      if (!username || !email || !password) return;
      await signUp(username, email, password, firstName, lastName);
    } else {
      if (!username || !password) return;
      await signIn(username, password);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary to-secondary p-12 flex-col justify-between overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/10 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center p-2">
            <img src={bscLogo} alt="BSC AI" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-bold text-white">BSC AI</span>
        </div>

        {/* Hero content */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-bold text-white leading-tight">
            Your AI-Powered
            <br />
            <span className="text-white/80">Knowledge Hub</span>
          </h1>
          <p className="text-xl text-white/70 max-w-md">
            Build intelligent chatbots, manage knowledge bases, and transform how your team accesses information.
          </p>

          {/* Feature list */}
          <div className="space-y-4 pt-4">
            {[
              'Smart conversations with context awareness',
              'Upload documents and ask questions',
              'Persistent chat history & memory',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white/80">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/50 text-sm">
          © 2026 BSC AI. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-1.5 sm:p-2">
              <img src={bscLogo} alt="BSC AI" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl sm:text-2xl font-bold">BSC AI</span>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              {isSignUp
                ? 'Sign up to start using BSC AI'
                : 'Enter your credentials to access your workspace'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Username/Email field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {isSignUp ? 'Username' : 'Username or Email'}
              </Label>
              <div className="relative">
                <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder={isSignUp ? 'johndoe' : 'johndoe or you@company.com'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 sm:pl-12 h-11 sm:h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            {/* Email field - only for signup */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 sm:pl-12 h-11 sm:h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors text-sm sm:text-base"
                    required
                  />
                </div>
              </div>
            )}

            {/* Name fields - only for signup */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 sm:h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 sm:h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors text-sm sm:text-base"
                  />
                </div>
              </div>
            )}

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-11 sm:h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors text-sm sm:text-base"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base font-medium",
                "bg-gradient-to-r from-primary via-primary to-secondary",
                "hover:opacity-90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                "transition-all duration-300"
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create account
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </div>
              )}
            </Button>
          </form>

          {/* Toggle signup/signin */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? (
                <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};