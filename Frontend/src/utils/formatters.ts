export function formatCurrency(amount: number, currency: string = "MAD"): string {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency || "MAD",
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${amount.toLocaleString("en-US")} ${currency}`;
    }
}

export function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(date);
    } catch {
        return dateString;
    }
}

export function formatShortDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    } catch {
        return dateString;
    }
}

export interface RiskCategoryInfo {
    label: "Below Alert Threshold" | "Elevated Risk" | "High Risk";
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    barColor: string;
    dotColor: string;
    description: string;
}

export function getRiskCategory(score: number): RiskCategoryInfo {
    if (score >= 80) {
        return {
            label: "High Risk",
            badgeBg: "bg-red-500/15",
            badgeText: "text-red-400",
            badgeBorder: "border-red-500/30",
            barColor: "bg-red-500",
            dotColor: "bg-red-400",
            description: "Multiple severe indicators triggered. Immediate compliance review recommended.",
        };
    }
    if (score >= 50) {
        return {
            label: "Elevated Risk",
            badgeBg: "bg-amber-500/15",
            badgeText: "text-amber-400",
            badgeBorder: "border-amber-500/30",
            barColor: "bg-amber-500",
            dotColor: "bg-amber-400",
            description: "Triggered standard compliance threshold. Requires transaction analysis.",
        };
    }
    return {
        label: "Below Alert Threshold",
        badgeBg: "bg-slate-500/15",
        badgeText: "text-slate-400",
        badgeBorder: "border-slate-500/30",
        barColor: "bg-slate-500",
        dotColor: "bg-slate-400",
        description: "Transaction below minimum alert threshold (Score < 50).",
    };
}

export const COUNTRY_NAMES: Record<string, string> = {
    MA: "Morocco",
    FR: "France",
    ES: "Spain",
    AE: "United Arab Emirates",
    GB: "United Kingdom",
    KP: "North Korea (Simulated List)",
    IR: "Iran (Simulated List)",
    SY: "Syria (Simulated List)",
    DE: "Germany",
    US: "United States",
    CH: "Switzerland",
};

export function getCountryName(code: string): string {
    return COUNTRY_NAMES[code] || code;
}
