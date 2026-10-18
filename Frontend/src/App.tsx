import { useEffect, useState } from "react";
import type {
  UserSession,
  Alert,
  AlertStatus,
  StatsResponse,
} from "./types";

import { MOCK_USER } from "./data/mockData";

import { getAlerts, updateAlertStatus } from "./api/alertsApi";
import { getReportStats } from "./api/reportsApi";

import { Sidebar } from "./components/Sidebar";
import type { NavTab } from "./components/Sidebar";
import { Header } from "./components/Header";

import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AlertsPage } from "./pages/AlertsPage";
import { ReportingPage } from "./pages/ReportingPage";
import { RulesPage } from "./pages/RulesPage";

import { AlertDetailDrawer } from "./components/AlertDetailDrawer";
import { Menu, X } from "lucide-react";

export default function App() {
  // Authentication State: check for existing JWT token
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const token =
      localStorage.getItem("aml_token") ||
      sessionStorage.getItem("aml_token");

    if (!token) return null;

    return MOCK_USER;
  });

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Alerts & Stats State
  // Data will now be loaded from the real backend APIs.
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  // Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Investigation Drawer State
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Load real AML data from the backend
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setIsLoading(true);
      setDataError(null);

      try {
        const [alertsData, statsData] = await Promise.all([
          getAlerts(),
          getReportStats(),
        ]);

        setAlerts(alertsData);
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load AML data:", error);
        setDataError("Unable to load AML data. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Refresh data from the backend
  const handleRefresh = async () => {
    setIsLoading(true);
    setDataError(null);

    try {
      const [alertsData, statsData] = await Promise.all([
        getAlerts(),
        getReportStats(),
      ]);

      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to refresh AML data:", error);
      setDataError("Unable to refresh AML data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Status update handler for investigation workflow
  const handleUpdateStatus = async (alertId: number, newStatus: AlertStatus) => {
    const saved = await updateAlertStatus(alertId, newStatus);
    setAlerts((previous) => previous.map((alert) =>
      alert.id === alertId ? { ...alert, ...saved } : alert
    ));
    // Keep selectedAlert in sync if open, only after backend confirmation.
    setSelectedAlert((previous) => previous?.id === alertId
      ? { ...previous, ...saved } : previous);
  };

  // Kafka is asynchronous: keep reading the Reporting projection after decisions.
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refreshStats = async () => {
      try {
        const nextStats = await getReportStats();
        if (active) setStats(nextStats);
      } catch (error) {
        console.error("Failed to synchronize reporting:", error);
      } finally {
        if (active) timer = setTimeout(refreshStats, 3000);
      }
    };
    timer = setTimeout(refreshStats, 1000);
    return () => { active = false; clearTimeout(timer); };
  }, [currentUser]);

  // Add investigation note handler
  const handleAddNote = (alertId: number, noteText: string) => {
    const newNote = {
      id: `note-${Date.now()}`,
      author: currentUser?.name || "Compliance Analyst",
      text: noteText,
      createdAt: new Date().toISOString(),
    };

    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) => {
        if (alert.id === alertId) {
          const updatedNotes = [
            ...(alert.notes || []),
            newNote,
          ];

          return {
            ...alert,
            notes: updatedNotes,
          };
        }

        return alert;
      })
    );

    setSelectedAlert((prev) =>
      prev && prev.id === alertId
        ? {
          ...prev,
          notes: [...(prev.notes || []), newNote],
        }
        : prev
    );
  };

  // Calculate pending alerts count from the currently loaded alerts
  const pendingCount = alerts.filter(
    (alert) => alert.status === "PENDING"
  ).length;

  // View configuration titles
  const tabTitles: Record<
    NavTab,
    { title: string; subtitle: string }
  > = {
    dashboard: {
      title: "AML Monitoring Dashboard",
      subtitle:
        "Executive overview of flagged transactions and compliance risk indicators",
    },

    alerts: {
      title: "Alerts Management",
      subtitle:
        "Filter, triage and investigate flagged operations across accounts",
    },

    reporting: {
      title: "Compliance Reporting & Typologies",
      subtitle:
        "Risk score distributions, country concentrations and resolution metrics",
    },

    rules: {
      title: "AML Rules",
      subtitle:
        "Review active rules and test transaction risk scores",
    },
  };

  // If logged out, render the Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Sidebar Toggle Header */}
      <div className="md:hidden h-14 bg-[#090e1a] border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-40">
        <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
          SENTINEL
          <span className="text-blue-400 font-mono text-xs">
            AML
          </span>
        </span>

        <button
          onClick={() =>
            setIsMobileMenuOpen(!isMobileMenuOpen)
          }
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer Navigation Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`${isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
          } transition-transform duration-200 fixed md:static z-40 top-0 left-0 bottom-0`}
      >
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setIsMobileMenuOpen(false);
          }}
          user={currentUser}
          onLogout={() => {
            localStorage.removeItem("aml_token");
            sessionStorage.removeItem("aml_token");
            setCurrentUser(null);
          }}
          pendingAlertsCount={pendingCount}
        />
      </div>

      {/* Main Workspace View */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header
          title={tabTitles[currentTab].title}
          subtitle={tabTitles[currentTab].subtitle}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        <main className="flex-1 pb-12">
          {/* Dashboard */}
          {currentTab === "dashboard" && (
            <>
              {stats ? (
                <DashboardPage
                  stats={stats}
                  alerts={alerts}
                  onSelectAlert={(alert) =>
                    setSelectedAlert(alert)
                  }
                  onNavigateToAlerts={() =>
                    setCurrentTab("alerts")
                  }
                  isLoading={isLoading}
                />
              ) : (
                <div className="flex items-center justify-center min-h-[400px] text-slate-400">
                  Loading dashboard data...
                </div>
              )}
            </>
          )}

          {/* Alerts */}
          {currentTab === "alerts" && (
            <AlertsPage
              alerts={alerts}
              isLoading={isLoading}
              error={dataError}
              onSelectAlert={(alert) =>
                setSelectedAlert(alert)
              }
            />
          )}

          {/* Reporting */}
          {currentTab === "reporting" && (
            <>
              {stats ? (
                <ReportingPage
                  stats={stats}
                  isLoading={isLoading}
                />
              ) : (
                <div className="flex items-center justify-center min-h-[400px] text-slate-400">
                  Loading reporting data...
                </div>
              )}
            </>
          )}

          {/* AML Rules */}
          {currentTab === "rules" && <RulesPage />}
        </main>
      </div>

      {/* Alert Investigation Detail Drawer */}
      <AlertDetailDrawer
        key={selectedAlert?.id ?? "closed"}
        alert={selectedAlert}
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        onUpdateStatus={handleUpdateStatus}
        onAddNote={handleAddNote}
      />
    </div>
  );
}