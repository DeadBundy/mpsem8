import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAppLanguage } from "@/lib/language";

interface AuthFormProps {
  onAuth: (user: any, token: string) => void;
}

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { copy } = useAppLanguage();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      fullName: formData.get("fullName") as string,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        onAuth(result.user, result.token);
        setLocation("/");
      } else {
        setError(result.error || copy.registrationFailed);
      }
    } catch (error) {
      setError(copy.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        onAuth(result.user, result.token);
        setLocation("/");
      } else {
        setError(result.error || copy.loginFailed);
      }
    } catch (error) {
      setError(copy.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">MindWell AI</CardTitle>
          <CardDescription>
            {copy.authDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{copy.login}</TabsTrigger>
              <TabsTrigger value="register">{copy.register}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">{copy.username}</Label>
                  <Input
                    id="login-username"
                    name="username"
                    type="text"
                    required
                    placeholder={copy.enterUsername}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{copy.password}</Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    placeholder={copy.enterPassword}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {copy.login}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">{copy.username}</Label>
                  <Input
                    id="register-username"
                    name="username"
                    type="text"
                    required
                    placeholder={copy.chooseUsername}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">{copy.email}</Label>
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    placeholder={copy.enterEmail}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-fullName">{copy.fullName}</Label>
                  <Input
                    id="register-fullName"
                    name="fullName"
                    type="text"
                    placeholder={copy.enterFullNameOptional}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">{copy.password}</Label>
                  <Input
                    id="register-password"
                    name="password"
                    type="password"
                    required
                    placeholder={copy.choosePassword}
                    minLength={6}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {copy.register}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
