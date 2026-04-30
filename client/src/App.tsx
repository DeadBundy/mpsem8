import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthForm from "@/components/AuthForm";
import Home from "@/pages/home";
import History from "@/pages/history";
import SessionDetail from "@/pages/session-detail";
import Analytics from "@/pages/analytics";
import CopingStrategies from "@/pages/coping-strategies";
import Journal from "@/pages/journal";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <AuthForm onAuth={login} />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={History} />
      <Route path="/session/:id" component={SessionDetail} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/coping-strategies" component={CopingStrategies} />
      <Route path="/journal" component={Journal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
